import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { api, ApiError } from '@/services/api';
import type { ListaDeLancamentos, MesesDeLancamentos, ResumoDeLancamento, TotaisFinanceiro } from '@/types/api';
import { mesAtual } from '@/utils/periodo';

const ITENS_POR_PAGINA = 20;
const ATRASO_DA_BUSCA_MS = 400;

/** Sem situação escolhida, a lista mostra A receber e Pago (o cancelado só aparece quando pedido). */
export type SituacaoDoFiltro = 'a_receber' | 'pago' | 'cancelado' | 'todos';

const mensagemDeErro = (excecao: unknown, padrao = 'Não foi possível carregar os lançamentos.') =>
  excecao instanceof ApiError ? excecao.message : padrao;

interface Consulta {
  mes: string;
  situacao?: SituacaoDoFiltro;
  clienteId?: number;
  caminhaoId?: number;
  motoristaId?: number;
  busca: string;
}

/** Os filtros como a API os espera (`mes`, `situacao`, `cliente_id`...); só os que estão preenchidos. */
function parametrosDe(consulta: Consulta): Record<string, string | number> {
  return {
    mes: consulta.mes,
    ...(consulta.situacao ? { situacao: consulta.situacao } : {}),
    ...(consulta.clienteId ? { cliente_id: consulta.clienteId } : {}),
    ...(consulta.caminhaoId ? { caminhao_id: consulta.caminhaoId } : {}),
    ...(consulta.motoristaId ? { motorista_id: consulta.motoristaId } : {}),
    ...(consulta.busca.trim() !== '' ? { q: consulta.busca.trim() } : {}),
  };
}

/**
 * Lista do Financeiro (`GET /lancamentos`): mês, filtros (situação, cliente, caminhão, motorista e busca), lançamentos
 * paginados com "carregar mais" e os totais do conjunto filtrado inteiro (que a API calcula; o app nunca soma a lista).
 * Recarrega ao trocar de mês ou de filtro, ao puxar para atualizar e ao voltar à tela. As respostas de uma consulta que
 * já foi trocada são descartadas. Também exporta o CSV do que está filtrado (administrador).
 */
export function useFinanceiro() {
  const [mes, setMes] = useState(() => mesAtual());
  const [situacao, setSituacao] = useState<SituacaoDoFiltro>();
  const [clienteId, setClienteId] = useState<number>();
  const [caminhaoId, setCaminhaoId] = useState<number>();
  const [motoristaId, setMotoristaId] = useState<number>();
  const [busca, setBusca] = useState('');
  const [buscaEfetiva, setBuscaEfetiva] = useState('');
  const [itens, setItens] = useState<ResumoDeLancamento[]>([]);
  const [totais, setTotais] = useState<TotaisFinanceiro>();
  const [meses, setMeses] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [chaveCarregada, setChaveCarregada] = useState<string>();
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string>();
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState<string>();
  const carregandoMaisAgora = useRef(false);

  const consulta: Consulta = { mes, situacao, clienteId, caminhaoId, motoristaId, busca: buscaEfetiva };
  // O carregamento inicial é derivado: a lista da consulta atual da tela ainda não chegou.
  const chave = JSON.stringify(consulta);
  const carregandoInicial = chaveCarregada !== chave;

  // A busca só vale depois de uma pausa na digitação.
  useEffect(() => {
    const temporizador = setTimeout(() => setBuscaEfetiva(busca), ATRASO_DA_BUSCA_MS);

    return () => clearTimeout(temporizador);
  }, [busca]);

  const obterPagina = useCallback(
    (numeroPagina: number, parametros: Record<string, string | number>) =>
      api<ListaDeLancamentos>('/lancamentos', { query: { ...parametros, page: numeroPagina, per_page: ITENS_POR_PAGINA } }),
    [],
  );

  const aplicar = useCallback((resposta: ListaDeLancamentos, substituir: boolean) => {
    setItens((atuais) => (substituir ? resposta.data : [...atuais, ...resposta.data]));
    setTotais(resposta.totais);
    setPagina(resposta.meta.current_page);
    setUltimaPagina(resposta.meta.last_page);
    setErro(undefined);
  }, []);

  // Primeira página da consulta atual. O `ativo` descarta a resposta de uma consulta que já foi trocada.
  useEffect(() => {
    let ativo = true;
    const parametros = parametrosDe(JSON.parse(chave) as Consulta);

    obterPagina(1, parametros)
      .then((resposta) => {
        if (ativo) {
          aplicar(resposta, true);
          setChaveCarregada(chave);
        }
      })
      .catch((excecao) => {
        if (ativo) {
          setErro(mensagemDeErro(excecao));
          setChaveCarregada(chave);
        }
      });

    return () => {
      ativo = false;
    };
  }, [obterPagina, aplicar, chave]);

  // Meses com lançamento, para o seletor de período.
  useEffect(() => {
    let ativo = true;

    api<MesesDeLancamentos>('/lancamentos/meses')
      .then((resposta) => ativo && setMeses(resposta.meses))
      .catch(() => undefined);

    return () => {
      ativo = false;
    };
  }, []);

  /** Recarrega a primeira página mantendo a lista atual na tela enquanto isso (puxar para atualizar, voltar à tela). */
  const recarregar = useCallback(async () => {
    setAtualizando(true);

    try {
      aplicar(await obterPagina(1, parametrosDe(JSON.parse(chave) as Consulta)), true);
      setMeses((await api<MesesDeLancamentos>('/lancamentos/meses')).meses);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    } finally {
      setAtualizando(false);
    }
  }, [obterPagina, aplicar, chave]);

  const carregarMais = useCallback(async () => {
    if (carregandoInicial || carregandoMaisAgora.current || pagina >= ultimaPagina) {
      return;
    }

    carregandoMaisAgora.current = true;
    setCarregandoMais(true);

    try {
      aplicar(await obterPagina(pagina + 1, parametrosDe(JSON.parse(chave) as Consulta)), false);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    } finally {
      carregandoMaisAgora.current = false;
      setCarregandoMais(false);
    }
  }, [obterPagina, aplicar, carregandoInicial, chave, pagina, ultimaPagina]);

  /** Exporta em CSV o que está filtrado: a API devolve uma URL assinada de 5 minutos e o navegador do sistema a abre. */
  const exportarCsv = useCallback(async (): Promise<boolean> => {
    setExportando(true);
    setErroExportacao(undefined);

    try {
      const { url } = await api<{ url: string; expira_em: string }>('/lancamentos/exportacoes', {
        method: 'POST',
        body: parametrosDe(JSON.parse(chave) as Consulta),
      });

      await WebBrowser.openBrowserAsync(url);

      return true;
    } catch (excecao) {
      setErroExportacao(mensagemDeErro(excecao, 'Não foi possível exportar o CSV. Tente novamente.'));

      return false;
    } finally {
      setExportando(false);
    }
  }, [chave]);

  const limparFiltros = useCallback(() => {
    setSituacao(undefined);
    setClienteId(undefined);
    setCaminhaoId(undefined);
    setMotoristaId(undefined);
    setBusca('');
    setBuscaEfetiva('');
  }, []);

  useRecarregarAoFocar(recarregar);

  return {
    mes,
    setMes,
    meses,
    situacao,
    setSituacao,
    clienteId,
    setClienteId,
    caminhaoId,
    setCaminhaoId,
    motoristaId,
    setMotoristaId,
    busca,
    setBusca,
    temFiltro: situacao !== undefined || clienteId !== undefined || caminhaoId !== undefined || motoristaId !== undefined || busca !== '',
    limparFiltros,
    itens,
    totais,
    carregando: carregandoInicial,
    atualizando,
    carregandoMais,
    erro,
    temMais: pagina < ultimaPagina,
    recarregar,
    carregarMais,
    exportando,
    erroExportacao,
    exportarCsv,
  };
}
