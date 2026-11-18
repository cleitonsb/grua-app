import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Alturas, Raios, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CartaoProps {
  children: ReactNode;
  /** Com `aoTocar` o cartão vira um botão (alvo mínimo de 44 pt). */
  aoTocar?: () => void;
  /** Descrição para leitor de tela do cartão tocável. */
  rotulo?: string;
  style?: StyleProp<ViewStyle>;
}

/** Superfície branca com borda fina, como os cartões do protótipo. */
export function Cartao({ children, aoTocar, rotulo, style }: CartaoProps) {
  const theme = useTheme();
  const base = [estilos.cartao, { backgroundColor: theme.backgroundElement, borderColor: theme.borda }, style];

  if (!aoTocar) {
    return <View style={base}>{children}</View>;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoTocar} style={[base, estilos.tocavel]}>
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderRadius: Raios.cartao,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  tocavel: { minHeight: Alturas.alvoMinimo },
});
