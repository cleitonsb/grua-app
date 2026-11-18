import { API_BASE_URL, API_URL } from '@/services/config';
import type { ErroApiCorpo } from '@/types/api';

export const MENSAGEM_SEM_CONEXAO = 'É preciso conexão com a internet para continuar.';
const TEMPO_LIMITE_MS = 15000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly errors?: Record<string, string[]>,
    /** Corpo completo da resposta de erro, para campos além de `message` e `errors` (ex.: `faltantes`). */
    readonly corpo?: ErroApiCorpo,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Falha de rede: sem internet, API fora do ar ou tempo esgotado. */
  get semConexao(): boolean {
    return this.status === 0;
  }

  /** Primeira mensagem de erro de um campo, vinda da validação da API (422). */
  erroDoCampo(campo: string): string | undefined {
    return this.errors?.[campo]?.[0];
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Opcoes {
  method?: Metodo;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Quando verdadeiro, um 401 não aciona o tratador de sessão expirada (ex.: tela de login). */
  semTratarSessao?: boolean;
  /** Tempo máximo da chamada; uploads de foto precisam de mais que o padrão. */
  tempoLimiteMs?: number;
}

let token: string | null = null;
let aoPerderSessao: (() => void) | null = null;

export function definirToken(novoToken: string | null): void {
  token = novoToken;
}

/** Cabeçalhos para carregar recursos autenticados fora do `api()` (ex.: imagens com `expo-image`). */
export function cabecalhosAutenticados(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Endereço completo de um caminho da API que veio relativo (ex.: `arquivo_url` das fotos). */
export function urlDaApi(caminho: string): string {
  return caminho.startsWith('http') ? caminho : `${API_URL}${caminho}`;
}

/**
 * Repete uma chamada idempotente quando a rede falha (1 s, 2 s, 4 s...). Só falhas de conexão são repetidas: qualquer
 * resposta da API, inclusive de erro, é definitiva.
 */
export async function repetirEmFalhaDeRede<T>(chamada: () => Promise<T>, tentativas = 3): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await chamada();
    } catch (erro) {
      if (!(erro instanceof ApiError) || !erro.semConexao || tentativa >= tentativas - 1) {
        throw erro;
      }

      await new Promise((resolver) => setTimeout(resolver, 1000 * 2 ** tentativa));
    }
  }
}

/** Registra o que fazer quando a API responde 401 com um token em uso (sessão expirada ou revogada). */
export function aoPerderSessaoFazer(tratador: (() => void) | null): void {
  aoPerderSessao = tratador;
}

function montarUrl(caminho: string, query?: Opcoes['query']): string {
  const url = `${API_BASE_URL}${caminho}`;
  const parametros = Object.entries(query ?? {})
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);

  return parametros.length > 0 ? `${url}?${parametros.join('&')}` : url;
}

export async function api<T = void>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), opcoes.tempoLimiteMs ?? TEMPO_LIMITE_MS);
  const envioDeArquivos = typeof FormData !== 'undefined' && opcoes.body instanceof FormData;

  let resposta: Response;

  try {
    resposta = await fetch(montarUrl(caminho, opcoes.query), {
      method: opcoes.method ?? 'GET',
      signal: controle.signal,
      headers: {
        Accept: 'application/json',
        // Em multipart o próprio fetch define o Content-Type (com o boundary).
        ...(opcoes.body !== undefined && !envioDeArquivos ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opcoes.body === undefined ? undefined : envioDeArquivos ? (opcoes.body as FormData) : JSON.stringify(opcoes.body),
    });
  } catch {
    throw new ApiError(MENSAGEM_SEM_CONEXAO, 0);
  } finally {
    clearTimeout(temporizador);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  let corpo: (ErroApiCorpo & Record<string, unknown>) | null = null;

  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && token && !opcoes.semTratarSessao) {
      aoPerderSessao?.();
    }

    throw new ApiError(
      corpo?.message ?? 'Não foi possível concluir a operação. Tente novamente.',
      resposta.status,
      corpo?.code,
      corpo?.errors,
      corpo ?? undefined,
    );
  }

  return corpo as T;
}
