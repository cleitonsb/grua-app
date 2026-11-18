import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface PilulaProps {
  rotulo: string;
  ativa: boolean;
  aoTocar: () => void;
  /** `true`: sobre o cabeçalho azul-marinho (ativa em âmbar). `false`: chip claro de filtro (ativo em azul-marinho). */
  sobreCabecalho?: boolean;
}

/** Pílula selecionável: as abas de Cadastros e Financeiro (sobre o cabeçalho) e os filtros das listas (chip claro). */
export function Pilula({ rotulo, ativa, aoTocar, sobreCabecalho = false }: PilulaProps) {
  const theme = useTheme();

  const cores = sobreCabecalho
    ? { fundo: ativa ? theme.primary : theme.trilha, texto: ativa ? theme.primaryText : theme.textoSobreMarinho, borda: 'transparent' }
    : {
        fundo: ativa ? theme.marinho : theme.backgroundElement,
        texto: ativa ? theme.branco : theme.text,
        borda: ativa ? theme.marinho : theme.bordaCampo,
      };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: ativa }}
      accessibilityLabel={rotulo}
      onPress={aoTocar}
      style={[estilos.pilula, { backgroundColor: cores.fundo, borderColor: cores.borda }]}>
      <ThemedText style={[estilos.texto, { color: cores.texto }]}>{rotulo}</ThemedText>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pilula: {
    minHeight: Alturas.alvoMinimo,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: Raios.pilula,
    borderWidth: 1,
  },
  texto: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
});
