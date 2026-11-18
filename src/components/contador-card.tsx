import { StyleSheet } from 'react-native';

import { Cartao } from '@/components/cartao';
import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';

/** Cartão de número com legenda (ex.: "3 · Hoje"), como nos contadores do Início. */
export function ContadorCard({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <Cartao style={estilos.cartao}>
      <ThemedText accessibilityLabel={`${valor} ${rotulo}`} style={estilos.valor}>
        {valor}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" accessibilityElementsHidden importantForAccessibility="no">
        {rotulo}
      </ThemedText>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { flex: 1, gap: Spacing.half, paddingVertical: 14, paddingHorizontal: 14 },
  valor: { fontFamily: Fontes.tituloNegrito, fontSize: 28, lineHeight: 32 },
});
