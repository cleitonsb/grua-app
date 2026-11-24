import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { CampoFormulario } from '@/components/campo-formulario';
import { FormularioTela } from '@/components/formulario-tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { lerCadastro, mensagemDeFalhaAoSalvar, salvarCadastro } from '@/hooks/use-cadastro';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import { definirSelecaoPendente } from '@/services/selecao-pendente';
import type { Cliente } from '@/types/api';
import { apenasDigitos, formatarCpfCnpj, formatarTelefone } from '@/utils/formatadores';

type Campo = 'nome' | 'documento' | 'telefone' | 'email_assinatura' | 'rg';
type Erros = Partial<Record<Campo, string>>;

export default function ClienteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id, selecionar } = useLocalSearchParams<{ id?: string; selecionar?: string }>();
  const edicao = id !== undefined;

  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [rg, setRg] = useState('');
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

    lerCadastro<Cliente>('clientes', id)
      .then((cliente) => {
        if (!ativoNaTela) {
          return;
        }

        setNome(cliente.nome ?? '');
        setDocumento(formatarCpfCnpj(cliente.documento));
        setTelefone(formatarTelefone(cliente.telefone));
        setEmail(cliente.email_assinatura ?? '');
        setRg(cliente.rg ?? '');
        setAtivo(cliente.ativo);
      })
      .catch((erro) => ativoNaTela && setErroGeral(erro instanceof ApiError ? erro.message : 'Não foi possível carregar o cliente.'))
      .finally(() => ativoNaTela && setCarregando(false));

    return () => {
      ativoNaTela = false;
    };
  }, [edicao, id]);

  async function salvar() {
    // Nenhum campo do cliente é obrigatório; a API valida o formato do que foi preenchido.
    setErros({});
    setErroGeral(undefined);
    setSalvando(true);

    try {
      const salvo = await salvarCadastro<Cliente>(
        'clientes',
        {
          nome: nome.trim(),
          documento: apenasDigitos(documento),
          telefone: apenasDigitos(telefone),
          email_assinatura: email.trim(),
          rg: rg.trim() || null,
          ...(edicao ? { ativo } : {}),
        },
        id,
      );

      // Vindo do checklist: o passo 1 seleciona o cliente recém-cadastrado ao voltar.
      if (selecionar === '1') {
        definirSelecaoPendente('cliente', salvo);
      }

      router.back();
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 422) {
        setErros({
          nome: erro.erroDoCampo('nome'),
          documento: erro.erroDoCampo('documento'),
          telefone: erro.erroDoCampo('telefone'),
          email_assinatura: erro.erroDoCampo('email_assinatura'),
          rg: erro.erroDoCampo('rg'),
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
      <FormularioTela titulo="Cliente">
        <ActivityIndicator />
      </FormularioTela>
    );
  }

  return (
    <FormularioTela titulo={edicao ? 'Editar cliente' : 'Novo cliente'}
      rodape={{
        secundario: { titulo: 'Cancelar', aoTocar: () => router.back(), desabilitado: salvando },
        principal: { titulo: 'Salvar cliente', aoTocar: salvar, carregando: salvando },
      }}>
      <CampoFormulario rotulo="Nome completo" placeholder="Nome do cliente" value={nome} onChangeText={setNome} erro={erros.nome} autoCapitalize="words" returnKeyType="next" />

      <CampoFormulario
        rotulo="CPF ou CNPJ"
        placeholder="000.000.000-00"
        value={documento}
        onChangeText={(texto) => setDocumento(formatarCpfCnpj(texto))}
        erro={erros.documento}
        keyboardType="number-pad"
        maxLength={18}
      />

      <CampoFormulario
        rotulo="Telefone"
        placeholder="(61) 9 0000-0000"
        value={telefone}
        onChangeText={(texto) => setTelefone(formatarTelefone(texto))}
        erro={erros.telefone}
        keyboardType="phone-pad"
        maxLength={15}
        autoComplete="tel"
      />

      <CampoFormulario
        rotulo="E-mail"
        placeholder="cliente@email.com"
        value={email}
        onChangeText={setEmail}
        erro={erros.email_assinatura}
        ajuda="Opcional. Se informado, a cópia do checklist assinado em PDF é enviada para este endereço."
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />

      <CampoFormulario rotulo="RG (opcional)" placeholder="Número do RG" value={rg} onChangeText={setRg} erro={erros.rg} autoCapitalize="characters" />

      {edicao ? (
        <View style={estilos.linhaAtivo}>
          <View style={estilos.textoAtivo}>
            <ThemedText type="smallBold">Cliente ativo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Clientes inativos não aparecem ao montar um novo checklist.
            </ThemedText>
          </View>
          <Switch value={ativo} onValueChange={setAtivo} thumbColor={theme.branco} trackColor={{ false: theme.bordaCampo, true: theme.primary }} />
        </View>
      ) : null}

      {erroGeral ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroGeral}
        </ThemedText>
      ) : null}

    </FormularioTela>
  );
}

const estilos = StyleSheet.create({
  linhaAtivo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  textoAtivo: { flex: 1, gap: Spacing.half },
});
