import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EventoDoHistorico, FormaPagamento, NomeDoEvento } from '@/types/api';
import { formatarValorOuIndefinido } from '@/utils/dinheiro';
import { ROTULO_DA_FORMA } from '@/utils/financeiro';
import { isoParaData } from '@/utils/periodo';
import { formatarDiaEHora } from '@/utils/formatadores';

const ROTULOS: Record<NomeDoEvento, string> = {
  criado: 'Lançamento criado',
  valor_alterado: 'Valor alterado',
  descricao_alterada: 'Descrição alterada',
  vinculos_alterados: 'Cliente, veículo ou caminhão alterados',
  pago: 'Pagamento registrado',
  reaberto: 'Lançamento reaberto',
  cancelado: 'Lançamento cancelado',
};

const valorDe = (dados: Record<string, unknown> | null, chave: string): number | null => {
  const valor = dados?.[chave];

  return typeof valor === 'number' ? valor : null;
};

const textoDe = (dados: Record<string, unknown> | null, chave: string): string | null => {
  const valor = dados?.[chave];

  return typeof valor === 'string' && valor !== '' ? valor : null;
};

function pagamentoDe(dados: Record<string, unknown> | null): string {
  const forma = textoDe(dados, 'forma_pagamento') as FormaPagamento | null;
  const data = textoDe(dados, 'pago_em');

  return [forma ? ROTULO_DA_FORMA[forma] ?? forma : null, data ? `em ${isoParaData(data)}` : null].filter(Boolean).join(' ');
}

/** O detalhe de cada evento em uma linha de texto (valor anterior e novo em reais, motivo, forma e data do pagamento). */
export function detalheDoEvento(evento: EventoDoHistorico): string | null {
  switch (evento.evento) {
    case 'criado':
      return `${formatarValorOuIndefinido(valorDe(evento.para, 'valor_centavos'))} · ${textoDe(evento.para, 'descricao') ?? ''}`.replace(/ · $/, '');
    case 'valor_alterado':
      return `${formatarValorOuIndefinido(valorDe(evento.de, 'valor_centavos'))} → ${formatarValorOuIndefinido(valorDe(evento.para, 'valor_centavos'))}`;
    case 'descricao_alterada':
      return `${textoDe(evento.de, 'descricao') ?? '—'} → ${textoDe(evento.para, 'descricao') ?? '—'}`;
    case 'pago':
      return [formatarValorOuIndefinido(valorDe(evento.para, 'valor_centavos')), pagamentoDe(evento.para)].filter((parte) => parte !== '').join(' · ');
    case 'reaberto':
      return pagamentoDe(evento.de) !== '' ? `Pagamento anterior: ${pagamentoDe(evento.de)}` : null;
    case 'cancelado':
      return textoDe(evento.para, 'motivo') ? `Motivo: ${textoDe(evento.para, 'motivo')}` : null;
    default:
      return null;
  }
}

/** Uma linha da linha do tempo: evento, quem fez e quando (horário de Brasília), e o detalhe do que mudou. */
export function LinhaDoHistorico({ evento }: { evento: EventoDoHistorico }) {
  const theme = useTheme();
  const detalhe = detalheDoEvento(evento);

  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${ROTULOS[evento.evento]}. ${evento.autor ?? 'Sistema'}, ${formatarDiaEHora(evento.criado_em)}. ${detalhe ?? ''}`}>
      <View style={[estilos.ponto, { backgroundColor: theme.marinho }]} />
      <View style={estilos.texto}>
        <ThemedText style={estilos.titulo}>{ROTULOS[evento.evento]}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {evento.autor ?? 'Sistema'} · {formatarDiaEHora(evento.criado_em)}
        </ThemedText>
        {detalhe ? <ThemedText type="small">{detalhe}</ThemedText> : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  ponto: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  texto: { flex: 1, gap: 2 },
  titulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 15, lineHeight: 22 },
});
