import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { CampoFormulario } from '@/components/campo-formulario';
import { RolagemComTeclado } from '@/components/rolagem-com-teclado';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api';

type Erros = { senha_atual?: string; nova_senha?: string; confirmacao?: string };

export default function TrocarSenhaScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { usuario, trocarSenha, sair } = useSession();
  const obrigatoria = usuario?.deve_trocar_senha ?? false;

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    const novosErros: Erros = {
      senha_atual: senhaAtual ? undefined : 'Informe a senha atual.',
      nova_senha: novaSenha.length >= 8 ? undefined : 'A nova senha deve ter pelo menos 8 caracteres.',
      confirmacao: confirmacao === novaSenha ? undefined : 'A confirmação não confere com a nova senha.',
    };

    setErros(novosErros);
    setErroGeral(undefined);

    if (Object.values(novosErros).some(Boolean)) {
      return;
    }

    setCarregando(true);

    try {
      await trocarSenha(senhaAtual, novaSenha, confirmacao);
      router.replace('/');
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 422) {
        setErros({ senha_atual: erro.erroDoCampo('senha_atual'), nova_senha: erro.erroDoCampo('nova_senha') });
      } else {
        setErroGeral(erro instanceof ApiError ? erro.message : 'Não foi possível trocar a senha. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela titulo="Trocar senha" aoVoltar={obrigatoria ? undefined : () => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.tela}>
        <RolagemComTeclado contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.cartao}>
            <ThemedText themeColor="textSecondary">
              {obrigatoria
                ? 'Sua senha é provisória. Crie uma nova senha para continuar.'
                : 'Informe a senha atual e escolha uma nova senha.'}
            </ThemedText>

              <View style={estilos.formulario}>
                <CampoFormulario
                  rotulo="Senha atual"
                  value={senhaAtual}
                  onChangeText={setSenhaAtual}
                  erro={erros.senha_atual}
                  secureTextEntry
                  alternarVisibilidade
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                />
                <CampoFormulario
                  rotulo="Nova senha"
                  value={novaSenha}
                  onChangeText={setNovaSenha}
                  erro={erros.nova_senha}
                  ajuda="Mínimo de 8 caracteres."
                  secureTextEntry
                  alternarVisibilidade
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                />
                <CampoFormulario
                  rotulo="Confirmar nova senha"
                  value={confirmacao}
                  onChangeText={setConfirmacao}
                  erro={erros.confirmacao}
                  secureTextEntry
                  alternarVisibilidade
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={enviar}
                />

                {erroGeral ? (
                  <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                    {erroGeral}
                  </ThemedText>
                ) : null}

                <Botao titulo="Salvar nova senha" onPress={enviar} carregando={carregando} />

                {obrigatoria ? (
                  <Botao titulo="Sair" variante="secundario" onPress={sair} desabilitado={carregando} />
                ) : (
                  <Botao titulo="Cancelar" variante="secundario" onPress={() => router.back()} desabilitado={carregando} />
                )}
              </View>
            </View>
          </RolagemComTeclado>
        </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, padding: Spacing.four },
  cartao: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  formulario: { gap: Spacing.three },
});
