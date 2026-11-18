import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CampoFormularioProps extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  /** Mostra o botão "Mostrar/Ocultar" quando o campo é de senha (`secureTextEntry`). */
  alternarVisibilidade?: boolean;
}

export function CampoFormulario({
  rotulo,
  erro,
  ajuda,
  secureTextEntry,
  alternarVisibilidade = false,
  onFocus,
  onBlur,
  ...resto
}: CampoFormularioProps) {
  const theme = useTheme();
  const [oculto, setOculto] = useState(true);
  const [focado, setFocado] = useState(false);
  const esconder = Boolean(secureTextEntry) && (!alternarVisibilidade || oculto);

  return (
    <View style={estilos.campo}>
      <ThemedText style={estilos.rotulo}>{rotulo}</ThemedText>
      <View
        style={[
          estilos.entrada,
          focado && estilos.focado,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: erro ? theme.danger : focado ? theme.marinho : theme.bordaCampo,
          },
        ]}>
        <TextInput
          accessibilityLabel={rotulo}
          placeholderTextColor={theme.placeholder}
          secureTextEntry={esconder}
          style={[estilos.texto, { color: theme.text }]}
          onFocus={(evento) => {
            setFocado(true);
            onFocus?.(evento);
          }}
          onBlur={(evento) => {
            setFocado(false);
            onBlur?.(evento);
          }}
          {...resto}
        />
        {secureTextEntry && alternarVisibilidade ? (
          <Pressable accessibilityRole="button" onPress={() => setOculto((valor) => !valor)} hitSlop={12}>
            <ThemedText type="small" themeColor="textSecondary">
              {oculto ? 'Mostrar' : 'Ocultar'}
            </ThemedText>
          </Pressable>
        ) : null}
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
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Raios.campo,
    paddingHorizontal: Spacing.three,
    minHeight: Alturas.campo,
  },
  // A borda de foco tem 2 px; tira 1 px do espaço interno para o campo não "pular".
  focado: { borderWidth: 2, paddingHorizontal: Spacing.three - 1 },
  texto: { flex: 1, fontFamily: Fontes.corpo, fontSize: 16, paddingVertical: Spacing.two },
});
