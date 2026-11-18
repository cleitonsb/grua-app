import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { api, ApiError, MENSAGEM_SEM_CONEXAO, repetirEmFalhaDeRede } from '@/services/api';
import { enviarFoto, type AlvoDaFoto, type ArquivosDaFoto } from '@/services/fotos';
import type {
  Avaria,
  AvariaResposta,
  Checklist,
  ChecklistAtualizacao,
  EnvioResposta,
  FotoChecklist,
  FotoResposta,
  ItemChecklist,
  ItemResposta,
  RemocaoResposta,
  TipoAvaria,
} from '@/types/api';
import { comAvaria, comFotoNaAvaria, comFotoNoItem, comItem, semAvaria, semFoto } from '@/utils/checklist';
import { gerarUuid } from '@/utils/uuid';

export type EstadoSalvamento = 'salvo' | 'salvando' | 'pendente' | 'erro';

/** Campos que o autosave grava (sem a versão, que o hook controla). */
export type CamposDoChecklist = Omit<ChecklistAtualizacao, 'versao_base'>;

/** Dados de uma avaria (a `parte` é a chave do catálogo; a posição é normalizada de 0 a 1). */
export interface DadosDaAvaria {
  parte: string;
  tipo: TipoAvaria;
  pos_x: number;
  pos_y: number;
}

type Gravado = Checklist & { conflito: boolean };

const ESPERA_DO_AUTOSAVE_MS = 800;
const RECUOS_MS = [1000, 2000, 4000, 8000];
const MENSAGEM_CONFLITO = 'Este rascunho foi alterado em outro aparelho. Atualizamos a tela com a versão mais recente.';

// A versão mais recente de cada checklist é compartilhada entre as telas abertas ao mesmo tempo (editar e foto):
// sem isso, uma escrita de uma tela deixaria a outra com a versão velha e geraria avisos de conflito falsos.
const versoes = new Map<string, number>();
const lerVersao = (id: string): number => versoes.get(id) ?? 0;
const gravarVersao = (id: string, versao: number): void => {
  versoes.set(id, versao);
};

/** Reflete na tela, na hora, o que acabou de ser digitado ou escolhido (o servidor confirma depois). */
function aplicarLocal(checklist: Checklist, campos: CamposDoChecklist): Checklist {
  const proximo: Checklist = { ...checklist, pneus: { ...checklist.pneus } };

  if ('local_retirada' in campos) proximo.local_retirada = campos.local_retirada ?? null;
  if ('destino' in campos) proximo.destino = campos.destino ?? null;
  if ('cliente_acompanha' in campos) proximo.cliente_acompanha = campos.cliente_acompanha ?? null;
  if ('combustivel' in campos) proximo.combustivel = campos.combustivel ?? null;
  if ('observacoes_avarias' in campos) proximo.observacoes_avarias = campos.observacoes_avarias ?? null;
  if ('observacoes_gerais' in campos) proximo.observacoes_gerais = campos.observacoes_gerais ?? null;
  if ('passo_atual' in campos && campos.passo_atual !== undefined) proximo.passo_atual = campos.passo_atual;
  if ('pneu_dianteiro' in campos) proximo.pneus.dianteiro = campos.pneu_dianteiro ?? null;
  if ('pneu_traseiro' in campos) proximo.pneus.traseiro = campos.pneu_traseiro ?? null;
  if ('pneu_estepe' in campos) proximo.pneus.estepe = campos.pneu_estepe ?? null;
  if ('cliente_id' in campos && campos.cliente_id === null) proximo.cliente = null;
  if ('veiculo_id' in campos && campos.veiculo_id === null) proximo.veiculo = null;

  return proximo;
}

/**
 * Rascunho de checklist com autosave. `alterar` mostra a mudança na hora e agrupa o que mudou para um único
 * `PATCH` depois de 800 ms sem novas alterações. Se a rede falhar, repete com recuo (1, 2, 4, 8 s); se a API
 * recusar de vez (422, 409...), descarta a alteração e recarrega. Ao ir para segundo plano, trocar de tela ou
 * sair, grava o que estiver pendente.
 *
 * Todas as escritas (autosave, avarias e fotos) passam pela mesma fila, uma por vez, cada uma com a versão que
 * a anterior devolveu. A versão base evita sobrescrever em silêncio outro aparelho: se estava velha, a API aplica a
 * alteração mesmo assim e avisa (`conflito`), e a tela é atualizada.
 */
export function useChecklist(id: string) {
  const [checklist, setChecklist] = useState<Checklist>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();
  const [estadoSalvamento, setEstadoSalvamento] = useState<EstadoSalvamento>('salvo');
  const [mensagemDeErro, setMensagemDeErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  const pendentes = useRef<CamposDoChecklist>({});
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gravando = useRef<Promise<void> | undefined>(undefined);
  const tentativa = useRef(0);
  const naTela = useRef(true);

  const recarregar = useCallback(async () => {
    const resposta = await api<Checklist>(`/checklists/${id}`);

    gravarVersao(id, resposta.versao);
    setChecklist(resposta);
  }, [id]);

  useEffect(() => {
    let ativo = true;

    api<Checklist>(`/checklists/${id}`)
      .then((resposta) => {
        if (ativo) {
          gravarVersao(id, resposta.versao);
          setChecklist(resposta);
        }
      })
      .catch((excecao) => ativo && setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar o checklist.'))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [id]);

  const gravar = useCallback(async function gravarPendentes(): Promise<void> {
    // Uma escrita por vez: quem chegou durante outra espera ela terminar e segue com o que sobrou.
    while (gravando.current) {
      await gravando.current;
    }

    if (Object.keys(pendentes.current).length === 0) {
      return;
    }

    const carga = pendentes.current;
    pendentes.current = {};

    const tarefa = (async () => {
      if (naTela.current) setEstadoSalvamento('salvando');

      try {
        const resposta = await api<Gravado>(`/checklists/${id}`, {
          method: 'PATCH',
          body: { ...carga, versao_base: lerVersao(id) },
        });

        gravarVersao(id, resposta.versao);
        tentativa.current = 0;

        if (!naTela.current) return;

        setMensagemDeErro(undefined);

        if (resposta.conflito) {
          const { conflito: _conflito, ...atualizado } = resposta;
          setChecklist(atualizado);
          setAviso(MENSAGEM_CONFLITO);
        } else {
          setChecklist((atual) => (atual ? { ...atual, versao: resposta.versao } : atual));
        }

        setEstadoSalvamento(Object.keys(pendentes.current).length > 0 ? 'pendente' : 'salvo');
      } catch (excecao) {
        if (!naTela.current) {
          pendentes.current = { ...carga, ...pendentes.current };

          return;
        }

        const recusaDefinitiva = excecao instanceof ApiError && !excecao.semConexao && excecao.status < 500;

        if (recusaDefinitiva) {
          // A API não vai aceitar essa alteração (ex.: cliente inativo, checklist já enviado): repetir não adianta.
          setMensagemDeErro(excecao.message);
          setEstadoSalvamento('erro');
          recarregar().catch(() => undefined);

          return;
        }

        pendentes.current = { ...carga, ...pendentes.current };
        setEstadoSalvamento('erro');

        const espera = RECUOS_MS[Math.min(tentativa.current, RECUOS_MS.length - 1)];
        tentativa.current += 1;
        temporizador.current = setTimeout(() => void gravarPendentes(), espera);
      }
    })();

    const minha = tarefa.then(
      () => undefined,
      () => undefined,
    );

    gravando.current = minha;
    await tarefa;

    if (gravando.current === minha) {
      gravando.current = undefined;
    }
  }, [id, recarregar]);

  const alterar = useCallback(
    (campos: CamposDoChecklist, local?: Partial<Checklist>) => {
      setChecklist((atual) => (atual ? { ...aplicarLocal(atual, campos), ...local } : atual));

      pendentes.current = { ...pendentes.current, ...campos };
      setEstadoSalvamento('pendente');

      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void gravar(), ESPERA_DO_AUTOSAVE_MS);
    },
    [gravar],
  );

  /** Grava agora o que estiver pendente (ao trocar de passo, enviar ou sair). */
  const descarregar = useCallback(async () => {
    clearTimeout(temporizador.current);
    await gravar();
  }, [gravar]);

  /**
   * Executa uma escrita de avaria ou foto depois de gravar o autosave pendente e de qualquer escrita em andamento,
   * para cada uma partir da versão que a anterior devolveu.
   */
  const executarEscrita = useCallback(
    async <T>(escrita: () => Promise<T>): Promise<T> => {
      await descarregar();

      while (gravando.current) {
        await gravando.current;
      }

      const tarefa = escrita();
      const minha = tarefa.then(
        () => undefined,
        () => undefined,
      );

      gravando.current = minha;

      try {
        return await tarefa;
      } finally {
        if (gravando.current === minha) {
          gravando.current = undefined;
        }
      }
    },
    [descarregar],
  );

  /** Registra a versão devolvida por uma escrita e, se havia conflito, avisa e atualiza a tela. */
  const aplicarEscrita = useCallback(
    (versao: number, conflito: boolean) => {
      gravarVersao(id, versao);

      if (conflito && naTela.current) {
        setAviso(MENSAGEM_CONFLITO);
        recarregar().catch(() => undefined);
      }
    },
    [id, recarregar],
  );

  /**
   * Descarta o rascunho e as fotos dele. Entra na fila das escritas (depois do autosave pendente). Se a primeira
   * tentativa chegou mas a resposta se perdeu, a repetição recebe 404: o rascunho já foi apagado, o que basta.
   */
  const descartar = useCallback(
    (): Promise<void> =>
      executarEscrita(async () => {
        try {
          await repetirEmFalhaDeRede(() => api(`/checklists/${id}`, { method: 'DELETE' }));
        } catch (excecao) {
          if (!(excecao instanceof ApiError && excecao.status === 404)) throw excecao;
        }

        pendentes.current = {};
        versoes.delete(id);
      }),
    [id, executarEscrita],
  );

  /** Marca uma avaria. O `client_uuid` faz o reenvio por rede instável ser seguro. */
  const adicionarAvaria = useCallback(
    (dados: DadosDaAvaria): Promise<Avaria> => {
      const clientUuid = gerarUuid();

      return executarEscrita(async () => {
        const resposta = await repetirEmFalhaDeRede(() =>
          api<AvariaResposta>(`/checklists/${id}/avarias`, {
            method: 'POST',
            body: { client_uuid: clientUuid, ...dados, versao_base: lerVersao(id) },
          }),
        );

        aplicarEscrita(resposta.versao, resposta.conflito);
        setChecklist((atual) => (atual ? comAvaria({ ...atual, versao: resposta.versao }, resposta.avaria) : atual));

        return resposta.avaria;
      });
    },
    [id, executarEscrita, aplicarEscrita],
  );

  /** Troca o tipo, a parte ou a posição de uma avaria. */
  const alterarAvaria = useCallback(
    (avaria: Avaria, mudancas: Partial<DadosDaAvaria>): Promise<Avaria> => {
      const dados: DadosDaAvaria = {
        parte: avaria.parte,
        tipo: avaria.tipo,
        pos_x: avaria.pos_x,
        pos_y: avaria.pos_y,
        ...mudancas,
      };

      return executarEscrita(async () => {
        const resposta = await repetirEmFalhaDeRede(() =>
          api<AvariaResposta>(`/checklists/${id}/avarias/${avaria.id}`, {
            method: 'PUT',
            body: { ...dados, versao_base: lerVersao(id) },
          }),
        );

        aplicarEscrita(resposta.versao, resposta.conflito);
        setChecklist((atual) => (atual ? comAvaria({ ...atual, versao: resposta.versao }, resposta.avaria) : atual));

        return resposta.avaria;
      });
    },
    [id, executarEscrita, aplicarEscrita],
  );

  /** Remove a avaria e as fotos dela. */
  const removerAvaria = useCallback(
    (avariaId: number): Promise<void> =>
      executarEscrita(async () => {
        const resposta = await repetirEmFalhaDeRede(() =>
          api<RemocaoResposta>(`/checklists/${id}/avarias/${avariaId}?versao_base=${lerVersao(id)}`, { method: 'DELETE' }),
        );

        aplicarEscrita(resposta.versao, resposta.conflito);
        setChecklist((atual) => (atual ? semAvaria({ ...atual, versao: resposta.versao }, avariaId) : atual));
      }),
    [id, executarEscrita, aplicarEscrita],
  );

  /**
   * Marca ou desmarca um item do catálogo, com a observação. Desmarcar apaga no servidor a observação e as fotos
   * do item; a tela é atualizada com o que a API devolveu.
   */
  const salvarItem = useCallback(
    (item: string, presente: boolean, observacao: string | null): Promise<ItemChecklist> =>
      executarEscrita(async () => {
        const resposta = await repetirEmFalhaDeRede(() =>
          api<ItemResposta>(`/checklists/${id}/itens/${item}`, {
            method: 'PUT',
            body: { presente, observacao, versao_base: lerVersao(id) },
          }),
        );

        aplicarEscrita(resposta.versao, resposta.conflito);
        setChecklist((atual) => (atual ? comItem({ ...atual, versao: resposta.versao }, resposta.item) : atual));

        return resposta.item;
      }),
    [id, executarEscrita, aplicarEscrita],
  );

  /** Envia uma foto já reduzida de uma avaria ou de um item. Repete a chamada em falha de rede, sempre com o mesmo `clientUuid`. */
  const adicionarFoto = useCallback(
    (alvo: AlvoDaFoto, arquivos: ArquivosDaFoto, clientUuid: string): Promise<FotoChecklist> =>
      executarEscrita(async () => {
        const resposta: FotoResposta = await repetirEmFalhaDeRede(() =>
          enviarFoto(id, alvo, arquivos, clientUuid, lerVersao(id)),
        );

        aplicarEscrita(resposta.versao, resposta.conflito);

        setChecklist((atual) => {
          if (!atual) return atual;

          const comVersao = { ...atual, versao: resposta.versao };

          return 'avariaId' in alvo
            ? comFotoNaAvaria(comVersao, alvo.avariaId, resposta.foto)
            : comFotoNoItem(comVersao, alvo.item, resposta.foto);
        });

        return resposta.foto;
      }),
    [id, executarEscrita, aplicarEscrita],
  );

  /** Remove uma foto do rascunho. */
  const removerFoto = useCallback(
    (fotoId: number): Promise<void> =>
      executarEscrita(async () => {
        const resposta = await repetirEmFalhaDeRede(() =>
          api<RemocaoResposta>(`/fotos/${fotoId}?versao_base=${lerVersao(id)}`, { method: 'DELETE' }),
        );

        aplicarEscrita(resposta.versao, resposta.conflito);
        setChecklist((atual) => (atual ? semFoto({ ...atual, versao: resposta.versao }, fotoId) : atual));
      }),
    [id, executarEscrita, aplicarEscrita],
  );

  useEffect(() => {
    naTela.current = true;

    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') {
        void descarregar();
      }
    });

    return () => {
      naTela.current = false;
      assinatura.remove();
      void descarregar();
    };
  }, [descarregar]);

  // Ao deixar a tela (para a foto, por exemplo) grava o que estiver pendente; ao voltar, recarrega para mostrar o que
  // a outra tela alterou (fotos novas, por exemplo).
  useFocusEffect(
    useCallback(() => {
      return () => {
        void descarregar();
      };
    }, [descarregar]),
  );

  const recarregarAoVoltar = useCallback(async () => {
    await descarregar();
    await recarregar().catch(() => undefined);
  }, [descarregar, recarregar]);

  useRecarregarAoFocar(recarregarAoVoltar);

  /** Grava o que falta e envia para assinatura. Lança `ApiError` (422 traz `corpo.faltantes`). */
  const enviar = useCallback(async (): Promise<EnvioResposta> => {
    await descarregar();

    if (Object.keys(pendentes.current).length > 0) {
      throw new ApiError(`Há alterações ainda não salvas. ${MENSAGEM_SEM_CONEXAO}`, 0);
    }

    const resposta = await api<EnvioResposta>(`/checklists/${id}/enviar`, { method: 'POST' });

    gravarVersao(id, resposta.checklist.versao);
    setChecklist(resposta.checklist);

    return resposta;
  }, [id, descarregar]);

  return {
    checklist,
    carregando,
    erro,
    estadoSalvamento,
    mensagemDeErro,
    aviso,
    limparAviso: () => setAviso(undefined),
    alterar,
    descarregar,
    recarregar,
    enviar,
    descartar,
    adicionarAvaria,
    alterarAvaria,
    removerAvaria,
    salvarItem,
    adicionarFoto,
    removerFoto,
  };
}
