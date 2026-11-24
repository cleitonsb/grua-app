import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { OperacaoRecente } from '@/types/api';
import { formatarPlaca, formatarQuando, nomeDoCliente } from '@/utils/formatadores';

/**
 * Linha de uma operação (retirada e entrega, com um financeiro só): placa, nome do cliente, horário e a situação
 * (concluído, assinado ou pago). Os demais dados só aparecem ao tocar.
 */
export function OperacaoItem({ operacao, onPress }: { operacao: OperacaoRecente; onPress?: () => void }) {
  const placa = operacao.placa ? formatarPlaca(operacao.placa) : 'Placa não informada';
  const cliente = operacao.cliente ? nomeDoCliente(operacao.cliente) : 'Cliente não informado';
  const horario = formatarQuando(operacao.data_hora);

  return (
    <Cartao aoTocar={onPress} rotulo={`${placa}. ${cliente}, ${horario}. ${ROTULO[operacao.situacao]}`} style={estilos.item}>
      <View style={estilos.texto}>
        <ThemedText type="smallBold" style={estilos.placa}>
          {placa}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {cliente} · {horario}
        </ThemedText>
      </View>

      <Selo tipo={operacao.situacao} />
    </Cartao>
  );
}

const ROTULO: Record<OperacaoRecente['situacao'], string> = { concluido: 'Concluído', assinado: 'Assinado', pago: 'Pago' };

const estilos = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  texto: { flex: 1, gap: Spacing.half },
  placa: { fontSize: 15, lineHeight: 20 },
});
