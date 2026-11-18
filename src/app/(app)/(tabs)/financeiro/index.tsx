import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { FiltrosFinanceiro } from '@/components/financeiro/filtros-financeiro';
import { CartaoLancamento } from '@/components/financeiro/cartao-lancamento';
import { SeletorDeMes } from '@/components/financeiro/seletor-de-mes';
import { TotaisFinanceiroCartoes } from '@/components/financeiro/totais-financeiro';
import { ThemedText } from '@/components/themed-text';
import { Alturas, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFinanceiro } from '@/hooks/use-financeiro';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { mesAnterior, mesAtual, rotuloCompletoDoMes, rotuloDoMes } from '@/utils/periodo';

/**
 * Financeiro (página 5 do protótipo): pílulas de período, totais "Recebido" e "A receber" do mês e a lista de
 * lançamentos. Os totais e a lista vêm da API, que já aplica o escopo de cada papel (o motorista só vê os dele).
 */
export default function FinanceiroScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { usuario } = useSession();
  const ehAdministrador = usuario?.papel === 'administrador';
  const financeiro = useFinanceiro();
  const { mes, setMes, meses, itens, totais, carregando, atualizando, carregandoMais, erro, recarregar, carregarMais, exportando, erroExportacao, exportarCsv } = financeiro;
  const [seletorAberto, setSeletorAberto] = useState(false);

  const atual = mesAtual();
  const anterior = mesAnterior(atual);
  const pilulas = [
    { chave: atual, rotulo: rotuloDoMes(atual) },
    { chave: anterior, rotulo: rotuloDoMes(anterior) },
    { chave: 'periodo', rotulo: 'Período' },
  ];
  const pilulaAtiva = seletorAberto ? 'periodo' : mes === atual ? atual : mes === anterior ? anterior : 'periodo';

  function escolherPilula(chave: string) {
    if (chave === 'periodo') {
      setSeletorAberto((aberto) => !aberto);

      return;
    }

    setSeletorAberto(false);
    setMes(chave);
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela titulo="Financeiro" descricao={rotuloCompletoDoMes(mes)} pilulas={pilulas} pilulaAtiva={pilulaAtiva} aoEscolherPilula={escolherPilula} />

      <FlatList
        data={itens}
        keyExtractor={(item) => String(item.id)}
        onEndReached={carregarMais}
        onEndReachedThreshold={0.4}
        onRefresh={recarregar}
        refreshing={atualizando}
        contentContainerStyle={estilos.conteudo}
        ItemSeparatorComponent={() => <View style={estilos.separador} />}
        ListHeaderComponent={
          <View style={estilos.cabecalho}>
            {seletorAberto ? <SeletorDeMes mes={mes} meses={meses} aoEscolher={setMes} /> : null}
            <TotaisFinanceiroCartoes totais={totais} />
            <View style={estilos.titulo}>
              <ThemedText type="subtitle">Lançamentos</ThemedText>
              {ehAdministrador ? (
                <Pressable accessibilityRole="link" accessibilityLabel="Novo lançamento" onPress={() => router.push('/financeiro/novo')} style={estilos.novo}>
                  <ThemedText type="linkPrimary" style={estilos.novoTexto}>
                    + Novo lançamento
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            <FiltrosFinanceiro
              busca={financeiro.busca}
              aoBuscar={financeiro.setBusca}
              situacao={financeiro.situacao}
              aoEscolherSituacao={financeiro.setSituacao}
              clienteId={financeiro.clienteId}
              aoEscolherCliente={(cliente) => financeiro.setClienteId(cliente?.id)}
              caminhaoId={financeiro.caminhaoId}
              aoEscolherCaminhao={financeiro.setCaminhaoId}
              motoristaId={financeiro.motoristaId}
              aoEscolherMotorista={financeiro.setMotoristaId}
              ehAdministrador={ehAdministrador}
              temFiltro={financeiro.temFiltro}
              aoLimpar={financeiro.limparFiltros}
            />
            {ehAdministrador ? (
              <View style={estilos.estado}>
                <Botao titulo="Exportar CSV" variante="secundario" carregando={exportando} onPress={() => void exportarCsv()} />
                {erroExportacao ? (
                  <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                    {erroExportacao}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Você vê os lançamentos dos serviços que fez.
              </ThemedText>
            )}
            {erro ? (
              <View style={estilos.estado}>
                <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText>
                <Botao titulo="Tentar de novo" variante="secundario" onPress={() => void recarregar()} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator style={estilos.estado} />
          ) : erro ? undefined : (
            <ThemedText themeColor="textSecondary" style={estilos.estado}>
              Nenhum lançamento neste período
            </ThemedText>
          )
        }
        ListFooterComponent={
          <View style={estilos.rodape}>
            {carregandoMais ? <ActivityIndicator /> : null}
            <ThemedText type="small" themeColor="textSecondary">
              Cada checklist concluído gera um lançamento ligado ao cliente, ao veículo e ao caminhão.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => <CartaoLancamento lancamento={item} aoTocar={() => router.push(`/financeiro/${item.id}`)} />}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  novo: { minHeight: Alturas.alvoMinimo, justifyContent: 'center' },
  novoTexto: { textDecorationLine: 'underline' },
  tela: { flex: 1 },
  conteudo: { padding: Spacing.three, paddingBottom: Spacing.five, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  cabecalho: { gap: Spacing.three, marginBottom: Spacing.three },
  separador: { height: Spacing.two },
  estado: { gap: Spacing.two, paddingVertical: Spacing.three },
  rodape: { gap: Spacing.two, paddingTop: Spacing.three },
});
