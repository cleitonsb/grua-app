import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { aoPerderSessaoFazer, api, ApiError, definirToken } from '@/services/api';
import {
  apagarToken,
  gravarToken,
  gravarUltimoUsuario,
  lerToken,
  lerUltimoUsuario,
} from '@/services/session-storage';
import type { RespostaLogin, Usuario } from '@/types/api';

interface SessaoContexto {
  usuario: Usuario | null;
  /** Verdadeiro enquanto a sessão memorizada é restaurada ao abrir o app. */
  carregando: boolean;
  ultimoUsuario: string | null;
  /** Entra com usuário e senha. Lança `ApiError` em caso de credenciais inválidas, excesso de tentativas ou falta de conexão. */
  entrar: (usuario: string, senha: string) => Promise<Usuario>;
  /** Encerra a sessão na API (sem depender dela) e descarta a sessão memorizada, mantendo o último usuário. */
  sair: () => Promise<void>;
  /** Troca a própria senha e atualiza o usuário (limpa a obrigação de trocar senha provisória). */
  trocarSenha: (senhaAtual: string, novaSenha: string, confirmacao: string) => Promise<void>;
}

const Contexto = createContext<SessaoContexto | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ultimoUsuario, setUltimoUsuario] = useState<string | null>(null);

  const encerrarSessaoLocal = useCallback(async () => {
    definirToken(null);
    setUsuario(null);
    await apagarToken();
  }, []);

  const entrar = useCallback(async (nomeUsuario: string, senha: string) => {
    const resposta = await api<RespostaLogin>('/auth/login', {
      method: 'POST',
      body: { usuario: nomeUsuario.trim(), senha, device_name: Device.modelName ?? Platform.OS },
      semTratarSessao: true,
    });

    definirToken(resposta.token);
    setUsuario(resposta.user);
    setUltimoUsuario(resposta.user.usuario);
    await Promise.all([gravarToken(resposta.token), gravarUltimoUsuario(resposta.user.usuario)]);

    return resposta.user;
  }, []);

  const sair = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', semTratarSessao: true });
    } catch {
      // Mesmo sem conexão a sessão local é descartada; o token expira ou é revogado pela API depois.
    }

    await encerrarSessaoLocal();
  }, [encerrarSessaoLocal]);

  const trocarSenha = useCallback(async (senhaAtual: string, novaSenha: string, confirmacao: string) => {
    await api('/me/senha', {
      method: 'PUT',
      body: { senha_atual: senhaAtual, nova_senha: novaSenha, nova_senha_confirmation: confirmacao },
    });

    setUsuario(await api<Usuario>('/me'));
  }, []);

  useEffect(() => {
    aoPerderSessaoFazer(() => {
      void encerrarSessaoLocal();
    });

    return () => aoPerderSessaoFazer(null);
  }, [encerrarSessaoLocal]);

  useEffect(() => {
    let ativo = true;

    async function restaurar() {
      const [tokenSalvo, usuarioSalvo] = await Promise.all([lerToken(), lerUltimoUsuario()]);

      if (ativo) {
        setUltimoUsuario(usuarioSalvo);
      }

      if (tokenSalvo) {
        definirToken(tokenSalvo);

        try {
          const atual = await api<Usuario>('/me');

          if (ativo) {
            setUsuario(atual);
          }
        } catch (erro) {
          // Sessão recusada pela API: descarta. Falha de rede: mantém o token para tentar de novo depois.
          if (!(erro instanceof ApiError) || !erro.semConexao) {
            await encerrarSessaoLocal();
          }
        }
      }

      if (ativo) {
        setCarregando(false);
      }
    }

    void restaurar();

    return () => {
      ativo = false;
    };
  }, [encerrarSessaoLocal]);

  const valor = useMemo<SessaoContexto>(
    () => ({
      usuario,
      carregando,
      ultimoUsuario,
      entrar,
      sair,
      trocarSenha,
    }),
    [usuario, carregando, ultimoUsuario, entrar, sair, trocarSenha],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSession(): SessaoContexto {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error('useSession deve ser usado dentro de SessionProvider.');
  }

  return contexto;
}
