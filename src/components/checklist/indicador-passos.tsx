import type { TipoChecklist } from '@/types/api';
import { rotuloDoTipo } from '@/utils/checklist';

export const TOTAL_DE_PASSOS = 4;

/** Título de cada passo do fluxo, mostrado no cabeçalho. */
export const TITULOS_DOS_PASSOS: Record<number, string> = {
  1: 'Dados do serviço',
  2: 'Avarias do veículo',
  3: 'Itens, pneus e combustível',
  4: 'Resumo e envio',
};

/** "Retirada · passo 2 de 4": a linha acima do título no cabeçalho do fluxo. A barra de segmentos é do `CabecalhoTela`. */
export function textoDoPasso(tipo: TipoChecklist, passo: number): string {
  return `${rotuloDoTipo(tipo)} · passo ${passo} de ${TOTAL_DE_PASSOS}`;
}
