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
import type { Veiculo } from '@/types/api';
import { formatarPlaca, normalizarPlaca } from '@/utils/formatadores';

type Campo = 'placa' | 'modelo' | 'cor';
type Erros = Partial<Record<Campo, string>>;

export default function VeiculoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id, selecionar } = useLocalSearchParams<{ id?: string; selecionar?: string }>();
  const edicao = id !== undefined;

  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
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

    lerCadastro<Veiculo>('veiculos', id)
      .then((veiculo) => {
        if (!ativoNaTela) {
          return;
        }

        setPlaca(veiculo.placa);
        setModelo(veiculo.modelo ?? '');
        setCor(veiculo.cor ?? '');
        setAtivo(veiculo.ativo);
      })
      .catch((erro) => ativoNaTela && setErroGeral(erro instanceof ApiError ? erro.message : 'Não foi possível carregar o veículo.'))
      .finally(() => ativoNaTela && setCarregando(false));

    return () => {
      ativoNaTela = false;
    };
  }, [edicao, id]);

  async function salvar() {
    const novosErros: Erros = {
      placa: placa ? undefined : 'Informe a placa.',
    };

    setErros(novosErros);
    setErroGeral(undefined);

    if (Object.values(novosErros).some(Boolean)) {
      return;
    }

    setSalvando(true);

    try {
      const salvo = await salvarCadastro<Veiculo>(
        'veiculos',
        { placa, modelo: modelo.trim(), cor: cor.trim(), ...(edicao ? { ativo } : {}) },
        id,
      );

      // Vindo do checklist: o passo 1 seleciona o veículo recém-cadastrado ao voltar.
      if (selecionar === '1') {
        definirSelecaoPendente('veiculo', salvo);
      }

      router.back();
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 422) {
        setErros({
          placa: erro.erroDoCampo('placa'),
          modelo: erro.erroDoCampo('modelo'),
          cor: erro.erroDoCampo('cor'),
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
      <FormularioTela titulo="Veículo">
        <ActivityIndicator />
      </FormularioTela>
    );
  }

  return (
    <FormularioTela titulo={edicao ? 'Editar veículo' : 'Novo veículo'}
      rodape={{
        secundario: { titulo: 'Cancelar', aoTocar: () => router.back(), desabilitado: salvando },
        principal: { titulo: 'Salvar veículo', aoTocar: salvar, carregando: salvando },
      }}>
      <CampoFormulario
        rotulo="Placa"
        value={formatarPlaca(placa)}
        onChangeText={(texto) => setPlaca(normalizarPlaca(texto))}
        erro={erros.placa}
        ajuda="Formato antigo (ABC-1234) ou Mercosul (ABC1D23)."
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
      />

      <CampoFormulario rotulo="Modelo" value={modelo} onChangeText={setModelo} erro={erros.modelo} autoCapitalize="words" />

      <CampoFormulario rotulo="Cor" value={cor} onChangeText={setCor} erro={erros.cor} autoCapitalize="words" />

      {edicao ? (
        <View style={estilos.linhaAtivo}>
          <View style={estilos.textoAtivo}>
            <ThemedText type="smallBold">Veículo ativo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Veículos inativos não aparecem ao montar um novo checklist.
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
