import { useRouter } from 'expo-router';
import { useState } from 'react';

import { api, ApiError } from '@/services/api';
import type { Checklist } from '@/types/api';

/**
 * Inicia a entrega de uma retirada. A entrega só nasce de dentro da retirada (é o passo que a fecha) e cada retirada
 * tem uma única entrega: se ela já existe, a API devolve a mesma e o app apenas a abre. A entrega copia cliente,
 * veículo e rota da retirada.
 */
export function useIniciarEntrega(retiradaId: number | string) {
  const router = useRouter();
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState<string>();

  async function iniciar() {
    setIniciando(true);
    setErro(undefined);

    try {
      const entrega = await api<Checklist>('/checklists', { method: 'POST', body: { tipo: 'entrega', origem_id: Number(retiradaId) } });

      router.replace(`/checklists/${entrega.id}/editar`);
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível iniciar a entrega. Tente novamente.');
      setIniciando(false);
    }
  }

  return { iniciar, iniciando, erro };
}
