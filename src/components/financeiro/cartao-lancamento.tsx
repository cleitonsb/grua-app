import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import type { ResumoDeLancamento } from '@/types/api';
import { formatarValorOuIndefinido } from '@/utils/dinheiro';
import { ROTULO_DA_SITUACAO } from '@/utils/financeiro';

/** "Via Estrutural → Paranoá"; só um lado quando falta o outro. */
function rotaDe(lancamento: ResumoDeLancamento): string | null {
  if (lancamento.servico_origem && lancamento.servico_destino) {
    return `${lancamento.servico_origem} → ${lancamento.servico_destino}`;
  }

  return lancamento.servico_origem ?? lancamento.servico_destino;
}

/** Subtítulo da linha: "veículo · placa · origem → destino"; no avulso sem veículo, a descrição. */
export function subtituloDoLancamento(lancamento: ResumoDeLancamento): string {
  const partes = [lancamento.veiculo, lancamento.placa, rotaDe(lancamento)].filter((parte): parte is string => !!parte);

  return partes.length > 0 ? partes.join(' · ') : lancamento.descricao;
}

/**
 * Item da lista do Financeiro (página 5 do protótipo): cliente, veículo · placa · rota, valor e selo de situação.
 */
export function CartaoLancamento({ lancamento, aoTocar }: { lancamento: ResumoDeLancamento; aoTocar?: () => void }) {
  const valor = formatarValorOuIndefinido(lancamento.valor_centavos);
  const indefinido = lancamento.valor_centavos === null;
  const subtitulo = subtituloDoLancamento(lancamento);

  return (
    <Cartao
      aoTocar={aoTocar}
      rotulo={`${lancamento.cliente}. ${subtitulo}. ${valor}. ${ROTULO_DA_SITUACAO[lancamento.situacao]}`}
      style={estilos.cartao}>
      <View style={estilos.texto}>
        <ThemedText style={estilos.cliente}>{lancamento.cliente}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitulo}
        </ThemedText>
      </View>
      <View style={estilos.lateral}>
        <ThemedText style={[estilos.valor, indefinido && estilos.indefinido]} themeColor={indefinido ? 'textSecondary' : 'text'}>
          {valor}
        </ThemedText>
        <Selo tipo={lancamento.situacao} />
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  texto: { flex: 1, gap: Spacing.half },
  cliente: { fontFamily: Fontes.titulo, fontSize: 17, lineHeight: 23 },
  lateral: { alignItems: 'flex-end', gap: Spacing.one },
  valor: { fontFamily: Fontes.titulo, fontSize: 16, lineHeight: 22 },
  indefinido: { fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 20 },
});
