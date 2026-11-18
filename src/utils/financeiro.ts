import type { FormaPagamento, SituacaoLancamento } from '@/types/api';

/** Rótulos em português das formas de pagamento e das situações do Financeiro. */
export const ROTULO_DA_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
  transferencia: 'Transferência',
};

export const ROTULO_DA_SITUACAO: Record<SituacaoLancamento, string> = {
  a_receber: 'A receber',
  pago: 'Pago',
  cancelado: 'Cancelado',
};
