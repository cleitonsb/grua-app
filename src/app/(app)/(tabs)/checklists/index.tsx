import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { ChecklistRecenteItem, ROTULOS_DE_STATUS } from '@/components/checklist-recente-item';
import { Icone } from '@/components/icone';
import { Pilula } from '@/components/pilula';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, MaxContentWidth, Raios, Spacing } from '@/constants/theme';
import { useChecklists } from '@/hooks/use-checklists';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { StatusChecklist, TipoChecklist } from '@/types/api';
import { PERIODOS } from '@/utils/checklist';

const STATUS: { valor: StatusChecklist | 'todos'; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  ...(['rascunho', 'concluido', 'assinado'] as const).map((valor) => ({ valor, rotulo: ROTULOS_DE_STATUS[valor] })),
];

const TIPOS: { valor: TipoChecklist | 'todos'; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Retirada e entrega' },
  { valor: 'retirada', rotulo: 'Retirada' },
  { valor: 'entrega', rotulo: 'Entrega' },
];

/** Lista dos checklists (do motorista; o administrador vê todos), com busca e filtros por status, tipo e período. */
export default function ChecklistsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { usuario } = useSession();
  const lista = useChecklists();
  const administrador = usuario?.papel === 'administrador';
  const filtrando = lista.busca.trim() !== '' || lista.filtros.status !== 'todos' || lista.filtros.tipo !== 'todos' || lista.filtros.periodo !== 'todos';

  const cabecalho = (
    <View style={estilos.cabecalho}>
      {administrador ? null : <Botao titulo="Novo checklist" icone="mais" onPress={() => router.push('/checklists/novo')} />}

      <View style={[estilos.busca, { backgroundColor: theme.backgroundElement, borderColor: theme.bordaCampo }]}>
        <Icone nome="busca" cor={theme.placeholder} />
        <TextInput
          accessibilityLabel="Buscar por placa ou cliente"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={lista.setBusca}
          placeholder="Buscar por placa ou cliente"
          placeholderTextColor={theme.placeholder}
          returnKeyType="search"
          style={[estilos.campoBusca, { color: theme.text }]}
          value={lista.busca}
        />
      </View>

      <Chips rotulo="Situação" opcoes={STATUS} valor={lista.filtros.status} onChange={(valor) => lista.alterarFiltro('status', valor)} />
      <Chips rotulo="Tipo" opcoes={TIPOS} valor={lista.filtros.tipo} onChange={(valor) => lista.alterarFiltro('tipo', valor)} />
      <Chips rotulo="Período" opcoes={PERIODOS} valor={lista.filtros.periodo} onChange={(valor) => lista.alterarFiltro('periodo', valor)} />

      {lista.erro ? (
        <View style={estilos.bloco}>
          <ThemedText style={{ color: theme.danger }}>{lista.erro}</ThemedText>
          <Botao titulo="Tentar de novo" variante="secundario" onPress={() => void lista.recarregar()} />
        </View>
      ) : null}

      {!lista.carregando && !lista.erro ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {lista.total === 1 ? '1 checklist' : `${lista.total} checklists`}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela titulo="Checklists" />

      <FlatList
        data={lista.itens}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={cabecalho}
        ItemSeparatorComponent={() => <View style={estilos.separador} />}
        onEndReached={() => void lista.carregarMais()}
        onEndReachedThreshold={0.4}
        onRefresh={() => void lista.recarregar()}
        refreshing={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ChecklistRecenteItem
            checklist={{ ...item, motorista: administrador ? item.motorista : undefined }}
            onPress={() => router.push(`/checklists/${item.id}` as Href)}
          />
        )}
        ListEmptyComponent={
          lista.carregando ? (
            <ActivityIndicator />
          ) : (
            <View style={estilos.bloco}>
              {lista.erro ? null : (
                <ThemedText themeColor="textSecondary">
                  {filtrando ? 'Nenhum checklist encontrado com esses filtros.' : 'Nenhum checklist ainda.'}
                </ThemedText>
              )}
            </View>
          )
        }
        ListFooterComponent={<View>{lista.carregandoMais ? <ActivityIndicator style={estilos.rodape} /> : null}</View>}
      />
    </View>
  );
}

/** Uma linha de pílulas claras para escolher um filtro entre poucas opções. */
function Chips<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (valor: T) => void;
}) {
  return (
    <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {opcoes.map((opcao) => (
          <Pilula key={opcao.valor} rotulo={opcao.rotulo} ativa={opcao.valor === valor} aoTocar={() => onChange(opcao.valor)} />
        ))}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  cabecalho: { gap: Spacing.three, marginBottom: Spacing.three },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Alturas.campo,
    borderWidth: 1,
    borderRadius: Raios.campo,
    paddingHorizontal: Spacing.three,
  },
  campoBusca: { flex: 1, fontFamily: Fontes.corpo, fontSize: 16, paddingVertical: Spacing.two },
  grupo: { gap: Spacing.one },
  chips: { gap: Spacing.two, paddingRight: Spacing.three },
  separador: { height: Spacing.two },
  bloco: { gap: Spacing.two },
  rodape: { marginVertical: Spacing.three },
});
