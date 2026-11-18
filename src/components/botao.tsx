import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icone, type NomeDoIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  desabilitado?: boolean;
  variante?: 'primario' | 'secundario' | 'perigo';
  /** Ícone à esquerda do título (ex.: "+" em "Novo checklist"). */
  icone?: NomeDoIcone;
  /** Botão alto e com texto maior, como o "Novo checklist" do Início. */
  grande?: boolean;
}

export function Botao({
  titulo,
  onPress,
  carregando = false,
  desabilitado = false,
  variante = 'primario',
  icone,
  grande = false,
}: BotaoProps) {
  const theme = useTheme();
  const bloqueado = desabilitado || carregando;

  const fundo =
    variante === 'primario' ? theme.primary : variante === 'perigo' ? theme.danger : theme.backgroundElement;
  const corTexto = variante === 'secundario' ? theme.text : variante === 'perigo' ? theme.branco : theme.primaryText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      disabled={bloqueado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, borderColor: variante === 'secundario' ? theme.bordaCampo : fundo },
        grande && estilos.grande,
        bloqueado && estilos.desabilitado,
        pressed && estilos.pressionado,
      ]}>
      <View style={estilos.conteudo}>
        {carregando ? <ActivityIndicator color={corTexto} /> : null}
        {icone && !carregando ? <Icone nome={icone} cor={corTexto} tamanho={grande ? 26 : 22} /> : null}
        <ThemedText style={[estilos.titulo, grande && estilos.tituloGrande, { color: corTexto }]}>
          {titulo}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    minHeight: Alturas.botaoPrincipal,
    borderRadius: Raios.cartao,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  titulo: { fontFamily: Fontes.tituloNegrito, fontSize: 16, lineHeight: 20 },
  tituloGrande: { fontSize: 20, lineHeight: 24 },
  grande: { minHeight: 68 },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  desabilitado: { opacity: 0.5 },
  pressionado: { opacity: 0.8 },
});
