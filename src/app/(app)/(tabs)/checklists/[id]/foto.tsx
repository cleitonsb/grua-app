import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { CampoFormulario } from '@/components/campo-formulario';
import { FotoAmpliada, MiniaturaFoto, MiniaturaLocal } from '@/components/checklist/miniatura-foto';
import { FormularioTela } from '@/components/formulario-tela';
import { Icone } from '@/components/icone';
import { RolagemComTeclado } from '@/components/rolagem-com-teclado';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Spacing } from '@/constants/theme';
import { useCatalogo } from '@/hooks/use-catalogo';
import { useChecklist } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import { capturarFoto, prepararFoto, type ArquivosDaFoto, type OrigemDaFoto } from '@/services/fotos';
import type { FotoChecklist } from '@/types/api';
import { ITEM_OUTROS } from '@/utils/checklist';
import { gerarUuid } from '@/utils/uuid';

const LIMITE_PADRAO_DE_FOTOS = 10;

interface FotoLocal {
  /** Identificador da foto (o `client_uuid`): o mesmo em todas as tentativas de envio. */
  chave: string;
  arquivos: ArquivosDaFoto;
  estado: 'enviando' | 'erro';
  mensagem?: string;
}

/**
 * Fotos de uma avaria (parâmetro `avaria`) ou de um item (parâmetro `item`, com observação). Tirar ou escolher a
 * foto, reduzi-la no aparelho e enviá-la; as já enviadas podem ser ampliadas e removidas.
 */
export default function FotoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id, avaria: avariaParam, item: itemParam } = useLocalSearchParams<{ id: string; avaria?: string; item?: string }>();
  const { checklist, carregando, erro, adicionarFoto, removerFoto, salvarItem } = useChecklist(id);
  const { catalogo } = useCatalogo();

  const [locais, setLocais] = useState<FotoLocal[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [semPermissao, setSemPermissao] = useState<string>();
  const [erroDaTela, setErroDaTela] = useState<string>();
  const [ampliada, setAmpliada] = useState<FotoChecklist>();
  // Observação digitada e ainda não salva (undefined = nada digitado: vale a do servidor).
  const [observacaoDigitada, setObservacaoDigitada] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [itemSalvo, setItemSalvo] = useState(false);

  const avariaId = avariaParam ? Number(avariaParam) : undefined;
  const avaria = checklist?.avarias.find((atual) => atual.id === avariaId);
  const item = itemParam ? checklist?.itens.find((atual) => atual.item === itemParam) : undefined;
  const alvoExiste = itemParam ? item !== undefined : avaria !== undefined;
  const fotosDoAlvo = (itemParam ? item?.fotos : avaria?.fotos) ?? [];
  const podeFotografar = itemParam ? item?.presente === true : true;
  const observacao = observacaoDigitada ?? item?.observacao ?? '';
  const exigeDescricao = itemParam === ITEM_OUTROS;
  const editavel = checklist?.editavel ?? false;
  const limite = (itemParam ? catalogo?.limites.fotos_por_item : catalogo?.limites.fotos_por_avaria) ?? LIMITE_PADRAO_DE_FOTOS;
  const total = fotosDoAlvo.length + locais.length;
  const noLimite = total >= limite;

  async function enviar(chave: string, arquivos: ArquivosDaFoto) {
    const alvo = itemParam ? { item: itemParam } : avariaId !== undefined ? { avariaId } : undefined;

    if (!alvo) return;

    setLocais((atuais) => atuais.map((foto) => (foto.chave === chave ? { ...foto, estado: 'enviando', mensagem: undefined } : foto)));

    try {
      await adicionarFoto(alvo, arquivos, chave);
      setLocais((atuais) => atuais.filter((foto) => foto.chave !== chave));
    } catch (excecao) {
      const mensagem = excecao instanceof ApiError ? excecao.message : 'Não foi possível enviar a foto.';

      setLocais((atuais) => atuais.map((foto) => (foto.chave === chave ? { ...foto, estado: 'erro', mensagem } : foto)));
    }
  }

  async function adicionar(origem: OrigemDaFoto) {
    setErroDaTela(undefined);
    setSemPermissao(undefined);
    setPreparando(true);

    try {
      const captura = await capturarFoto(origem);

      if (captura.situacao === 'sem-permissao') {
        setSemPermissao(captura.mensagem);

        return;
      }

      if (captura.situacao === 'cancelada') {
        return;
      }

      const arquivos = await prepararFoto(captura.uri);
      const chave = gerarUuid();

      setLocais((atuais) => [...atuais, { chave, arquivos, estado: 'enviando' }]);
      setPreparando(false);

      await enviar(chave, arquivos);
    } catch {
      setErroDaTela('Não foi possível preparar a foto. Tente de novo.');
    } finally {
      setPreparando(false);
    }
  }

  async function remover(foto: FotoChecklist) {
    try {
      await removerFoto(foto.id);
    } catch (excecao) {
      setErroDaTela(excecao instanceof ApiError ? excecao.message : 'Não foi possível remover a foto.');
    }
  }

  /** Grava o item como presente, com a observação digitada. Devolve se deu certo. */
  async function salvar(): Promise<boolean> {
    if (!itemParam) return true;

    if (exigeDescricao && observacao.trim() === '') {
      setErroDaTela('Descreva o item "Outros".');

      return false;
    }

    setSalvando(true);
    setErroDaTela(undefined);

    try {
      await salvarItem(itemParam, true, observacao.trim() === '' ? null : observacao.trim());
      setObservacaoDigitada(undefined);
      setItemSalvo(true);

      return true;
    } catch (excecao) {
      setErroDaTela(excecao instanceof ApiError ? excecao.message : 'Não foi possível salvar o item.');

      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function concluir() {
    // Observação digitada e não salva: grava antes de sair, para não perder o texto.
    if (itemParam && observacaoDigitada !== undefined && (item?.presente || observacao.trim() !== '')) {
      if (!(await salvar())) return;
    }

    router.back();
  }

  if (carregando) {
    return (
      <FormularioTela titulo="Fotos">
        <ActivityIndicator />
      </FormularioTela>
    );
  }

  if (erro || !checklist || !alvoExiste) {
    return (
      <FormularioTela titulo="Fotos">
        <ThemedText style={{ color: theme.danger }}>{erro ?? 'Este registro não existe mais neste checklist.'}</ThemedText>
        <Botao titulo="Voltar" variante="secundario" onPress={() => router.back()} />
      </FormularioTela>
    );
  }

  const nome = item ? item.rotulo : (avaria?.parte_rotulo ?? '');
  const podeAdicionar = editavel && podeFotografar;
  const bloqueado = noLimite || preparando;

  /** O "x" da miniatura pede a mesma confirmação que a foto ampliada. */
  function confirmarRemocao(foto: FotoChecklist) {
    Alert.alert('Remover foto', 'A foto será apagada deste checklist. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void remover(foto) },
    ]);
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.marinhoProfundo }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.tela}>
        <RolagemComTeclado contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={[estilos.escuro, { paddingTop: insets.top + Spacing.three }]}>
            <View style={estilos.topo}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={() => void concluir()}
                disabled={salvando}
                hitSlop={8}
                style={estilos.fechar}>
                <Icone nome="fechar" cor={theme.branco} />
              </Pressable>
              <View style={estilos.titulos}>
                <ThemedText style={[estilos.pequeno, { color: theme.textoSobreMarinho }]}>
                  {itemParam ? 'Item do checklist' : 'Avaria do checklist'}
                </ThemedText>
                <ThemedText accessibilityRole="header" style={[estilos.titulo, { color: theme.branco }]}>
                  {nome}
                </ThemedText>
              </View>
            </View>

            {podeAdicionar ? (
              <View style={estilos.camera}>
                <ThemedText style={[estilos.dica, { color: theme.textoSobreMarinho }]}>
                  Enquadre {itemParam ? 'o item' : 'a avaria'} e toque no botão para fotografar.
                </ThemedText>

                <View style={estilos.botoes}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Escolher da galeria"
                    accessibilityState={{ disabled: bloqueado }}
                    disabled={bloqueado}
                    onPress={() => void adicionar('galeria')}
                    style={[estilos.galeria, { backgroundColor: theme.trilha }, bloqueado && estilos.desabilitado]}>
                    <Icone nome="galeria" cor={theme.branco} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tirar foto"
                    accessibilityState={{ disabled: noLimite, busy: preparando }}
                    disabled={noLimite || preparando}
                    onPress={() => void adicionar('camera')}
                    style={[estilos.aro, { borderColor: theme.branco }, noLimite && estilos.desabilitado]}>
                    <View style={[estilos.captura, { backgroundColor: theme.primary }]}>
                      {preparando ? <ActivityIndicator color={theme.primaryText} /> : null}
                    </View>
                  </Pressable>

                  <View style={estilos.galeria} />
                </View>
              </View>
            ) : (
              <ThemedText style={[estilos.dica, { color: theme.textoSobreMarinho }]}>
                {itemParam && editavel ? 'Salve o item para anexar fotos.' : 'As fotos deste registro são só para consulta.'}
              </ThemedText>
            )}
          </View>

          <View style={[estilos.painel, { backgroundColor: theme.backgroundElement, paddingBottom: Spacing.four + insets.bottom }]}>
            <View style={estilos.tituloDoPainel}>
              <ThemedText type="subtitle">{itemParam ? 'Fotos deste item' : 'Fotos desta avaria'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {total} de {limite} fotos
              </ThemedText>
            </View>

            {fotosDoAlvo.length === 0 && locais.length === 0 ? (
              <ThemedText themeColor="textSecondary">Nenhuma foto ainda.</ThemedText>
            ) : (
              <View style={estilos.fotos}>
                {fotosDoAlvo.map((foto) => (
                  <MiniaturaFoto
                    key={foto.id}
                    foto={foto}
                    onPress={() => setAmpliada(foto)}
                    aoRemover={editavel ? () => confirmarRemocao(foto) : undefined}
                  />
                ))}
                {locais.map((foto) => (
                  <MiniaturaLocal
                    key={foto.chave}
                    uri={foto.arquivos.miniatura.uri}
                    estado={foto.estado}
                    mensagem={foto.mensagem}
                    onTentarDeNovo={() => void enviar(foto.chave, foto.arquivos)}
                  />
                ))}
              </View>
            )}

            {semPermissao ? (
              <View style={estilos.bloco}>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {semPermissao}
                </ThemedText>
                <Botao titulo="Abrir ajustes do aparelho" variante="secundario" onPress={() => void Linking.openSettings()} />
              </View>
            ) : null}

            {erroDaTela ? (
              <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                {erroDaTela}
              </ThemedText>
            ) : null}

            {noLimite ? (
              <ThemedText type="small" themeColor="textSecondary">
                Você atingiu o limite de {limite} fotos {itemParam ? 'neste item' : 'nesta avaria'}.
              </ThemedText>
            ) : null}

            {item && editavel ? (
              <>
                <CampoFormulario
                  rotulo={exigeDescricao ? 'Descrição do item (obrigatória)' : 'Observação do item'}
                  placeholder="Ex.: falta uma calota na roda traseira esquerda"
                  value={observacao}
                  onChangeText={(texto) => {
                    setObservacaoDigitada(texto);
                    setItemSalvo(false);
                  }}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  autoCapitalize="sentences"
                />
                <Botao titulo="Salvar item" onPress={() => void salvar()} carregando={salvando} />
                {itemSalvo ? (
                  <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
                    Item salvo.
                  </ThemedText>
                ) : null}
              </>
            ) : null}

            {item && !editavel && item.observacao ? <ThemedText>{item.observacao}</ThemedText> : null}

            {!itemParam || !editavel ? (
              <Botao titulo={editavel ? 'Concluir' : 'Fechar'} onPress={() => void concluir()} desabilitado={salvando} />
            ) : null}
          </View>
        </RolagemComTeclado>
      </KeyboardAvoidingView>

      <FotoAmpliada foto={ampliada} onFechar={() => setAmpliada(undefined)} onRemover={editavel ? (foto) => void remover(foto) : undefined} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1 },
  escuro: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.three },
  topo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  fechar: { width: Alturas.alvoMinimo, height: Alturas.alvoMinimo, marginLeft: -Spacing.two, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, gap: 2 },
  pequeno: { fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 18 },
  titulo: { fontFamily: Fontes.tituloNegrito, fontSize: 22, lineHeight: 28 },
  camera: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  dica: { fontFamily: Fontes.corpo, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  botoes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.five },
  galeria: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  aro: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  captura: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  desabilitado: { opacity: 0.4 },
  painel: {
    flexGrow: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  tituloDoPainel: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  bloco: { gap: Spacing.two },
});
