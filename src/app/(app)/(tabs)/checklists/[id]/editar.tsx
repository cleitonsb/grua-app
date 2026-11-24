import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { TITULOS_DOS_PASSOS, TOTAL_DE_PASSOS, textoDoPasso } from '@/components/checklist/indicador-passos';
import { PassoAvarias } from '@/components/checklist/passo-avarias';
import { PassoDados } from '@/components/checklist/passo-dados';
import { PassoItens } from '@/components/checklist/passo-itens';
import { PassoResumo } from '@/components/checklist/passo-resumo';
import { SalvamentoStatus } from '@/components/checklist/salvamento-status';
import { RodapeFixo } from '@/components/rodape-fixo';
import { RolagemComTeclado } from '@/components/rolagem-com-teclado';
import { ThemedText } from '@/components/themed-text';
import { Alturas, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChecklist, type CamposDoChecklist } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';
import { useAssinatura } from '@/hooks/use-assinatura';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api';
import type { Checklist, Faltante } from '@/types/api';
import { validarPasso, type ErrosDoPasso } from '@/utils/checklist';

/** Fluxo de preenchimento em 4 passos. Depois do envio (ou para quem só consulta), mostra o resumo somente leitura. */
export default function EditarChecklistScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    checklist,
    carregando,
    erro,
    estadoSalvamento,
    mensagemDeErro,
    aviso,
    limparAviso,
    alterar,
    descarregar,
    enviar,
    adicionarAvaria,
    alterarAvaria,
    removerAvaria,
    removerFoto,
    salvarItem,
    descartar,
  } = useChecklist(id);

  const { usuario } = useSession();
  const assinatura = useAssinatura(id, checklist !== undefined && checklist.status !== 'rascunho');
  const podeAgir = usuario?.papel === 'motorista';

  const rolagem = useRef<ScrollViewInstance>(null);
  const [passoEscolhido, setPasso] = useState<number>();
  const [erros, setErros] = useState<ErrosDoPasso>({});
  const [faltantes, setFaltantes] = useState<Faltante[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string>();
  const [descartando, setDescartando] = useState(false);
  const [erroDescarte, setErroDescarte] = useState<string>();
  // Depois de enviar nesta tela, ela segue mostrando o resultado (status e avisos); aberta de fora, vai ao detalhe.
  const [enviadoAgora, setEnviadoAgora] = useState(false);

  // Abre no passo em que o motorista parou; depois é ele quem navega.
  const passo = passoEscolhido ?? checklist?.passo_atual ?? 1;

  const editar = useCallback(
    (campos: CamposDoChecklist, local?: Partial<Checklist>) => {
      setErros({});
      alterar(campos, local);
    },
    [alterar],
  );

  function irParaPasso(novo: number) {
    setPasso(novo);
    alterar({ passo_atual: novo });
    rolagem.current?.scrollTo({ y: 0, animated: true });
  }

  function continuar() {
    if (!checklist) return;

    const pendencias = validarPasso(passo, checklist);

    if (Object.keys(pendencias).length > 0) {
      setErros(pendencias);

      return;
    }

    setErros({});
    irParaPasso(passo + 1);
  }

  /** Conclui o checklist (imutável) e abre a tela em que o cliente assina, se quiser (a assinatura é opcional). */
  async function concluir() {
    setEnviando(true);
    setErroEnvio(undefined);
    setFaltantes([]);

    try {
      const resposta = await enviar();

      setAvisos(resposta.avisos);
      setEnviadoAgora(true);
      router.replace(`/checklists/${id}/assinar`);
    } catch (excecao) {
      if (excecao instanceof ApiError && excecao.status === 422 && excecao.corpo?.faltantes) {
        setFaltantes(excecao.corpo.faltantes);
      }

      setErroEnvio(excecao instanceof ApiError ? excecao.message : 'Não foi possível enviar o checklist. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  async function descartarRascunho() {
    setDescartando(true);
    setErroDescarte(undefined);

    try {
      await descartar();
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
      { text: 'Descartar', style: 'destructive', onPress: () => void descartarRascunho() },
    ]);
  }

  async function sair() {
    await descarregar();

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/checklists');
    }
  }

  const editavel = checklist?.editavel ?? false;

  if (checklist && !editavel && !enviadoAgora) {
    return <Redirect href={`/checklists/${checklist.id}`} />;
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo={checklist && editavel ? TITULOS_DOS_PASSOS[passo] : checklist ? 'Resumo e envio' : 'Checklist'}
        subtitulo={checklist && editavel ? textoDoPasso(checklist.tipo, passo) : undefined}
        aoVoltar={sair}
        acao={editavel ? <SalvamentoStatus estado={estadoSalvamento} mensagem={mensagemDeErro} /> : undefined}
        passo={checklist && editavel ? { atual: passo, total: TOTAL_DE_PASSOS } : undefined}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.tela}>
        <RolagemComTeclado ref={rolagem} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.cartao}>
            {carregando ? <ActivityIndicator /> : null}

            {erro ? (
              <View style={estilos.bloco}>
                <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText>
                <Botao titulo="Voltar" variante="secundario" onPress={sair} />
              </View>
            ) : null}

            {aviso ? (
              <View style={[estilos.aviso, { backgroundColor: theme.alertaFundo }]} accessibilityLiveRegion="polite">
                <ThemedText type="small" style={{ color: theme.alerta }}>
                  {aviso}
                </ThemedText>
                <Pressable accessibilityRole="button" onPress={limparAviso} style={estilos.entendi}>
                  <ThemedText type="smallBold" style={{ color: theme.alerta }}>
                    Entendi
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {checklist && editavel ? (
              <>
                {passo === 1 ? <PassoDados checklist={checklist} alterar={editar} erros={erros} /> : null}
                {passo === 2 ? (
                  <PassoAvarias
                    checklist={checklist}
                    alterar={editar}
                    adicionarAvaria={adicionarAvaria}
                    alterarAvaria={alterarAvaria}
                    removerAvaria={removerAvaria}
                    removerFoto={removerFoto}
                    onAbrirFotos={(avariaId) => router.push(`/checklists/${id}/foto?avaria=${avariaId}`)}
                  />
                ) : null}
                {passo === 3 ? (
                  <PassoItens
                    checklist={checklist}
                    alterar={editar}
                    erros={erros}
                    salvarItem={salvarItem}
                    onAbrirItem={(item) => router.push(`/checklists/${id}/foto?item=${item}`)}
                  />
                ) : null}
                {passo === 4 ? (
                  <PassoResumo
                    checklist={checklist}
                    faltantes={faltantes}
                    avisos={avisos}
                    erroEnvio={erroEnvio}
                    assinatura={assinatura}
                    podeAgir={podeAgir}
                    onIrParaPasso={irParaPasso}
                  />
                ) : null}

                {checklist.status === 'rascunho' ? (
                  <View style={estilos.bloco}>
                    <Botao titulo="Descartar rascunho" variante="perigo" onPress={confirmarDescarte} carregando={descartando} desabilitado={enviando} />
                    {erroDescarte ? (
                      <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                        {erroDescarte}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

            {checklist && !editavel ? (
              <PassoResumo checklist={checklist} faltantes={[]} avisos={avisos} assinatura={assinatura} podeAgir={podeAgir} onIrParaPasso={() => undefined} />
            ) : null}
          </View>
        </RolagemComTeclado>

        {/* Rodapé fixo: Voltar e Continuar nos passos 1 a 3; Voltar e concluir no passo 4; Fechar depois. */}
        {checklist && editavel && passo < TOTAL_DE_PASSOS ? (
          <RodapeFixo
            secundario={passo > 1 ? { titulo: 'Voltar', aoTocar: () => irParaPasso(passo - 1) } : undefined}
            principal={{ titulo: passo === TOTAL_DE_PASSOS - 1 ? 'Revisar e enviar' : 'Continuar', aoTocar: continuar }}
          />
        ) : null}
        {checklist && editavel && passo === TOTAL_DE_PASSOS ? (
          <RodapeFixo
            secundario={{ titulo: 'Voltar', aoTocar: () => irParaPasso(passo - 1), desabilitado: enviando }}
            principal={{ titulo: checklist.tipo === 'entrega' ? 'Concluir entrega' : 'Concluir retirada', aoTocar: concluir, carregando: enviando }}
          />
        ) : null}
        {checklist && !editavel ? (
          <RodapeFixo
            principal={{ titulo: checklist.status === 'rascunho' ? 'Fechar' : 'Concluir', aoTocar: () => router.replace('/') }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, padding: Spacing.three },
  cartao: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  bloco: { gap: Spacing.three },
  aviso: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  entendi: { minHeight: Alturas.alvoMinimo, justifyContent: 'center', alignSelf: 'flex-start' },
});
