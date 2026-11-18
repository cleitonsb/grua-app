import { Pressable, StyleSheet } from 'react-native';

import { Icone } from '@/components/icone';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BotaoFlutuanteProps {
  /** Descrição para leitor de tela (ex.: "Novo cliente"). */
  rotulo: string;
  aoTocar: () => void;
}

/**
 * Botão redondo "+" no canto inferior direito, como o do protótipo. Posiciona-se em relação ao contêiner que o recebe,
 * que termina acima da barra de abas, então não cobre a barra.
 */
export function BotaoFlutuante({ rotulo, aoTocar }: BotaoFlutuanteProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={aoTocar}
      style={({ pressed }) => [estilos.botao, { backgroundColor: theme.primary, shadowColor: theme.marinho }, pressed && estilos.pressionado]}>
      <Icone nome="mais" tamanho={28} cor={theme.primaryText} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressionado: { opacity: 0.85 },
});
