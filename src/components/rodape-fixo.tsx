import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import type { NomeDoIcone } from '@/components/icone';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface AcaoDoRodape {
  titulo: string;
  aoTocar: () => void;
  desabilitado?: boolean;
  carregando?: boolean;
  icone?: NomeDoIcone;
}

export interface RodapeFixoProps {
  /** Ação à esquerda, mais estreita (ex.: "Cancelar", "Voltar"). */
  secundario?: AcaoDoRodape;
  /** Ação principal, em âmbar, mais larga (ex.: "Salvar cliente", "Continuar"). */
  principal: AcaoDoRodape;
}

/**
 * Rodapé fixo dos formulários e dos passos do checklist: fica fora da rolagem, respeita a área segura inferior e sobe
 * com o teclado quando o contêiner usa `KeyboardAvoidingView`.
 */
export function RodapeFixo({ secundario, principal }: RodapeFixoProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        estilos.rodape,
        { backgroundColor: theme.backgroundElement, borderTopColor: theme.borda, paddingBottom: Spacing.three + insets.bottom },
      ]}>
      {secundario ? (
        <View style={estilos.secundario}>
          <Botao
            titulo={secundario.titulo}
            variante="secundario"
            onPress={secundario.aoTocar}
            desabilitado={secundario.desabilitado}
            carregando={secundario.carregando}
            icone={secundario.icone}
          />
        </View>
      ) : null}
      <View style={estilos.principal}>
        <Botao
          titulo={principal.titulo}
          onPress={principal.aoTocar}
          desabilitado={principal.desabilitado}
          carregando={principal.carregando}
          icone={principal.icone}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  rodape: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopWidth: 1,
  },
  secundario: { minWidth: 104 },
  principal: { flex: 1 },
});
