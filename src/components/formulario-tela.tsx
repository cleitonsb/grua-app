import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabecalhoTela } from '@/components/cabecalho-tela';
import { RodapeFixo, type RodapeFixoProps } from '@/components/rodape-fixo';
import { RolagemComTeclado } from '@/components/rolagem-com-teclado';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FormularioTelaProps {
  titulo: string;
  children: ReactNode;
  /** Padrão: voltar à tela anterior. */
  aoVoltar?: () => void;
  /** Rodapé fixo com as ações do formulário (ex.: Cancelar e Salvar). Sem ele, as ações ficam no conteúdo. */
  rodape?: RodapeFixoProps;
}

/** Moldura dos formulários: cabeçalho com voltar e título, rolagem com teclado, largura máxima e rodapé fixo opcional. */
export function FormularioTela({ titulo, children, aoVoltar, rodape }: FormularioTelaProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo={titulo}
        aoVoltar={aoVoltar ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.tela}>
        <RolagemComTeclado
          contentContainerStyle={[estilos.conteudo, { paddingBottom: rodape ? Spacing.four : Spacing.four + insets.bottom }]}
          keyboardShouldPersistTaps="handled">
          <View style={estilos.coluna}>{children}</View>
        </RolagemComTeclado>

        {rodape ? <RodapeFixo {...rodape} /> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, padding: Spacing.three },
  coluna: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
});
