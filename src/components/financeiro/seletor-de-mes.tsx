import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { Pilula } from '@/components/pilula';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mesAnterior, mesAtual, proximoMes, rotuloCompletoDoMes } from '@/utils/periodo';

interface SeletorDeMesProps {
  mes: string;
  /** Meses com lançamento, vindos da API. */
  meses: string[];
  aoEscolher: (mes: string) => void;
}

/** Seletor de período: setas de mês anterior e próximo, atalho "Mês atual" e os meses que têm lançamentos. */
export function SeletorDeMes({ mes, meses, aoEscolher }: SeletorDeMesProps) {
  const theme = useTheme();

  return (
    <Cartao style={estilos.cartao}>
      <View style={estilos.navegacao}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => aoEscolher(mesAnterior(mes))}
          style={estilos.seta}>
          <ThemedText style={[estilos.setaTexto, { color: theme.marinho }]}>‹</ThemedText>
        </Pressable>
        <ThemedText style={estilos.mes} accessibilityLiveRegion="polite">
          {rotuloCompletoDoMes(mes)}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => aoEscolher(proximoMes(mes))}
          style={estilos.seta}>
          <ThemedText style={[estilos.setaTexto, { color: theme.marinho }]}>›</ThemedText>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        <Pilula rotulo="Mês atual" ativa={mes === mesAtual()} aoTocar={() => aoEscolher(mesAtual())} />
        {meses.map((item) => (
          <Pilula key={item} rotulo={rotuloCompletoDoMes(item)} ativa={item === mes} aoTocar={() => aoEscolher(item)} />
        ))}
      </ScrollView>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { gap: Spacing.two },
  navegacao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seta: { minWidth: Alturas.alvoMinimo, minHeight: Alturas.alvoMinimo, alignItems: 'center', justifyContent: 'center' },
  setaTexto: { fontFamily: Fontes.tituloNegrito, fontSize: 28, lineHeight: 32 },
  mes: { fontFamily: Fontes.titulo, fontSize: 17, lineHeight: 23 },
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
});
