import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { StatusChecklist, TipoChecklist } from '@/types/api';
import { formatarPlaca, formatarQuando } from '@/utils/formatadores';

export const ROTULOS_DE_STATUS: Record<StatusChecklist, string> = {
  rascunho: 'Rascunho',
  concluido: 'Concluído',
  assinado: 'Assinado',
};

/** O que a linha mostra: serve à lista de checklists (`ChecklistResumo`). */
export interface DadosDaLinha {
  id: number;
  placa: string | null;
  cliente: string | null;
  data_hora: string;
  status: StatusChecklist;
  tipo?: TipoChecklist;
  /** Nome do motorista; só interessa ao administrador, que vê os checklists de todos. */
  motorista?: string;
}

/** Linha de checklist: placa, cliente e horário, e o selo de status. Tocar abre o detalhe. */
export function ChecklistRecenteItem({ checklist, onPress }: { checklist: DadosDaLinha; onPress?: () => void }) {
  const veiculo = checklist.placa ? formatarPlaca(checklist.placa) : 'Placa não informada';
  const detalhes = [
    checklist.tipo === 'entrega' ? 'Entrega' : checklist.tipo === 'retirada' ? 'Retirada' : undefined,
    checklist.cliente ?? 'Cliente não informado',
    formatarQuando(checklist.data_hora),
    checklist.motorista,
  ].filter(Boolean);

  return (
    <Cartao aoTocar={onPress} rotulo={`${veiculo}. ${detalhes.join(', ')}. ${ROTULOS_DE_STATUS[checklist.status]}`} style={estilos.item}>
      <View style={estilos.texto}>
        <ThemedText type="smallBold" style={estilos.veiculo}>
          {veiculo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detalhes.join(' · ')}
        </ThemedText>
      </View>

      <Selo tipo={checklist.status} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  texto: { flex: 1, gap: Spacing.half },
  veiculo: { fontSize: 15, lineHeight: 20 },
});
