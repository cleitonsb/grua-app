import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TotaisFinanceiro } from '@/types/api';
import { formatarReais } from '@/utils/dinheiro';

/** O texto do valor precisa caber em uma linha no cartão (metade da tela): valores maiores usam fonte menor. */
function tamanhoDoValor(texto: string) {
  if (texto.length <= 9) return { fontSize: 22, lineHeight: 28 };
  if (texto.length <= 11) return { fontSize: 18, lineHeight: 24 };
  if (texto.length <= 13) return { fontSize: 16, lineHeight: 22 };

  return { fontSize: 14, lineHeight: 20 };
}

/**
 * Cartões "Recebido" (verde) e "A receber" (âmbar escuro) do período e dos filtros. Os números vêm da API (o conjunto
 * inteiro, não só a página). Lançamentos sem valor ficam fora das somas e são avisados abaixo.
 */
export function TotaisFinanceiroCartoes({ totais }: { totais?: TotaisFinanceiro }) {
  const theme = useTheme();
  const recebido = formatarReais(totais?.recebido ?? 0);
  const aReceber = formatarReais(totais?.a_receber ?? 0);
  const semValor = totais?.sem_valor ?? 0;

  return (
    <View style={estilos.bloco} accessibilityLiveRegion="polite">
      <View style={estilos.linha}>
        <Cartao style={estilos.total} rotulo={`Recebido: ${recebido}`}>
          <ThemedText type="small" themeColor="textSecondary">
            Recebido
          </ThemedText>
          <ThemedText style={[estilos.valor, tamanhoDoValor(recebido), { color: theme.sucesso }]} numberOfLines={1}>
            {recebido}
          </ThemedText>
        </Cartao>
        <Cartao style={estilos.total} rotulo={`A receber: ${aReceber}`}>
          <ThemedText type="small" themeColor="textSecondary">
            A receber
          </ThemedText>
          <ThemedText style={[estilos.valor, tamanhoDoValor(aReceber), { color: theme.alerta }]} numberOfLines={1}>
            {aReceber}
          </ThemedText>
        </Cartao>
      </View>
      {semValor > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {semValor === 1 ? '1 lançamento sem valor definido não entra nos totais.' : `${semValor} lançamentos sem valor definido não entram nos totais.`}
        </ThemedText>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Spacing.two },
  linha: { flexDirection: 'row', gap: Spacing.two },
  total: { flex: 1, gap: Spacing.half },
  valor: { fontFamily: Fontes.tituloNegrito, fontSize: 22, lineHeight: 28 },
});
