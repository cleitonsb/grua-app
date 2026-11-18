import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fontes } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { iniciais } from '@/utils/formatadores';

interface AvatarIniciaisProps {
  nome: string;
  tamanho?: number;
  /** `ambar` no Início; `neutro` nas listas de cadastro. */
  tom?: 'ambar' | 'neutro';
}

/** Círculo com as iniciais do nome. Decorativo: o nome já aparece em texto ao lado. */
export function AvatarIniciais({ nome, tamanho = 44, tom = 'neutro' }: AvatarIniciaisProps) {
  const theme = useTheme();
  const ambar = tom === 'ambar';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        estilos.avatar,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: ambar ? theme.primary : theme.backgroundSelected },
      ]}>
      <ThemedText
        style={{
          fontFamily: Fontes.tituloNegrito,
          fontSize: Math.round(tamanho * 0.34),
          lineHeight: Math.round(tamanho * 0.42),
          color: ambar ? theme.primaryText : theme.marinho,
        }}>
        {iniciais(nome)}
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
