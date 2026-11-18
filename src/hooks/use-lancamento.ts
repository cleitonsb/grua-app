import { useCallback, useEffect, useState } from 'react';

import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { api, ApiError } from '@/services/api';
import type { FormaPagamento, Lancamento } from '@/types/api';

const mensagemDeErro = (excecao: unknown) =>
  excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar o lançamento.';

/**
 * Detalhe de um lançamento (`GET /lancamentos/{id}`) com o histórico e as ações permitidas. Recarrega ao voltar à tela
 * e ao puxar para atualizar, e as ações do administrador (pagar, reabrir, cancelar). Quem decide o que cada um pode
 * fazer é a API (`acoes`); aqui só se envia e se mostra a mensagem dela, inclusive os erros por campo (422).
 */

export interface DadosDoPagamento {
  /** AAAA-MM-DD */
  pagoEm: string;
  forma: FormaPagamento;
  /** Só quando o lançamento ainda está sem valor: define e paga de uma vez. */
  valorCentavos?: number;
}

export function useLancamento(id: string | number) {
  const [lancamento, setLancamento] = useState<Lancamento>();
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [executando, setExecutando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string>();
  const [errosDoCampo, setErrosDoCampo] = useState<Record<string, string>>({});

  // Carregamento inicial: o estado só muda quando a resposta chega.
  useEffect(() => {
    let ativo = true;

    api<Lancamento>(`/lancamentos/${id}`)
      .then((resposta) => {
        if (ativo) {
          setLancamento(resposta);
          setErro(undefined);
        }
      })
      .catch((excecao) => ativo && setErro(mensagemDeErro(excecao)))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [id]);

  const recarregar = useCallback(async () => {
    setAtualizando(true);

    try {
      setLancamento(await api<Lancamento>(`/lancamentos/${id}`));
      setErro(undefined);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    } finally {
      setAtualizando(false);
    }
  }, [id]);

  useRecarregarAoFocar(recarregar);

  /** Envia uma ação e atualiza o lançamento com a resposta da API; em erro, guarda a mensagem e os erros por campo. */
  const executar = useCallback(
    async (acao: string, corpo?: Record<string, unknown>): Promise<boolean> => {
      setExecutando(true);
      setErroAcao(undefined);
      setErrosDoCampo({});

      try {
        setLancamento(await api<Lancamento>(`/lancamentos/${id}/${acao}`, { method: 'POST', body: corpo }));

        return true;
      } catch (excecao) {
        if (excecao instanceof ApiError) {
          setErroAcao(excecao.message);
          setErrosDoCampo(Object.fromEntries(Object.entries(excecao.errors ?? {}).map(([campo, mensagens]) => [campo, mensagens[0]])));
        } else {
          setErroAcao('Não foi possível concluir a ação. Tente novamente.');
        }

        return false;
      } finally {
        setExecutando(false);
      }
    },
    [id],
  );

  const pagar = useCallback(
    (dados: DadosDoPagamento) =>
      executar('pagar', { pago_em: dados.pagoEm, forma_pagamento: dados.forma, ...(dados.valorCentavos !== undefined ? { valor_centavos: dados.valorCentavos } : {}) }),
    [executar],
  );

  const reabrir = useCallback(() => executar('reabrir'), [executar]);

  const cancelar = useCallback((motivo: string) => executar('cancelar', { motivo }), [executar]);

  return { lancamento, carregando, atualizando, erro, recarregar, executando, erroAcao, errosDoCampo, pagar, reabrir, cancelar };
}

/** Dados do formulário (valor em centavos inteiros; data `AAAA-MM-DD`). Na edição, só o que mudou. */
export interface DadosDoLancamento {
  clienteId?: number;
  veiculoId?: number | null;
  caminhaoId?: number | null;
  descricao?: string;
  valorCentavos?: number;
  data?: string;
}

const paraCorpo = (dados: DadosDoLancamento): Record<string, unknown> => ({
  ...(dados.clienteId !== undefined ? { cliente_id: dados.clienteId } : {}),
  ...(dados.veiculoId !== undefined ? { veiculo_id: dados.veiculoId } : {}),
  ...(dados.caminhaoId !== undefined ? { caminhao_id: dados.caminhaoId } : {}),
  ...(dados.descricao !== undefined ? { descricao: dados.descricao } : {}),
  ...(dados.valorCentavos !== undefined ? { valor_centavos: dados.valorCentavos } : {}),
  ...(dados.data !== undefined ? { data: dados.data } : {}),
});

/**
 * Criar um lançamento avulso (`POST /lancamentos`) ou editar um existente (`PATCH /lancamentos/{id}`). Devolve o
 * lançamento salvo (ou `null` em erro) e guarda a mensagem da API e os erros por campo (422/409).
 */
export function useSalvarLancamento() {
  const [salvando, setSalvando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string>();
  const [errosDoCampo, setErrosDoCampo] = useState<Record<string, string>>({});

  const enviar = useCallback(async (caminho: string, metodo: 'POST' | 'PATCH', dados: DadosDoLancamento): Promise<Lancamento | null> => {
    setSalvando(true);
    setErroAcao(undefined);
    setErrosDoCampo({});

    try {
      return await api<Lancamento>(caminho, { method: metodo, body: paraCorpo(dados) });
    } catch (excecao) {
      if (excecao instanceof ApiError) {
        setErroAcao(excecao.message);
        setErrosDoCampo(Object.fromEntries(Object.entries(excecao.errors ?? {}).map(([campo, mensagens]) => [campo, mensagens[0]])));
      } else {
        setErroAcao('Não foi possível salvar o lançamento. Tente novamente.');
      }

      return null;
    } finally {
      setSalvando(false);
    }
  }, []);

  const criar = useCallback((dados: DadosDoLancamento) => enviar('/lancamentos', 'POST', dados), [enviar]);

  const editar = useCallback((id: string | number, dados: DadosDoLancamento) => enviar(`/lancamentos/${id}`, 'PATCH', dados), [enviar]);

  return { salvando, erroAcao, errosDoCampo, criar, editar };
}
