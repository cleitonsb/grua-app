import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { Cartao } from '@/components/cartao';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { useIniciarEntrega } from '@/hooks/use-iniciar-entrega';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Checklist, SituacaoDaOperacao } from '@/types/api';
import { formatarValorOuIndefinido } from '@/utils/dinheiro';
import { ROTULO_DA_FORMA, ROTULO_DA_SITUACAO } from '@/utils/financeiro';
import { formatarCpfCnpj, formatarPlaca, formatarQuando, formatarTelefone, nomeDoCliente } from '@/utils/formatadores';
import { isoParaData } from '@/utils/periodo';

/**
 * Detalhe de uma operação: retirada e entrega são uma operação só, com um único financeiro. O `id` da rota é o da
 * retirada. Mostra a placa, os dados do cliente, o financeiro e os botões dos dois checklists.
 */
export default function OperacaoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useSession();
  const [retirada, setRetirada] = useState<Checklist>();
  const [erro, setErro] = useState<string>();
  const [atualizando, setAtualizando] = useState(false);
  const entrega = useIniciarEntrega(id);

  const carregar = useCallback(async () => {
    try {
      setRetirada(await api<Checklist>(`/checklists/${id}`));
      setErro(undefined);
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar a operação.');
    }
  }, [id]);

  // Carregamento inicial: o estado só muda quando a resposta chega.
  useEffect(() => {
    let ativo = true;

    api<Checklist>(`/checklists/${id}`)
      .then((resposta) => ativo && setRetirada(resposta))
      .catch((excecao) => ativo && setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar a operação.'));

    return () => {
      ativo = false;
    };
  }, [id]);

  useRecarregarAoFocar(carregar);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  const motorista = usuario?.papel === 'motorista';
  const cliente = retirada?.cliente;
  const lancamento = retirada?.lancamento;
  const situacao: SituacaoDaOperacao | undefined = retirada
    ? lancamento?.situacao === 'pago'
      ? 'pago'
      : retirada.status === 'assinado' || retirada.entrega?.status === 'assinado'
        ? 'assinado'
        : 'concluido'
    : undefined;

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo={retirada?.placa ? formatarPlaca(retirada.placa) : 'Operação'}
        subtitulo={retirada ? formatarQuando(retirada.enviado_em ?? retirada.created_at) : undefined}
        aoVoltar={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        acao={situacao ? <Selo tipo={situacao} /> : undefined}
      />

      <ScrollView contentContainerStyle={estilos.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void atualizar()} />}>
        <View style={estilos.coluna}>
          {!retirada && !erro ? <ActivityIndicator /> : null}
          {erro ? <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText> : null}

          {retirada ? (
            <>
              <Secao titulo="Veículo">
                <Linha rotulo="Placa" valor={retirada.placa ? formatarPlaca(retirada.placa) : 'Não informada'} />
              </Secao>

              <Secao titulo="Cliente">
                {cliente ? (
                  <>
                    <Linha rotulo="Nome" valor={nomeDoCliente(cliente.nome)} />
                    <Linha rotulo="CPF/CNPJ" valor={formatarCpfCnpj(cliente.documento) || 'Não informado'} />
                    <Linha rotulo="Telefone" valor={formatarTelefone(cliente.telefone) || 'Não informado'} />
                    <Linha rotulo="E-mail" valor={cliente.email_assinatura || 'Não informado'} />
                  </>
                ) : (
                  <Linha rotulo="Cliente" valor="Não informado" />
                )}
              </Secao>

              <Secao titulo="Financeiro">
                <Linha rotulo="Valor" valor={formatarValorOuIndefinido(lancamento ? lancamento.valor_centavos : retirada.valor_centavos)} />
                <Linha
                  rotulo="Forma de pagamento"
                  valor={(lancamento?.forma_pagamento ?? retirada.forma_pagamento) ? ROTULO_DA_FORMA[(lancamento?.forma_pagamento ?? retirada.forma_pagamento)!] : 'A definir'}
                />
                <Linha rotulo="Situação" valor={lancamento ? ROTULO_DA_SITUACAO[lancamento.situacao] : 'A receber'} />
                {lancamento?.pago_em ? <Linha rotulo="Pago em" valor={isoParaData(lancamento.pago_em)} /> : null}
                {usuario?.papel === 'administrador' && lancamento ? (
                  <Botao titulo="Abrir no Financeiro" variante="secundario" onPress={() => router.push(`/financeiro/${lancamento.id}`)} />
                ) : null}
              </Secao>

              <Secao titulo="Checklists">
                <Botao titulo="Checklist de retirada" onPress={() => router.push(`/checklists/${retirada.id}`)} />
                {retirada.entrega ? (
                  <Botao titulo="Checklist de entrega" onPress={() => router.push(`/checklists/${retirada.entrega!.id}`)} />
                ) : motorista ? (
                  <Botao titulo="Iniciar checklist de entrega" carregando={entrega.iniciando} onPress={() => void entrega.iniciar()} />
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    A entrega ainda não foi iniciada.
                  </ThemedText>
                )}
                {entrega.erro ? (
                  <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                    {entrega.erro}
                  </ThemedText>
                ) : null}
              </Secao>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.secao}>
      <ThemedText type="subtitle">{titulo}</ThemedText>
      <Cartao style={estilos.cartao}>{children}</Cartao>
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold" style={estilos.valor}>
        {valor}
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, padding: Spacing.three },
  coluna: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  secao: { gap: Spacing.two },
  cartao: { gap: Spacing.two },
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  valor: { flexShrink: 1, textAlign: 'right' },
});
