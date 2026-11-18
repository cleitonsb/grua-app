import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from '@/services/api';
import type { Pagina } from '@/types/api';

export type FiltroSituacao = 'todos' | 'ativos' | 'inativos';

const ITENS_POR_PAGINA = 20;
const ATRASO_DA_BUSCA_MS = 300;

/** Lista paginada de um cadastro (`/clientes`, `/veiculos`...), com busca, filtro de situação e "carregar mais". */
export function useCadastro<T extends { id: number }>(recurso: string, opcoes: { filtroInicial?: FiltroSituacao } = {}) {
  const [itens, setItens] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaEfetiva, setBuscaEfetiva] = useState('');
  const [filtro, setFiltro] = useState<FiltroSituacao>(opcoes.filtroInicial ?? 'todos');
  const [chaveCarregada, setChaveCarregada] = useState<string>();
  const [recarregando, setRecarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string>();
  const carregandoMaisAgora = useRef(false);

  // O carregamento inicial é derivado: a lista da busca/filtro atual ainda não chegou.
  const chave = `${buscaEfetiva}|${filtro}`;
  const carregandoInicial = chaveCarregada !== chave;

  const obterPagina = useCallback(
    (numeroPagina: number, termo: string, situacao: FiltroSituacao) =>
      api<Pagina<T>>(`/${recurso}`, {
        query: {
          q: termo.trim(),
          ativo: situacao === 'todos' ? undefined : situacao === 'ativos' ? 1 : 0,
          page: numeroPagina,
          per_page: ITENS_POR_PAGINA,
        },
      }),
    [recurso],
  );

  const mensagemDeErro = (excecao: unknown) =>
    excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar a lista.';

  useEffect(() => {
    const temporizador = setTimeout(() => setBuscaEfetiva(busca), ATRASO_DA_BUSCA_MS);

    return () => clearTimeout(temporizador);
  }, [busca]);

  // Primeira página da busca/filtro atual. O `ativo` descarta respostas de buscas que já foram trocadas.
  useEffect(() => {
    let ativo = true;

    obterPagina(1, buscaEfetiva, filtro)
      .then((resposta) => {
        if (!ativo) {
          return;
        }

        setItens(resposta.data);
        setPagina(resposta.meta.current_page);
        setUltimaPagina(resposta.meta.last_page);
        setTotal(resposta.meta.total);
        setErro(undefined);
        setChaveCarregada(`${buscaEfetiva}|${filtro}`);
      })
      .catch((excecao) => {
        if (ativo) {
          setErro(mensagemDeErro(excecao));
          setChaveCarregada(`${buscaEfetiva}|${filtro}`);
        }
      });

    return () => {
      ativo = false;
    };
  }, [obterPagina, buscaEfetiva, filtro]);

  /** Recarrega a primeira página mantendo a lista atual na tela enquanto isso (puxar para atualizar, voltar à tela). */
  const recarregar = useCallback(async () => {
    setRecarregando(true);

    try {
      const resposta = await obterPagina(1, buscaEfetiva, filtro);

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
  }, [obterPagina, buscaEfetiva, filtro]);

  const carregarMais = useCallback(async () => {
    if (carregandoInicial || carregandoMaisAgora.current || pagina >= ultimaPagina) {
      return;
    }

    carregandoMaisAgora.current = true;
    setCarregandoMais(true);

    try {
      const resposta = await obterPagina(pagina + 1, buscaEfetiva, filtro);

      setItens((atuais) => [...atuais, ...resposta.data]);
      setPagina(resposta.meta.current_page);
      setUltimaPagina(resposta.meta.last_page);
      setTotal(resposta.meta.total);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    } finally {
      carregandoMaisAgora.current = false;
      setCarregandoMais(false);
    }
  }, [obterPagina, buscaEfetiva, carregandoInicial, filtro, pagina, ultimaPagina]);

  return {
    itens,
    total,
    busca,
    setBusca,
    filtro,
    setFiltro,
    carregando: carregandoInicial || recarregando,
    carregandoMais,
    erro,
    temMais: pagina < ultimaPagina,
    recarregar,
    carregarMais,
  };
}

/**
 * Recarrega a lista quando a tela volta ao foco (ex.: depois de salvar um formulário).
 * A primeira exibição é ignorada, pois o próprio hook da lista já carrega os dados.
 */
export function useRecarregarAoFocar(recarregar: () => Promise<void>): void {
  const recarregarAtual = useRef(recarregar);
  const primeiraExibicao = useRef(true);

  useEffect(() => {
    recarregarAtual.current = recarregar;
  });

  useFocusEffect(
    useCallback(() => {
      if (primeiraExibicao.current) {
        primeiraExibicao.current = false;

        return;
      }

      void recarregarAtual.current();
    }, []),
  );
}

/** Lê um registro de um cadastro. */
export function lerCadastro<T>(recurso: string, id: number | string): Promise<T> {
  return api<T>(`/${recurso}/${id}`);
}

/** Cria (sem `id`) ou atualiza (com `id`) um registro. Lança `ApiError` com os erros por campo (422). */
export function salvarCadastro<T>(recurso: string, dados: object, id?: number | string): Promise<T> {
  return api<T>(id === undefined ? `/${recurso}` : `/${recurso}/${id}`, {
    method: id === undefined ? 'POST' : 'PUT',
    body: dados,
  });
}

/** Mensagem geral para falhas ao salvar que não são de validação de campo (422). */
export function mensagemDeFalhaAoSalvar(erro: unknown): string {
  if (erro instanceof ApiError) {
    return erro.semConexao ? 'É preciso conexão com a internet para salvar. Seus dados continuam na tela.' : erro.message;
  }

  return 'Não foi possível salvar. Tente novamente.';
}
