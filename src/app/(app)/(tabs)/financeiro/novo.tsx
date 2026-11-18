import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { FormularioTela } from '@/components/formulario-tela';
import { FormularioLancamento } from '@/components/financeiro/formulario-lancamento';
import { ThemedText } from '@/components/themed-text';
import { useLancamento, useSalvarLancamento, type DadosDoLancamento } from '@/hooks/use-lancamento';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';

/**
 * Lançamento avulso (sem `id`) ou edição de um lançamento existente (`?id=`). Só o administrador chega aqui; o
 * motorista é mandado de volta à lista (a API também recusa a escrita).
 */
export default function LancamentoFormularioScreen() {
  const { usuario } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (usuario?.papel !== 'administrador') {
    return <Redirect href="/financeiro" />;
  }

  return id ? <Edicao id={id} /> : <Criacao />;
}

function Criacao() {
  const router = useRouter();
  const { salvando, erroAcao, errosDoCampo, criar } = useSalvarLancamento();

  async function salvar(dados: DadosDoLancamento) {
    const criado = await criar(dados);

    if (criado) {
      router.replace(`/financeiro/${criado.id}`);
    }
  }

  return <FormularioLancamento titulo="Novo lançamento" modo="criar" salvando={salvando} erroAcao={erroAcao} errosDoCampo={errosDoCampo} aoSalvar={(dados) => void salvar(dados)} />;
}

function Edicao({ id }: { id: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { lancamento, carregando, erro } = useLancamento(id);
  const { salvando, erroAcao, errosDoCampo, editar } = useSalvarLancamento();

  async function salvar(dados: DadosDoLancamento) {
    if (await editar(id, dados)) {
      router.back();
    }
  }

  if (!lancamento) {
    return (
      <FormularioTela titulo="Editar lançamento">
        {carregando ? <ActivityIndicator /> : <ThemedText style={{ color: theme.danger }}>{erro ?? 'Lançamento não encontrado.'}</ThemedText>}
      </FormularioTela>
    );
  }

  return (
    <FormularioLancamento
      titulo="Editar lançamento"
      modo={lancamento.origem === 'automatica' ? 'editar-automatico' : 'editar-avulso'}
      inicial={{
        cliente: { id: lancamento.cliente_id, nome: lancamento.cliente },
        veiculo: lancamento.veiculo_id !== null ? { id: lancamento.veiculo_id, descricao: [lancamento.veiculo, lancamento.placa].filter(Boolean).join(' · ') } : null,
        caminhaoId: lancamento.caminhao_id,
        caminhaoPlaca: lancamento.caminhao_placa,
        descricao: lancamento.descricao,
        valorCentavos: lancamento.valor_centavos,
      }}
      salvando={salvando}
      erroAcao={erroAcao}
      errosDoCampo={errosDoCampo}
      aoSalvar={(dados) => void salvar(dados)}
    />
  );
}
