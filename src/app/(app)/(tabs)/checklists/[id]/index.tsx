import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { Cartao } from '@/components/cartao';
import { ResumoChecklist } from '@/components/checklist/resumo-checklist';
import { SecaoAssinatura } from '@/components/checklist/secao-assinatura';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAssinatura } from '@/hooks/use-assinatura';
import { useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { useIniciarEntrega } from '@/hooks/use-iniciar-entrega';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Checklist } from '@/types/api';
import { formatarQuando } from '@/utils/formatadores';

const mensagemDeErro = (excecao: unknown) =>
  excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar o checklist.';

/** Detalhe somente leitura de um checklist. Em rascunho (do próprio motorista) permite continuar ou descartar. */
export default function ChecklistDetalheScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useSession();
  const [checklist, setChecklist] = useState<Checklist>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();
  const [descartando, setDescartando] = useState(false);
  const [erroDescarte, setErroDescarte] = useState<string>();
  const { iniciar: iniciarEntrega, iniciando: iniciandoEntrega, erro: erroEntrega } = useIniciarEntrega(id);
  const [atualizando, setAtualizando] = useState(false);
  const assinatura = useAssinatura(id, checklist !== undefined && checklist.status !== 'rascunho');
  const recarregarAssinatura = assinatura.recarregar;

  useEffect(() => {
    let ativo = true;

    api<Checklist>(`/checklists/${id}`)
      .then((resposta) => ativo && setChecklist(resposta))
      .catch((excecao) => ativo && setErro(mensagemDeErro(excecao)))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [id]);

  // Ao voltar de outra tela (ex.: depois de continuar o rascunho), mostra o que mudou.
  const recarregar = useCallback(async () => {
    try {
      setChecklist(await api<Checklist>(`/checklists/${id}`));
      setErro(undefined);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao));
    }
  }, [id]);

  useRecarregarAoFocar(recarregar);

  /** Puxar para atualizar: recarrega o checklist e a situação da assinatura. */
  const atualizar = useCallback(async () => {
    setAtualizando(true);
    await Promise.all([recarregar(), checklist && checklist.status !== 'rascunho' ? recarregarAssinatura() : undefined]);
    setAtualizando(false);
  }, [recarregar, recarregarAssinatura, checklist]);

  function voltar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/checklists');
    }
  }

  async function descartar() {
    setDescartando(true);
    setErroDescarte(undefined);

    try {
      await api(`/checklists/${id}`, { method: 'DELETE' });
      router.replace('/checklists');
    } catch (excecao) {
      setErroDescarte(excecao instanceof ApiError ? excecao.message : 'Não foi possível descartar o rascunho.');
    } finally {
      setDescartando(false);
    }
  }

  function confirmarDescarte() {
    Alert.alert('Descartar rascunho', 'O rascunho e as fotos dele serão apagados. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => void descartar() },
    ]);
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo={checklist ? `${checklist.tipo === 'entrega' ? 'Entrega' : 'Retirada'} #${checklist.id}` : 'Checklist'}
        subtitulo={checklist ? formatarQuando(checklist.enviado_em ?? checklist.created_at) : undefined}
        aoVoltar={voltar}
        acao={checklist ? <Selo tipo={checklist.status} /> : undefined}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.tela}>
        <ScrollView contentContainerStyle={estilos.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void atualizar()} />}>
          <View style={estilos.cartao}>
            {carregando ? <ActivityIndicator /> : null}

            {erro ? (
              <View style={estilos.bloco}>
                <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText>
                <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
              </View>
            ) : null}

            {checklist ? (
              <>
                <Cartao>
                  <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
                    {checklist.status === 'rascunho'
                      ? 'Ainda não foi enviado. Você pode continuar preenchendo.'
                      : checklist.status === 'assinado'
                        ? 'O cliente já assinou este checklist.'
                        : 'Concluído. Não pode mais ser alterado; a assinatura do cliente é opcional.'}
                  </ThemedText>
                </Cartao>

                {checklist.editavel ? (
                  <View style={estilos.bloco}>
                    <Botao titulo="Continuar" onPress={() => router.replace(`/checklists/${checklist.id}/editar`)} desabilitado={descartando} />
                    <Botao titulo="Descartar rascunho" variante="perigo" onPress={confirmarDescarte} carregando={descartando} />
                    {erroDescarte ? (
                      <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                        {erroDescarte}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}

                {checklist.tipo === 'retirada' && checklist.status !== 'rascunho' && usuario?.papel === 'motorista' ? (
                  <View style={estilos.bloco}>
                    <Botao
                      titulo={checklist.entrega ? 'Abrir entrega' : 'Iniciar entrega'}
                      onPress={() => (checklist.entrega ? router.push(`/checklists/${checklist.entrega.id}`) : void iniciarEntrega())}
                      carregando={iniciandoEntrega}
                    />
                    {erroEntrega ? (
                      <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                        {erroEntrega}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}

                {checklist.status !== 'rascunho' ? (
                  <SecaoAssinatura checklist={checklist} assinatura={assinatura} podeAgir={usuario?.papel === 'motorista'} />
                ) : null}

                <ResumoChecklist checklist={checklist} />
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, padding: Spacing.three },
  cartao: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  bloco: { gap: Spacing.two },
});
