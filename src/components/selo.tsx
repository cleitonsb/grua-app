import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fontes, Raios } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TipoDeSelo = 'rascunho' | 'concluido' | 'assinado' | 'ativo' | 'inativo' | 'a_receber' | 'pago' | 'cancelado';

const ROTULOS: Record<TipoDeSelo, string> = {
  rascunho: 'Rascunho',
  concluido: 'Concluído',
  assinado: 'Assinado',
  ativo: 'Ativo',
  inativo: 'Inativo',
  a_receber: 'A receber',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

/** Selo de status do checklist, de situação do cadastro (Ativo, Inativo) ou do lançamento (A receber, Pago, Cancelado). */
export function Selo({ tipo, rotulo }: { tipo: TipoDeSelo; rotulo?: string }) {
  const theme = useTheme();

  const cores =
    tipo === 'assinado' || tipo === 'ativo' || tipo === 'pago'
      ? { fundo: theme.sucessoFundo, texto: theme.sucesso }
      : tipo === 'concluido' || tipo === 'a_receber'
        ? { fundo: theme.alertaFundo, texto: theme.alerta }
        : { fundo: theme.neutroFundo, texto: theme.textSecondary };

  return (
    <View style={[estilos.selo, { backgroundColor: cores.fundo }]}>
      <ThemedText style={[estilos.texto, { color: cores.texto }]}>{rotulo ?? ROTULOS[tipo]}</ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: Raios.pilula },
  texto: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 12, lineHeight: 16 },
});
