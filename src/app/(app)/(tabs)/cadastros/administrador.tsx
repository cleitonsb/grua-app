import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { CampoFormulario } from '@/components/campo-formulario';
import { FormularioTela } from '@/components/formulario-tela';
import { RedefinirSenha } from '@/components/redefinir-senha';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { lerCadastro, mensagemDeFalhaAoSalvar, salvarCadastro } from '@/hooks/use-cadastro';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import type { Administrador } from '@/types/api';

type Campo = 'name' | 'usuario' | 'senha' | 'ativo';
type Erros = Partial<Record<Campo, string>>;

export default function AdministradorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { usuario: logado } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const edicao = id !== undefined;

  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [carregando, setCarregando] = useState(edicao);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!edicao) {
      return;
    }

    let ativoNaTela = true;

    lerCadastro<Administrador>('administradores', id)
      .then((administrador) => {
        if (!ativoNaTela) {
          return;
        }

        setNome(administrador.nome);
        setUsuario(administrador.usuario);
        setAtivo(administrador.ativo);
      })
      .catch((erro) => ativoNaTela && setErroGeral(erro instanceof ApiError ? erro.message : 'Não foi possível carregar o administrador.'))
      .finally(() => ativoNaTela && setCarregando(false));

    return () => {
      ativoNaTela = false;
    };
  }, [edicao, id]);

  async function salvar() {
    const novosErros: Erros = {
      name: nome.trim() ? undefined : 'Informe o nome completo.',
      usuario: edicao || usuario.trim() ? undefined : 'Informe o usuário.',
      senha: edicao || senha.length >= 8 ? undefined : 'A senha inicial deve ter pelo menos 8 caracteres.',
    };

    setErros(novosErros);
    setErroGeral(undefined);

    if (Object.values(novosErros).some(Boolean)) {
      return;
    }

    setSalvando(true);

    try {
      await salvarCadastro<Administrador>(
        'administradores',
        { name: nome.trim(), ...(edicao ? { ativo } : { usuario: usuario.trim(), senha }) },
        id,
      );

      router.back();
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 422) {
        // A mensagem do último administrador ativo vem no campo `ativo`.
        setErros({
          name: erro.erroDoCampo('name'),
          usuario: erro.erroDoCampo('usuario'),
          senha: erro.erroDoCampo('senha'),
          ativo: erro.erroDoCampo('ativo'),
        });
      } else {
        setErroGeral(mensagemDeFalhaAoSalvar(erro));
      }
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <FormularioTela titulo="Administrador">
        <ActivityIndicator />
      </FormularioTela>
    );
  }

  return (
    <FormularioTela titulo={edicao ? 'Editar administrador' : 'Novo administrador'}
      rodape={{
        secundario: { titulo: 'Cancelar', aoTocar: () => router.back(), desabilitado: salvando },
        principal: { titulo: 'Salvar administrador', aoTocar: salvar, carregando: salvando },
      }}>
      <CampoFormulario rotulo="Nome completo" value={nome} onChangeText={setNome} erro={erros.name} autoCapitalize="words" />

      {edicao ? (
        <View style={estilos.somenteLeitura}>
          <ThemedText type="smallBold">Usuário</ThemedText>
          <ThemedText themeColor="textSecondary">{usuario}</ThemedText>
        </View>
      ) : (
        <>
          <CampoFormulario
            rotulo="Usuário"
            value={usuario}
            onChangeText={setUsuario}
            erro={erros.usuario}
            ajuda="De 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado. Não muda depois."
            autoCapitalize="none"
            autoCorrect={false}
          />
          <CampoFormulario
            rotulo="Senha inicial"
            value={senha}
            onChangeText={setSenha}
            erro={erros.senha}
            ajuda="Provisória: o administrador será obrigado a trocá-la no primeiro acesso."
            secureTextEntry
            alternarVisibilidade
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
        </>
      )}

      {edicao ? (
        <View style={estilos.campoAtivo}>
          <View style={estilos.linhaAtivo}>
            <View style={estilos.textoAtivo}>
              <ThemedText type="smallBold">Administrador ativo</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                O sistema precisa ter pelo menos um administrador ativo.
              </ThemedText>
            </View>
            <Switch value={ativo} onValueChange={setAtivo} thumbColor={theme.branco} trackColor={{ false: theme.bordaCampo, true: theme.primary }} />
          </View>
          {erros.ativo ? (
            <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
              {erros.ativo}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {erroGeral ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroGeral}
        </ThemedText>
      ) : null}


      {edicao ? <RedefinirSenha usuarioId={Number(id)} proprioUsuario={logado?.id === Number(id)} /> : null}
    </FormularioTela>
  );
}

const estilos = StyleSheet.create({
  somenteLeitura: { gap: Spacing.half },
  campoAtivo: { gap: Spacing.one },
  linhaAtivo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  textoAtivo: { flex: 1, gap: Spacing.half },
});
