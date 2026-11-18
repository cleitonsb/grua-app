import { useCallback, useEffect, useState } from 'react';

import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { api, ApiError } from '@/services/api';
import type { InicioResposta } from '@/types/api';

const mensagemDeErro = (excecao: unknown) =>
  excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar o início.';

/** Dados da tela Início (`GET /inicio`), com carregamento inicial, atualização ao puxar e ao voltar à tela. */
export function useInicio() {
  const [dados, setDados] = useState<InicioResposta>();
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string>();

  // Carregamento inicial: o estado só muda quando a resposta chega.
  useEffect(() => {
    let ativo = true;

    api<InicioResposta>('/inicio')
      .then((resposta) => {
        if (ativo) {
          setDados(resposta);
          setErro(undefined);
        }
      })
      .catch((excecao) => ativo && setErro(mensagemDeErro(excecao)))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, []);

  const buscar = useCallback(async () => {
    try {
      setDados(await api<InicioResposta>('/inicio'));
      setErro(undefined);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    }
  }, []);

  /** Puxar para atualizar: mostra o indicador de atualização enquanto busca. */
  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await buscar();
    setAtualizando(false);
  }, [buscar]);

  useRecarregarAoFocar(buscar);

  return { dados, carregando, atualizando, erro, atualizar };
}
