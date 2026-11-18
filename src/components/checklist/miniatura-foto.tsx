import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Raios, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cabecalhosAutenticados, urlDaApi } from '@/services/api';
import type { FotoChecklist } from '@/types/api';

const TAMANHO_PADRAO = 88;

/** As fotos ficam em disco privado: a imagem só abre com o cabeçalho de autenticação da sessão. */
function fonteDaFoto(caminho: string) {
  return { uri: urlDaApi(caminho), headers: cabecalhosAutenticados() };
}

/**
 * Botão vermelho "x" no canto da miniatura. O círculo é de 24 pt e a área de toque se estende a 44 pt. Fica por cima
 * da miniatura, sem fazer parte do botão de ampliar.
 */
function BotaoRemover({ aoRemover }: { aoRemover: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Remover foto"
      hitSlop={10}
      onPress={aoRemover}
      style={[estilos.remover, { backgroundColor: theme.danger, borderColor: theme.backgroundElement }]}>
      <Icone nome="fechar" tamanho={14} cor={theme.branco} />
    </Pressable>
  );
}

/**
 * Miniatura de uma foto já enviada. Tocar abre a foto ampliada (`FotoAmpliada`). Com `aoRemover`, mostra o "x"
 * vermelho no canto; a confirmação da remoção é de quem chama.
 */
export function MiniaturaFoto({
  foto,
  tamanho = TAMANHO_PADRAO,
  onPress,
  aoRemover,
}: {
  foto: FotoChecklist;
  tamanho?: number;
  onPress?: () => void;
  aoRemover?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Foto. Toque para ampliar."
        onPress={onPress}
        style={[estilos.miniatura, { width: tamanho, height: tamanho, backgroundColor: theme.backgroundSelected }]}>
        <Image
          source={fonteDaFoto(foto.miniatura_url)}
          style={estilos.imagem}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
        />
      </Pressable>

      {aoRemover ? <BotaoRemover aoRemover={aoRemover} /> : null}
    </View>
  );
}

/** Foto que ainda está sendo enviada, ou que falhou e pode ser reenviada (mantém o mesmo identificador). */
export function MiniaturaLocal({
  uri,
  estado,
  mensagem,
  onTentarDeNovo,
  tamanho = TAMANHO_PADRAO,
}: {
  uri: string;
  estado: 'enviando' | 'erro';
  mensagem?: string;
  onTentarDeNovo: () => void;
  tamanho?: number;
}) {
  const theme = useTheme();

  return (
    <View style={estilos.localBloco}>
      <View style={[estilos.miniatura, { width: tamanho, height: tamanho, backgroundColor: theme.backgroundSelected }]}>
        <Image source={{ uri }} style={[estilos.imagem, estilos.local]} contentFit="cover" />
        <View style={estilos.sobreposicao}>{estado === 'enviando' ? <ActivityIndicator color={theme.marinho} /> : null}</View>
      </View>

      {estado === 'erro' ? (
        <Pressable accessibilityRole="button" onPress={onTentarDeNovo} style={{ width: tamanho, minHeight: Alturas.alvoMinimo }}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            {mensagem ?? 'Não enviada.'}
          </ThemedText>
          <ThemedText type="smallBold">Tentar de novo</ThemedText>
        </Pressable>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={{ width: tamanho }}>
          Enviando...
        </ThemedText>
      )}
    </View>
  );
}

/** Foto em tela cheia, com a opção de removê-la (só quando o checklist ainda é rascunho). */
export function FotoAmpliada({
  foto,
  onFechar,
  onRemover,
}: {
  foto?: FotoChecklist;
  onFechar: () => void;
  onRemover?: (foto: FotoChecklist) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  function confirmarRemocao() {
    if (!foto || !onRemover) return;

    Alert.alert('Remover foto', 'A foto será apagada deste checklist. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          onRemover(foto);
          onFechar();
        },
      },
    ]);
  }

  return (
    <Modal visible={foto !== undefined} animationType="fade" onRequestClose={onFechar}>
      <View style={[estilos.ampliada, { backgroundColor: theme.marinhoProfundo, paddingTop: insets.top }]}>
        {foto ? <Image source={fonteDaFoto(foto.arquivo_url)} style={estilos.ampliadaImagem} contentFit="contain" /> : null}

        <View style={[estilos.acoes, { paddingBottom: Spacing.three + insets.bottom }]}>
          {onRemover ? <Botao titulo="Remover foto" variante="perigo" onPress={confirmarRemocao} /> : null}
          <Botao titulo="Fechar" variante="secundario" onPress={onFechar} />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  miniatura: { borderRadius: Raios.campo, overflow: 'hidden' },
  imagem: { width: '100%', height: '100%' },
  local: { opacity: 0.6 },
  localBloco: { gap: Spacing.one },
  sobreposicao: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  remover: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampliada: { flex: 1 },
  ampliadaImagem: { flex: 1, margin: Spacing.three },
  acoes: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
});
