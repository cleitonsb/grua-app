import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { CampoFormulario } from '@/components/campo-formulario';
import { SeletorOpcoes, type Opcao } from '@/components/seletor-opcoes';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import type { CamposDoChecklist } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';
import { consumirSelecaoPendente } from '@/services/selecao-pendente';
import type { Checklist, Cliente, Veiculo } from '@/types/api';
import { formatarCpfCnpj, formatarPlaca, formatarTelefone } from '@/utils/formatadores';
import type { ErrosDoPasso } from '@/utils/checklist';

import { SeletorRegistro } from './seletor-registro';

type Resposta = 'sim' | 'nao';

const OPCOES_ACOMPANHA: Opcao<Resposta>[] = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
];

interface PassoDadosProps {
  checklist: Checklist;
  alterar: (campos: CamposDoChecklist, local?: Partial<Checklist>) => void;
  erros: ErrosDoPasso;
}

/** Passo 1: motorista e caminhão (preenchidos), cliente, veículo, local de retirada, destino e acompanhamento. */
export function PassoDados({ checklist, alterar, erros }: PassoDadosProps) {
  const router = useRouter();

  const selecionarCliente = useCallback(
    (cliente: Cliente) =>
      alterar(
        { cliente_id: cliente.id },
        {
          cliente: {
            id: cliente.id,
            nome: cliente.nome,
            documento: cliente.documento,
            telefone: cliente.telefone,
            email_assinatura: cliente.email_assinatura,
          },
        },
      ),
    [alterar],
  );

  const selecionarVeiculo = useCallback(
    (veiculo: Veiculo) =>
      alterar(
        { veiculo_id: veiculo.id },
        { veiculo: { id: veiculo.id, placa: veiculo.placa, modelo: veiculo.modelo, cor: veiculo.cor } },
      ),
    [alterar],
  );

  // Ao voltar do cadastro de um novo cliente ou veículo, seleciona o que acabou de ser salvo.
  useFocusEffect(
    useCallback(() => {
      const cliente = consumirSelecaoPendente<Cliente>('cliente');
      const veiculo = consumirSelecaoPendente<Veiculo>('veiculo');

      if (cliente) selecionarCliente(cliente);
      if (veiculo) selecionarVeiculo(veiculo);
    }, [selecionarCliente, selecionarVeiculo]),
  );

  const caminhao = checklist.caminhao
    ? `${checklist.caminhao.tipo_plataforma} · ${formatarPlaca(checklist.caminhao.placa)}`
    : 'Sem caminhão associado';

  const acompanha: Resposta | null = checklist.cliente_acompanha === null ? null : checklist.cliente_acompanha ? 'sim' : 'nao';

  return (
    <View style={estilos.passo}>
      <CampoSomenteLeitura rotulo="Motorista" valor={checklist.motorista.nome} />
      <CampoSomenteLeitura rotulo="Caminhão" valor={caminhao} />

      <SeletorRegistro
        tipo="cliente"
        rotulo="Cliente"
        resumo={checklist.cliente?.nome}
        detalhe={
          checklist.cliente ? `${formatarCpfCnpj(checklist.cliente.documento)} · ${formatarTelefone(checklist.cliente.telefone)}` : undefined
        }
        erro={erros.cliente_id}
        onSelecionar={(registro) => selecionarCliente(registro as Cliente)}
        onCadastrarNovo={() => router.push('/checklists/cliente?selecionar=1')}
      />

      <SeletorRegistro
        tipo="veiculo"
        rotulo="Veículo do cliente"
        resumo={checklist.veiculo ? `${checklist.veiculo.modelo} · ${formatarPlaca(checklist.veiculo.placa)}` : undefined}
        detalhe={checklist.veiculo?.cor}
        erro={erros.veiculo_id}
        onSelecionar={(registro) => selecionarVeiculo(registro as Veiculo)}
        onCadastrarNovo={() => router.push('/checklists/veiculo?selecionar=1')}
      />

      <CampoFormulario
        rotulo="Local de retirada"
        value={checklist.local_retirada ?? ''}
        onChangeText={(texto) => alterar({ local_retirada: texto })}
        erro={erros.local_retirada}
        maxLength={255}
        autoCapitalize="sentences"
      />

      <CampoFormulario
        rotulo="Destino"
        value={checklist.destino ?? ''}
        onChangeText={(texto) => alterar({ destino: texto })}
        erro={erros.destino}
        maxLength={255}
        autoCapitalize="sentences"
      />

      <SeletorOpcoes
        rotulo="Cliente acompanha o serviço"
        opcoes={OPCOES_ACOMPANHA}
        valor={acompanha}
        onChange={(valor) => alterar({ cliente_acompanha: valor === null ? null : valor === 'sim' })}
        erro={erros.cliente_acompanha}
      />
    </View>
  );
}

/** Motorista e caminhão vêm do cadastro e não se alteram aqui: aparecem como campo apagado, sem seta. */
function CampoSomenteLeitura({ rotulo, valor }: { rotulo: string; valor: string }) {
  const theme = useTheme();

  return (
    <View style={estilos.leitura}>
      <ThemedText style={estilos.rotulo}>{rotulo}</ThemedText>
      <View
        accessible
        accessibilityLabel={`${rotulo}: ${valor}`}
        style={[estilos.valor, { backgroundColor: theme.backgroundSelected, borderColor: theme.bordaCampo }]}>
        <ThemedText style={estilos.textoDoValor}>{valor}</ThemedText>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  passo: { gap: Spacing.three },
  leitura: { gap: 6 },
  rotulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
  valor: { minHeight: Alturas.campo, borderRadius: Raios.campo, borderWidth: 1, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  textoDoValor: { fontFamily: Fontes.corpo, fontSize: 16, lineHeight: 22 },
});
