import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { CampoFormulario } from '@/components/campo-formulario';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { mensagemDeFalhaAoSalvar } from '@/hooks/use-cadastro';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';

interface RedefinirSenhaProps {
  /** Id do usuário (`user_id` do motorista ou `id` do administrador). */
  usuarioId: number;
  /** Quando o administrador redefine a própria senha, a sessão atual cai e ele volta ao login. */
  proprioUsuario?: boolean;
}

/** Ação do administrador: define uma senha provisória para quem esqueceu a dele. */
export function RedefinirSenha({ usuarioId, proprioUsuario = false }: RedefinirSenhaProps) {
  const theme = useTheme();
  const { sair } = useSession();
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState<string>();
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function redefinir() {
    setSucesso(false);

    if (novaSenha.length < 8) {
      setErro('A senha provisória deve ter pelo menos 8 caracteres.');

      return;
    }

    setErro(undefined);
    setCarregando(true);

    try {
      await api(`/usuarios/${usuarioId}/redefinir-senha`, { method: 'POST', body: { nova_senha: novaSenha } });
      setNovaSenha('');
      setSucesso(true);

      if (proprioUsuario) {
        await sair();
      }
    } catch (excecao) {
      setErro(excecao instanceof ApiError && excecao.status === 422
        ? (excecao.erroDoCampo('nova_senha') ?? excecao.message)
        : mensagemDeFalhaAoSalvar(excecao));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Cartao style={estilos.bloco}>
      <ThemedText type="subtitle">Redefinir senha</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {proprioUsuario
          ? 'A nova senha é provisória e você será desconectado para entrar de novo com ela.'
          : 'A nova senha é provisória: o usuário precisará trocá-la no próximo acesso e as sessões abertas dele serão encerradas.'}
      </ThemedText>

      <CampoFormulario
        rotulo="Nova senha provisória"
        value={novaSenha}
        onChangeText={setNovaSenha}
        erro={erro}
        ajuda="Mínimo de 8 caracteres."
        secureTextEntry
        alternarVisibilidade
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
      />

      {sucesso ? (
        <ThemedText type="small" style={{ color: theme.sucesso }} accessibilityLiveRegion="polite">
          Senha redefinida. O usuário precisará trocá-la no próximo acesso.
        </ThemedText>
      ) : null}

      <Botao titulo="Redefinir senha" variante="secundario" onPress={redefinir} carregando={carregando} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Spacing.two, marginTop: Spacing.three },
});
