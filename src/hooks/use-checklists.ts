import { useCallback, useEffect, useRef, useState } from 'react';

import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { api, ApiError } from '@/services/api';
import type { ChecklistResumo, Pagina, StatusChecklist, TipoChecklist } from '@/types/api';
import { periodoParaDatas, type PeriodoDaLista } from '@/utils/checklist';

export interface FiltrosDaLista {
  status: StatusChecklist | 'todos';
  tipo: TipoChecklist | 'todos';
  periodo: PeriodoDaLista;
}

const ITENS_POR_PAGINA = 20;
const ATRASO_DA_BUSCA_MS = 300;

const mensagemDeErro = (excecao: unknown) =>
  excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar os checklists.';

/**
 * Lista paginada de `GET /checklists` com filtros de status, tipo e período, busca por placa ou cliente (sem
 * acento, feita pela API), "carregar mais" e recarga ao voltar à tela.
 */
export function useChecklists() {
  const [itens, setItens] = useState<ChecklistResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaEfetiva, setBuscaEfetiva] = useState('');
  const [filtros, setFiltros] = useState<FiltrosDaLista>({ status: 'todos', tipo: 'todos', periodo: 'todos' });
  const [chaveCarregada, setChaveCarregada] = useState<string>();
  const [recarregando, setRecarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string>();
  const carregandoMaisAgora = useRef(false);

  const chave = `${buscaEfetiva}|${filtros.status}|${filtros.tipo}|${filtros.periodo}`;
  const carregandoInicial = chaveCarregada !== chave;

  const obterPagina = useCallback(
    (numeroPagina: number, termo: string, atuais: FiltrosDaLista) =>
      api<Pagina<ChecklistResumo>>('/checklists', {
        query: {
          q: termo.trim(),
          status: atuais.status === 'todos' ? undefined : atuais.status,
          tipo: atuais.tipo === 'todos' ? undefined : atuais.tipo,
          ...periodoParaDatas(atuais.periodo),
          page: numeroPagina,
          per_page: ITENS_POR_PAGINA,
        },
      }),
    [],
  );

  useEffect(() => {
    const temporizador = setTimeout(() => setBuscaEfetiva(busca), ATRASO_DA_BUSCA_MS);

    return () => clearTimeout(temporizador);
  }, [busca]);

  // Primeira página da busca/filtros atuais. O `ativo` descarta respostas de consultas que já foram trocadas.
  useEffect(() => {
    let ativo = true;
    const chaveDaConsulta = `${buscaEfetiva}|${filtros.status}|${filtros.tipo}|${filtros.periodo}`;

    obterPagina(1, buscaEfetiva, filtros)
      .then((resposta) => {
        if (!ativo) return;

        setItens(resposta.data);
        setPagina(resposta.meta.current_page);
        setUltimaPagina(resposta.meta.last_page);
        setTotal(resposta.meta.total);
        setErro(undefined);
        setChaveCarregada(chaveDaConsulta);
      })
      .catch((excecao) => {
        if (ativo) {
          setErro(mensagemDeErro(excecao));
          setChaveCarregada(chaveDaConsulta);
        }
      });

    return () => {
      ativo = false;
    };
  }, [obterPagina, buscaEfetiva, filtros]);

  /** Recarrega a primeira página mantendo a lista na tela enquanto isso (puxar para atualizar, voltar à tela). */
  const recarregar = useCallback(async () => {
    setRecarregando(true);

    try {
      const resposta = await obterPagina(1, buscaEfetiva, filtros);

      setItens(resposta.data);
      setPagina(resposta.meta.current_page);
      setUltimaPagina(resposta.meta.last_page);
      setTotal(resposta.meta.total);
      setErro(undefined);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    } finally {
      setRecarregando(false);
    }
  }, [obterPagina, buscaEfetiva, filtros]);

  const carregarMais = useCallback(async () => {
    if (carregandoInicial || carregandoMaisAgora.current || pagina >= ultimaPagina) return;

    carregandoMaisAgora.current = true;
    setCarregandoMais(true);

    try {
      const resposta = await obterPagina(pagina + 1, buscaEfetiva, filtros);

      setItens((atuais) => [...atuais, ...resposta.data.filter((novo) => !atuais.some((atual) => atual.id === novo.id))]);
      setPagina(resposta.meta.current_page);
      setUltimaPagina(resposta.meta.last_page);
      setTotal(resposta.meta.total);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    } finally {
      carregandoMaisAgora.current = false;
      setCarregandoMais(false);
    }
  }, [obterPagina, buscaEfetiva, carregandoInicial, filtros, pagina, ultimaPagina]);

  const alterarFiltro = useCallback(<K extends keyof FiltrosDaLista>(campo: K, valor: FiltrosDaLista[K]) => {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
  }, []);

  useRecarregarAoFocar(recarregar);

  return {
    itens,
    total,
    busca,
    setBusca,
    filtros,
    alterarFiltro,
    carregando: carregandoInicial || recarregando,
    carregandoMais,
    erro,
    temMais: pagina < ultimaPagina,
    recarregar,
    carregarMais,
  };
}
