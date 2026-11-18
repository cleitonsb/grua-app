import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { AvatarIniciais } from '@/components/avatar-iniciais';
import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { Icone } from '@/components/icone';
import { Pilula } from '@/components/pilula';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import type { FiltroSituacao } from '@/hooks/use-cadastro';
import { useTheme } from '@/hooks/use-theme';

export interface ItemDaLista {
  id: number;
  titulo: string;
  subtitulo: string;
  ativo: boolean;
}

interface CadastroListaProps {
  itens: ItemDaLista[];
  total: number;
  busca: string;
  onBusca: (texto: string) => void;
  placeholderBusca: string;
  filtro: FiltroSituacao;
  onFiltro: (filtro: FiltroSituacao) => void;
  carregando: boolean;
  carregandoMais: boolean;
  erro?: string;
  temMais: boolean;
  onCarregarMais: () => void;
  onRecarregar: () => void;
  onSelecionar: (id: number) => void;
  mensagemVazia: string;
  /** Esconde os botões Todos/Ativos/Inativos (ex.: ao escolher um registro, só os ativos interessam). */
  mostrarFiltro?: boolean;
  /** Espaço livre no fim da lista, para o último item não ficar sob o botão flutuante. */
  reservaInferior?: number;
}

const FILTROS: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
];

/** Lista de um cadastro com busca, filtro de situação, avatar e selo Ativo/Inativo, estado vazio e "carregar mais". */
export function CadastroLista({
  itens,
  total,
  busca,
  onBusca,
  placeholderBusca,
  filtro,
  onFiltro,
  carregando,
  carregandoMais,
  erro,
  onCarregarMais,
  onRecarregar,
  onSelecionar,
  mensagemVazia,
  mostrarFiltro = true,
  reservaInferior = Spacing.four,
}: CadastroListaProps) {
  const theme = useTheme();

  return (
    <View style={estilos.container}>
      <View style={[estilos.busca, { backgroundColor: theme.backgroundElement, borderColor: theme.bordaCampo }]}>
        <Icone nome="busca" cor={theme.placeholder} />
        <TextInput
          accessibilityLabel={placeholderBusca}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={onBusca}
          placeholder={placeholderBusca}
          placeholderTextColor={theme.placeholder}
          returnKeyType="search"
          style={[estilos.campoBusca, { color: theme.text }]}
          value={busca}
        />
      </View>

      {mostrarFiltro ? (
        <View style={estilos.filtros}>
          {FILTROS.map(({ valor, rotulo }) => (
            <Pilula key={valor} rotulo={rotulo} ativa={filtro === valor} aoTocar={() => onFiltro(valor)} />
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={estilos.total}>
            {total} {total === 1 ? 'registro' : 'registros'}
          </ThemedText>
        </View>
      ) : null}

      {erro ? (
        <View style={estilos.estado}>
          <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText>
          <Botao titulo="Tentar de novo" variante="secundario" onPress={onRecarregar} />
        </View>
      ) : null}

      <FlatList
        data={itens}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        onEndReached={onCarregarMais}
        onEndReachedThreshold={0.4}
        onRefresh={onRecarregar}
        refreshing={carregando && itens.length > 0}
        contentContainerStyle={[estilos.lista, { paddingBottom: reservaInferior }]}
        ItemSeparatorComponent={() => <View style={estilos.separador} />}
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator style={estilos.estado} />
          ) : erro ? undefined : (
            <ThemedText themeColor="textSecondary" style={estilos.estado}>
              {mensagemVazia}
            </ThemedText>
          )
        }
        ListFooterComponent={carregandoMais ? <ActivityIndicator style={estilos.estado} /> : undefined}
        renderItem={({ item }) => (
          <Cartao
            aoTocar={() => onSelecionar(item.id)}
            rotulo={`${item.titulo}. ${item.subtitulo}. ${item.ativo ? 'Ativo' : 'Inativo'}`}
            style={estilos.item}>
            <AvatarIniciais nome={item.titulo} />
            <View style={estilos.itemTexto}>
              <ThemedText type="smallBold" style={estilos.titulo}>
                {item.titulo}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.subtitulo}
              </ThemedText>
            </View>
            <Selo tipo={item.ativo ? 'ativo' : 'inativo'} />
          </Cartao>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, gap: Spacing.two },
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
  filtros: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  total: { marginLeft: 'auto' },
  lista: { flexGrow: 1 },
  separador: { height: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  itemTexto: { flex: 1, gap: Spacing.half },
  titulo: { fontSize: 15, lineHeight: 20 },
  estado: { padding: Spacing.four, textAlign: 'center', gap: Spacing.three },
});
