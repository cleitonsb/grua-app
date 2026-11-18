import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Opcao<T extends string | number | null> {
  valor: T;
  rotulo: string;
}

interface SeletorOpcoesProps<T extends string | number | null> {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  onChange: (valor: T) => void;
  erro?: string;
  ajuda?: string;
}

/** Escolha de uma opção entre poucas, em botões (ex.: categoria da CNH, caminhão). */
export function SeletorOpcoes<T extends string | number | null>({
  rotulo,
  opcoes,
  valor,
  onChange,
  erro,
  ajuda,
}: SeletorOpcoesProps<T>) {
  const theme = useTheme();

  return (
    <View style={estilos.campo}>
      <ThemedText style={estilos.rotulo}>{rotulo}</ThemedText>

      <View style={estilos.opcoes}>
        {opcoes.map((opcao) => {
          const selecionada = opcao.valor === valor;

          return (
            <Pressable
              key={String(opcao.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selecionada }}
              onPress={() => onChange(opcao.valor)}
              style={[
                estilos.opcao,
                {
                  backgroundColor: selecionada ? theme.marinho : theme.backgroundElement,
                  borderColor: erro ? theme.danger : selecionada ? theme.marinho : theme.bordaCampo,
                },
              ]}>
              <ThemedText style={[estilos.textoOpcao, { color: selecionada ? theme.branco : theme.text }]}>
                {opcao.rotulo}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {erro}
        </ThemedText>
      ) : ajuda ? (
        <ThemedText type="small" themeColor="textSecondary">
          {ajuda}
        </ThemedText>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  opcao: {
    minHeight: Alturas.alvoMinimo,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Raios.campo,
    borderWidth: 1,
  },
  textoOpcao: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
});
