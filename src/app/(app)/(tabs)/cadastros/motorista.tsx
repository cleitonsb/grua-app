import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { CampoFormulario } from '@/components/campo-formulario';
import { FormularioTela } from '@/components/formulario-tela';
import { RedefinirSenha } from '@/components/redefinir-senha';
import { SeletorOpcoes, type Opcao } from '@/components/seletor-opcoes';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { lerCadastro, mensagemDeFalhaAoSalvar, salvarCadastro } from '@/hooks/use-cadastro';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Caminhao, Motorista, Pagina } from '@/types/api';
import { apenasDigitos, formatarPlaca, formatarTelefone } from '@/utils/formatadores';

const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
const OPCOES_CNH: Opcao<string>[] = CATEGORIAS_CNH.map((categoria) => ({ valor: categoria, rotulo: categoria }));

type Campo = 'name' | 'usuario' | 'senha' | 'cnh_categoria' | 'telefone' | 'caminhao_id';
type Erros = Partial<Record<Campo, string>>;

export default function MotoristaScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const edicao = id !== undefined;

  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [cnh, setCnh] = useState('');
  const [telefone, setTelefone] = useState('');
  const [caminhaoId, setCaminhaoId] = useState<number | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [usuarioId, setUsuarioId] = useState<number>();
  const [caminhoes, setCaminhoes] = useState<Caminhao[]>([]);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativoNaTela = true;

    async function carregar() {
      try {
        const [lista, motorista] = await Promise.all([
          api<Pagina<Caminhao>>('/caminhoes', { query: { ativo: 1, per_page: 50 } }),
          edicao ? lerCadastro<Motorista>('motoristas', id) : Promise.resolve(undefined),
        ]);

        if (!ativoNaTela) {
          return;
        }

        setCaminhoes(lista.data);

        if (motorista) {
          setNome(motorista.nome);
          setUsuario(motorista.usuario);
          setCnh(motorista.cnh_categoria);
          setTelefone(formatarTelefone(motorista.telefone));
          setCaminhaoId(motorista.caminhao?.id ?? null);
          setAtivo(motorista.ativo);
          setUsuarioId(motorista.user_id);
        }
      } catch (erro) {
        if (ativoNaTela) {
          setErroGeral(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os dados.');
        }
      } finally {
        if (ativoNaTela) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativoNaTela = false;
    };
  }, [edicao, id]);

  async function salvar() {
    const novosErros: Erros = {
      name: nome.trim() ? undefined : 'Informe o nome completo.',
      usuario: edicao || usuario.trim() ? undefined : 'Informe o usuário.',
      senha: edicao || senha.length >= 8 ? undefined : 'A senha inicial deve ter pelo menos 8 caracteres.',
      cnh_categoria: cnh ? undefined : 'Selecione a categoria da CNH.',
      telefone: telefone.trim() ? undefined : 'Informe o telefone.',
    };

    setErros(novosErros);
    setErroGeral(undefined);

    if (Object.values(novosErros).some(Boolean)) {
      return;
    }

    setSalvando(true);

    try {
      await salvarCadastro<Motorista>(
        'motoristas',
        {
          name: nome.trim(),
          ...(edicao ? { ativo } : { usuario: usuario.trim(), senha }),
          cnh_categoria: cnh,
          telefone: apenasDigitos(telefone),
          caminhao_id: caminhaoId,
        },
        id,
      );

      router.back();
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 422) {
        setErros({
          name: erro.erroDoCampo('name'),
          usuario: erro.erroDoCampo('usuario'),
          senha: erro.erroDoCampo('senha'),
          cnh_categoria: erro.erroDoCampo('cnh_categoria'),
          telefone: erro.erroDoCampo('telefone'),
          caminhao_id: erro.erroDoCampo('caminhao_id'),
        });
        setErroGeral(erro.erroDoCampo('ativo'));
      } else {
        setErroGeral(mensagemDeFalhaAoSalvar(erro));
      }
    } finally {
      setSalvando(false);
    }
  }

  const opcoesCaminhao: Opcao<number | null>[] = [
    { valor: null, rotulo: 'Sem caminhão' },
    ...caminhoes.map((caminhao) => ({
      valor: caminhao.id,
      rotulo: `${formatarPlaca(caminhao.placa)} · ${caminhao.tipo_plataforma}`,
    })),
  ];

  if (carregando) {
    return (
      <FormularioTela titulo="Motorista">
        <ActivityIndicator />
      </FormularioTela>
    );
  }

  return (
    <FormularioTela titulo={edicao ? 'Editar motorista' : 'Novo motorista'}
      rodape={{
        secundario: { titulo: 'Cancelar', aoTocar: () => router.back(), desabilitado: salvando },
        principal: { titulo: 'Salvar motorista', aoTocar: salvar, carregando: salvando },
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
            ajuda="Provisória: o motorista será obrigado a trocá-la no primeiro acesso."
            secureTextEntry
            alternarVisibilidade
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
        </>
      )}

      <SeletorOpcoes rotulo="CNH categoria" opcoes={OPCOES_CNH} valor={cnh} onChange={setCnh} erro={erros.cnh_categoria} />

      <CampoFormulario
        rotulo="Telefone"
        value={telefone}
        onChangeText={(texto) => setTelefone(formatarTelefone(texto))}
        erro={erros.telefone}
        keyboardType="phone-pad"
        maxLength={15}
        autoComplete="tel"
      />

      <SeletorOpcoes
        rotulo="Caminhão"
        opcoes={opcoesCaminhao}
        valor={caminhaoId}
        onChange={setCaminhaoId}
        erro={erros.caminhao_id}
        ajuda={caminhoes.length === 0 ? 'Nenhum caminhão ativo cadastrado.' : undefined}
      />

      {edicao ? (
        <View style={estilos.linhaAtivo}>
          <View style={estilos.textoAtivo}>
            <ThemedText type="smallBold">Motorista ativo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Ao inativar, o acesso dele é encerrado na hora.
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


      {edicao && usuarioId !== undefined ? <RedefinirSenha usuarioId={usuarioId} /> : null}
    </FormularioTela>
  );
}

const estilos = StyleSheet.create({
  somenteLeitura: { gap: Spacing.half },
  linhaAtivo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  textoAtivo: { flex: 1, gap: Spacing.half },
});
