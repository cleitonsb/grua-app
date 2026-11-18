import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { CampoFormulario } from '@/components/campo-formulario';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Fontes, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { entrar, ultimoUsuario } = useSession();

  const [usuario, setUsuario] = useState(ultimoUsuario ?? '');
  const [senha, setSenha] = useState('');
  const [erroGeral, setErroGeral] = useState<string>();
  const [erros, setErros] = useState<{ usuario?: string; senha?: string }>({});
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    const novosErros = {
      usuario: usuario.trim() ? undefined : 'Informe o usuário.',
      senha: senha ? undefined : 'Informe a senha.',
    };

    setErros(novosErros);
    setErroGeral(undefined);

    if (novosErros.usuario || novosErros.senha) {
      return;
    }

    setCarregando(true);

    try {
      const logado = await entrar(usuario, senha);
      router.replace(logado.deve_trocar_senha ? '/trocar-senha' : '/');
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 422) {
        setErros({ usuario: erro.erroDoCampo('usuario'), senha: erro.erroDoCampo('senha') });
      } else {
        setErroGeral(erro instanceof ApiError ? erro.message : 'Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.marinho }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.tela}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={[estilos.topo, { paddingTop: insets.top + Spacing.six }]}>
            <View style={estilos.topoInterno}>
              <View style={[estilos.icone, { backgroundColor: theme.primary }]}>
                <Icone nome="guincho" tamanho={40} cor={theme.marinho} />
              </View>
              <ThemedText accessibilityRole="header" style={[estilos.nome, { color: theme.branco }]}>
                GuinchoCheck
              </ThemedText>
              <ThemedText style={[estilos.apresentacao, { color: theme.textoSobreMarinho }]}>
                Checklist de retirada e entrega de veículos, com fotos e assinatura do cliente.
              </ThemedText>
            </View>
          </View>

          <View style={[estilos.painel, { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + Spacing.four }]}>
            <View style={estilos.painelInterno}>
              <ThemedText type="title">Entrar</ThemedText>

              <CampoFormulario
                rotulo="Usuário"
                value={usuario}
                onChangeText={setUsuario}
                erro={erros.usuario}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
              />

              <CampoFormulario
                rotulo="Senha"
                value={senha}
                onChangeText={setSenha}
                erro={erros.senha}
                secureTextEntry
                alternarVisibilidade
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={enviar}
              />

              {erroGeral ? (
                <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                  {erroGeral}
                </ThemedText>
              ) : null}

              <Botao titulo="Entrar" onPress={enviar} carregando={carregando} />

              <ThemedText type="small" themeColor="textSecondary" style={estilos.aviso}>
                Só usuários cadastrados pelo administrador conseguem acessar. Esqueceu a senha? Peça ao administrador para redefini-la.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1 },
  topo: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
  topoInterno: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  icone: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nome: { fontFamily: Fontes.tituloNegrito, fontSize: 36, lineHeight: 42 },
  apresentacao: { fontFamily: Fontes.corpo, fontSize: 16, lineHeight: 24, maxWidth: 320 },
  painel: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: Spacing.four, paddingHorizontal: Spacing.four },
  painelInterno: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  aviso: { textAlign: 'center' },
});
