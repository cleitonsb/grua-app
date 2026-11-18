import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { api, ApiError } from '@/services/api';
import type { EstadoDaAssinatura, UrlDoPdf } from '@/types/api';

const mensagemDeErro = (excecao: unknown, padrao: string) => (excecao instanceof ApiError ? excecao.message : padrao);

/**
 * Estado do link de assinatura de um checklist (`GET /checklists/{id}/assinatura`) e as ações do motorista.
 * Só consulta a API quando `ativo` (checklist já enviado). Recarrega ao voltar à tela; não há notificação em segundo
 * plano. Uma resposta que chega depois de uma ação mais nova é descartada, para não desfazer o resultado da ação.
 */
export function useAssinatura(checklistId: number | string, ativo: boolean) {
  const [estado, setEstado] = useState<EstadoDaAssinatura>();
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string>();
  const [abrindoPdf, setAbrindoPdf] = useState(false);
  const [reenviandoCopia, setReenviandoCopia] = useState(false);
  const ordem = useRef(0);

  const recarregar = useCallback(async () => {
    const minha = ++ordem.current;

    try {
      const resposta = await api<EstadoDaAssinatura>(`/checklists/${checklistId}/assinatura`);

      if (minha === ordem.current) {
        setEstado(resposta);
        setErro(undefined);
      }
    } catch (excecao) {
      if (minha === ordem.current) {
        setErro(mensagemDeErro(excecao, 'Não foi possível carregar a situação da assinatura.'));
      }
    }
  }, [checklistId]);

  // Carregamento inicial (e quando o checklist passa a enviado): o estado só muda quando a resposta chega.
  useEffect(() => {
    if (!ativo) {
      return;
    }

    let vivo = true;
    const minha = ++ordem.current;

    api<EstadoDaAssinatura>(`/checklists/${checklistId}/assinatura`)
      .then((resposta) => {
        if (vivo && minha === ordem.current) {
          setEstado(resposta);
          setErro(undefined);
        }
      })
      .catch((excecao) => {
        if (vivo && minha === ordem.current) {
          setErro(mensagemDeErro(excecao, 'Não foi possível carregar a situação da assinatura.'));
        }
      });

    return () => {
      vivo = false;
    };
  }, [ativo, checklistId]);

  useRecarregarAoFocar(async () => {
    if (ativo) {
      await recarregar();
    }
  });

  /** Envia (ou reenvia) o link ao e-mail atual do cliente. Devolve se o e-mail foi enviado. */
  const enviarLink = useCallback(async (): Promise<boolean> => {
    setEnviando(true);
    setErroAcao(undefined);
    ordem.current++;

    try {
      const novo = await api<EstadoDaAssinatura>(`/checklists/${checklistId}/assinatura/link`, { method: 'POST' });

      ordem.current++;
      setEstado(novo);

      return true;
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, 'Não foi possível enviar o link. Tente novamente.'));
      await recarregar();

      return false;
    } finally {
      setEnviando(false);
    }
  }, [checklistId, recarregar]);

  /** Reenvia a cópia em PDF por e-mail (assíncrono: o estado volta com a cópia pendente). */
  const reenviarCopia = useCallback(async (): Promise<boolean> => {
    setReenviandoCopia(true);
    setErroAcao(undefined);
    ordem.current++;

    try {
      const novo = await api<EstadoDaAssinatura>(`/checklists/${checklistId}/assinatura/copia`, { method: 'POST' });

      ordem.current++;
      setEstado(novo);

      return true;
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, 'Não foi possível reenviar a cópia. Tente novamente.'));
      await recarregar();

      return false;
    } finally {
      setReenviandoCopia(false);
    }
  }, [checklistId, recarregar]);

  /** Pede a URL assinada (5 minutos) e abre o PDF no navegador do sistema, que não envia o cabeçalho Authorization. */
  const baixarPdf = useCallback(async (): Promise<boolean> => {
    setAbrindoPdf(true);
    setErroAcao(undefined);

    try {
      const { url } = await api<UrlDoPdf>(`/checklists/${checklistId}/pdf`);

      await WebBrowser.openBrowserAsync(url);

      return true;
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, 'Não foi possível abrir o PDF. Tente novamente.'));

      return false;
    } finally {
      setAbrindoPdf(false);
    }
  }, [checklistId]);

  return {
    estado,
    erro,
    enviando,
    erroAcao,
    abrindoPdf,
    reenviandoCopia,
    enviarLink,
    reenviarCopia,
    baixarPdf,
    recarregar,
    carregando: ativo && estado === undefined && erro === undefined,
  };
}

export type UsoDaAssinatura = ReturnType<typeof useAssinatura>;
