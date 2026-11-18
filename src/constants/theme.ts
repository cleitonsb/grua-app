/**
 * Identidade visual do GuinchoCheck, conforme o protótipo aprovado (spec 005). Há uma única aparência, clara: o
 * protótipo não tem tema escuro. Os valores e o contraste de cada par estão em
 * specs/005-identidade-visual-prototipo/data-model.md e são verificados por verificacao/contraste.mjs.
 */

import { Platform } from 'react-native';

export const Colors = {
  // Chaves que já existiam (mesmos nomes, valores do protótipo)
  text: '#101828',
  textSecondary: '#475467',
  /** Fundo das telas. */
  background: '#F3F4F6',
  /** Superfície de cartões, campos e linhas de lista. */
  backgroundElement: '#FFFFFF',
  /** Selecionado, miniatura vazia, avatar das listas. */
  backgroundSelected: '#E8EEF4',
  /** Âmbar: botão principal, aba e pílula ativas, indicador de passo, contador de foto. */
  primary: '#F5A300',
  /** Texto sobre o âmbar: sempre escuro (branco sobre âmbar tem só 2,1:1). */
  primaryText: '#101828',
  danger: '#B42318',

  // Chaves novas
  /** Texto e ícones sobre azul-marinho, sobre o botão de perigo e sobre marcadores escuros. */
  branco: '#FFFFFF',
  /** Cabeçalhos, caixa marcada, botão escuro, texto da aba ativa. */
  marinho: '#0F2A43',
  /** Fundo da tela de foto. */
  marinhoProfundo: '#06182A',
  /** Trilha da barra de passos e pílula inativa, sobre o cabeçalho. */
  trilha: '#1E3F5E',
  /** Subtítulos e texto secundário sobre o cabeçalho. */
  textoSobreMarinho: '#C9D6E2',
  /** Borda de cartão e separadores. */
  borda: '#E3E6EB',
  /** Borda de campo e de botão secundário. */
  bordaCampo: '#D0D5DD',
  /** Placeholder e aba inativa. O protótipo usa #98A2B3 (2,6:1); aqui #667085 (5,0:1), desvio D6 da spec. */
  placeholder: '#667085',
  sucesso: '#067647',
  sucessoFundo: '#ECFDF3',
  alerta: '#93370D',
  alertaFundo: '#FEF0C7',
  /** Fundo dos selos "Inativo" e "Rascunho". */
  neutroFundo: '#F2F4F7',
} as const;

export type ThemeColor = keyof typeof Colors;

/**
 * Famílias carregadas no layout raiz (useFonts). O peso é escolhido pela família, não por `fontWeight`: com fontes
 * estáticas, `fontWeight` faria o Android engrossar uma face que já é negrito.
 */
export const Fontes = {
  corpo: 'Inter_400Regular',
  corpoSemiNegrito: 'Inter_600SemiBold',
  corpoNegrito: 'Inter_700Bold',
  titulo: 'SpaceGrotesk_600SemiBold',
  tituloNegrito: 'SpaceGrotesk_700Bold',
} as const;

/** Só o tipo `code` do `ThemedText` usa uma fonte monoespaçada. */
export const Fonts = {
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
};

export const Raios = {
  cartao: 14,
  campo: 12,
  pequeno: 8,
  pilula: 999,
} as const;

export const Alturas = {
  campo: 48,
  botaoPrincipal: 52,
  alvoMinimo: 44,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
