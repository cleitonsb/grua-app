import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CampoFormulario } from '@/components/campo-formulario';
import { SeletorOpcoes, type Opcao } from '@/components/seletor-opcoes';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import type { CamposDoChecklist } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';
import { consumirSelecaoPendente } from '@/services/selecao-pendente';
import type { Checklist, Cliente, FormaPagamento } from '@/types/api';
import { formatarCpfCnpj, formatarPlaca, formatarTelefone, juntarPreenchidos, nomeDoCliente, normalizarPlaca, placaValida } from '@/utils/formatadores';
import { centavosDeDigitos, LIMITE_EM_CENTAVOS, mascaraDeReais } from '@/utils/dinheiro';
import { ROTULO_DA_FORMA } from '@/utils/financeiro';
import type { ErrosDoPasso } from '@/utils/checklist';

import { SeletorRegistro } from './seletor-registro';

type Resposta = 'sim' | 'nao';

const OPCOES_ACOMPANHA: Opcao<Resposta>[] = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
];

const OPCOES_FORMA: Opcao<FormaPagamento | null>[] = [
  { valor: null, rotulo: 'A definir' },
  ...(Object.keys(ROTULO_DA_FORMA) as FormaPagamento[]).map((forma) => ({ valor: forma as FormaPagamento | null, rotulo: ROTULO_DA_FORMA[forma] })),
];

interface PassoDadosProps {
  checklist: Checklist;
  alterar: (campos: CamposDoChecklist, local?: Partial<Checklist>) => void;
  erros: ErrosDoPasso;
}

/** Passo 1: motorista e caminhão (preenchidos), cliente, placa, local de retirada, destino e acompanhamento; na retirada, também o valor e a forma de pagamento. */
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

  // Ao voltar do cadastro de um novo cliente, seleciona o que acabou de ser salvo.
  useFocusEffect(
    useCallback(() => {
      const cliente = consumirSelecaoPendente<Cliente>('cliente');

      if (cliente) selecionarCliente(cliente);
    }, [selecionarCliente]),
  );

  // A placa é digitada no próprio campo e só vai para o salvamento automático quando está completa e válida: uma placa
  // pela metade seria recusada pela API e o campo seria limpo no meio da digitação.
  const [placa, setPlaca] = useState(checklist.placa ?? '');
  const [placaFocada, setPlacaFocada] = useState(false);
  const placaIncompleta = placa !== '' && !placaValida(placa);

  function aoDigitarPlaca(texto: string) {
    const nova = normalizarPlaca(texto);

    setPlaca(nova);

    if (placaValida(nova)) {
      alterar({ placa: nova });
    } else if (nova === '' && checklist.placa) {
      alterar({ placa: null });
    }
  }

  // Ao sair do campo com a placa incompleta, a placa salva é descartada: nunca fica uma placa antiga que a tela não mostra.
  function aoSairDaPlaca() {
    setPlacaFocada(false);

    if (placaIncompleta && checklist.placa) {
      alterar({ placa: null });
    }
  }

  // Valor combinado (só na retirada): o texto guarda só os dígitos e a máscara de reais é aplicada ao exibir.
  const [valor, setValor] = useState(checklist.valor_centavos ? String(checklist.valor_centavos) : '');

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
        resumo={checklist.cliente ? nomeDoCliente(checklist.cliente.nome) : undefined}
        detalhe={
          checklist.cliente
            ? juntarPreenchidos([formatarCpfCnpj(checklist.cliente.documento), formatarTelefone(checklist.cliente.telefone)]) || undefined
            : undefined
        }
        erro={erros.cliente_id}
        onSelecionar={(registro) => selecionarCliente(registro as Cliente)}
        onLimpar={() => alterar({ cliente_id: null })}
        onCadastrarNovo={() => router.push('/checklists/cliente?selecionar=1')}
      />

      <CampoFormulario
        rotulo="Placa do veículo"
        value={formatarPlaca(placa)}
        onChangeText={aoDigitarPlaca}
        onFocus={() => setPlacaFocada(true)}
        onBlur={aoSairDaPlaca}
        erro={erros.placa ?? (placaIncompleta && !placaFocada ? 'Placa incompleta ou inválida.' : undefined)}
        ajuda="Obrigatória. Formato antigo (ABC-1234) ou Mercosul (ABC1D23)."
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
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

      {checklist.tipo === 'retirada' ? (
        <>
          <CampoFormulario
            rotulo="Valor do serviço"
            value={valor === '' ? '' : mascaraDeReais(valor)}
            onChangeText={(texto) => {
              const digitos = texto.replace(/\D/g, '').slice(0, 9);
              const centavos = Math.min(centavosDeDigitos(digitos), LIMITE_EM_CENTAVOS);

              setValor(centavos > 0 ? String(centavos) : '');
              alterar({ valor_centavos: centavos > 0 ? centavos : null });
            }}
            placeholder="R$ 0,00"
            keyboardType="number-pad"
            erro={erros.valor_centavos}
            ajuda="Opcional. Fica no financeiro da operação (retirada e entrega)."
          />

          <SeletorOpcoes
            rotulo="Forma de pagamento"
            opcoes={OPCOES_FORMA}
            valor={checklist.forma_pagamento}
            onChange={(forma) => alterar({ forma_pagamento: forma })}
            erro={erros.forma_pagamento}
          />
        </>
      ) : null}
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
