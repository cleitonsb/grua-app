import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { Cartao } from '@/components/cartao';
import { DialogoDeCancelamento } from '@/components/financeiro/dialogo-de-cancelamento';
import { DialogoDePagamento } from '@/components/financeiro/dialogo-de-pagamento';
import { LinhaDoHistorico } from '@/components/financeiro/linha-do-historico';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { Fontes, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLancamento } from '@/hooks/use-lancamento';
import { useTheme } from '@/hooks/use-theme';
import { formatarValorOuIndefinido } from '@/utils/dinheiro';
import { ROTULO_DA_FORMA } from '@/utils/financeiro';
import { isoParaData } from '@/utils/periodo';

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;

  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary" style={estilos.rotulo}>
        {rotulo}
      </ThemedText>
      <ThemedText style={estilos.valor}>{valor}</ThemedText>
    </View>
  );
}

/** Detalhe do lançamento: dados, link para o checklist de origem e o histórico de alterações (somente leitura). */
export default function LancamentoDetalheScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lancamento, carregando, atualizando, erro, recarregar, executando, erroAcao, errosDoCampo, pagar, reabrir, cancelar } = useLancamento(id);
  const [painel, setPainel] = useState<'pagamento' | 'cancelamento' | null>(null);
  const [mensagem, setMensagem] = useState<string>();

  function voltar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/financeiro');
    }
  }

  async function aoPagar(dados: Parameters<typeof pagar>[0]) {
    if (await pagar(dados)) {
      setPainel(null);
      setMensagem('Pagamento registrado.');
    }
  }

  async function aoReabrir() {
    setMensagem(undefined);

    if (await reabrir()) {
      setMensagem('Lançamento reaberto: voltou a "A receber".');
    }
  }

  async function aoCancelar(motivo: string) {
    if (await cancelar(motivo)) {
      setPainel(null);
      setMensagem('Lançamento cancelado.');
    }
  }

  // Sem valor definido, a API só aceita pagar com o valor junto: o painel o pede.
  const semValor = lancamento?.valor_centavos === null;
  const podePagar = !!lancamento && (lancamento.acoes.pagar || (lancamento.acoes.editar && semValor));

  const rota =
    lancamento?.servico_origem && lancamento.servico_destino
      ? `${lancamento.servico_origem} → ${lancamento.servico_destino}`
      : (lancamento?.servico_origem ?? lancamento?.servico_destino);

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo={lancamento?.cliente ?? 'Lançamento'}
        subtitulo={lancamento ? `Lançamento #${lancamento.id}` : undefined}
        aoVoltar={voltar}
        acao={lancamento ? <Selo tipo={lancamento.situacao} /> : undefined}
      />

      <ScrollView contentContainerStyle={estilos.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void recarregar()} />}>
        <View style={estilos.coluna}>
          {carregando ? <ActivityIndicator /> : null}

          {erro ? (
            <View style={estilos.bloco}>
              <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText>
              <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
            </View>
          ) : null}

          {lancamento ? (
            <>
              <Cartao style={estilos.dados}>
                <ThemedText style={estilos.valorGrande}>{formatarValorOuIndefinido(lancamento.valor_centavos)}</ThemedText>
                <Linha rotulo="Descrição" valor={lancamento.descricao} />
                <Linha rotulo="Competência" valor={isoParaData(lancamento.data_competencia)} />
                <Linha rotulo="Veículo" valor={[lancamento.veiculo, lancamento.placa].filter(Boolean).join(' · ')} />
                <Linha rotulo="Rota" valor={rota} />
                <Linha rotulo="Motorista" valor={lancamento.motorista} />
                <Linha rotulo="Caminhão" valor={lancamento.caminhao_placa} />
                <Linha rotulo="Origem" valor={lancamento.origem === 'automatica' ? 'Checklist assinado' : 'Lançamento avulso'} />
                {lancamento.situacao === 'pago' ? (
                  <Linha
                    rotulo="Pagamento"
                    valor={[lancamento.forma_pagamento ? ROTULO_DA_FORMA[lancamento.forma_pagamento] : null, lancamento.pago_em ? isoParaData(lancamento.pago_em) : null].filter(Boolean).join(' · ')}
                  />
                ) : null}
                <Linha rotulo="Motivo do cancelamento" valor={lancamento.motivo_cancelamento} />
              </Cartao>

              {mensagem ? (
                <ThemedText type="smallBold" style={{ color: theme.sucesso }} accessibilityLiveRegion="polite">
                  {mensagem}
                </ThemedText>
              ) : null}

              {erroAcao && painel === null ? (
                <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                  {erroAcao}
                </ThemedText>
              ) : null}

              {painel === 'pagamento' ? (
                <DialogoDePagamento pedirValor={semValor} executando={executando} erroAcao={erroAcao} errosDoCampo={errosDoCampo} aoConfirmar={(dados) => void aoPagar(dados)} aoVoltar={() => setPainel(null)} />
              ) : null}

              {painel === 'cancelamento' ? (
                <DialogoDeCancelamento executando={executando} erroAcao={erroAcao} errosDoCampo={errosDoCampo} aoConfirmar={(motivo) => void aoCancelar(motivo)} aoVoltar={() => setPainel(null)} />
              ) : null}

              {painel === null && lancamento.acoes.editar ? (
                <Botao titulo="Editar lançamento" variante="secundario" onPress={() => router.push(`/financeiro/novo?id=${lancamento.id}`)} />
              ) : null}

              {painel === null && (podePagar || lancamento.acoes.reabrir || lancamento.acoes.cancelar) ? (
                <View style={estilos.bloco}>
                  {podePagar ? <Botao titulo="Marcar como pago" onPress={() => { setMensagem(undefined); setPainel('pagamento'); }} /> : null}
                  {lancamento.acoes.reabrir ? <Botao titulo="Reabrir lançamento" variante="secundario" onPress={() => void aoReabrir()} carregando={executando} /> : null}
                  {lancamento.acoes.cancelar ? <Botao titulo="Cancelar lançamento" variante="perigo" onPress={() => { setMensagem(undefined); setPainel('cancelamento'); }} /> : null}
                </View>
              ) : null}

              {lancamento.checklist_id !== null ? (
                <Botao titulo="Ver checklist" variante="secundario" onPress={() => router.push(`/checklists/${lancamento.checklist_id}`)} />
              ) : null}

              <View style={estilos.bloco}>
                <ThemedText type="subtitle">Histórico</ThemedText>
                <Cartao style={estilos.historico}>
                  {lancamento.historico.map((evento, indice) => (
                    <LinhaDoHistorico key={`${evento.evento}-${evento.criado_em}-${indice}`} evento={evento} />
                  ))}
                </Cartao>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { padding: Spacing.three, paddingBottom: Spacing.five },
  coluna: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  bloco: { gap: Spacing.two },
  dados: { gap: Spacing.two },
  valorGrande: { fontFamily: Fontes.tituloNegrito, fontSize: 28, lineHeight: 34 },
  linha: { gap: 2 },
  rotulo: {},
  valor: { fontFamily: Fontes.corpoSemiNegrito },
  historico: { gap: Spacing.three },
});
