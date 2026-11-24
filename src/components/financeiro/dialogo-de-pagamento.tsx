import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { CampoFormulario } from '@/components/campo-formulario';
import { SeletorOpcoes } from '@/components/seletor-opcoes';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DadosDoPagamento } from '@/hooks/use-lancamento';
import type { FormaPagamento } from '@/types/api';
import { centavosDeDigitos, LIMITE_EM_CENTAVOS, mascaraDeReais } from '@/utils/dinheiro';
import { ROTULO_DA_FORMA } from '@/utils/financeiro';
import { dataParaIso, hojeEmBrasilia, isoParaData, mascaraDeData } from '@/utils/periodo';

interface DialogoDePagamentoProps {
  /** Quando o lançamento ainda está sem valor, o painel pede o valor (define e paga de uma vez). */
  pedirValor: boolean;
  /** Forma de pagamento combinada na retirada, já marcada ao abrir o painel. */
  formaCombinada?: FormaPagamento | null;
  executando: boolean;
  /** Mensagem geral da API e erros por campo (`pago_em`, `forma_pagamento`, `valor_centavos`). */
  erroAcao?: string;
  errosDoCampo: Record<string, string>;
  aoConfirmar: (dados: DadosDoPagamento) => void;
  aoVoltar: () => void;
}

const OPCOES = (Object.keys(ROTULO_DA_FORMA) as FormaPagamento[]).map((forma) => ({ valor: forma as FormaPagamento | null, rotulo: ROTULO_DA_FORMA[forma] }));

/**
 * Painel "Marcar como pago": data (padrão hoje em Brasília, não pode ser futura), forma de pagamento e, se faltar, o
 * valor. Valida antes de enviar; a API repete as regras e devolve o erro no campo certo.
 */
export function DialogoDePagamento({ pedirValor, formaCombinada = null, executando, erroAcao, errosDoCampo, aoConfirmar, aoVoltar }: DialogoDePagamentoProps) {
  const theme = useTheme();
  const [data, setData] = useState(() => isoParaData(hojeEmBrasilia()));
  const [forma, setForma] = useState<FormaPagamento | null>(formaCombinada);
  const [valor, setValor] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  function confirmar() {
    const pendencias: Record<string, string> = {};
    const iso = dataParaIso(data);

    if (iso === null) pendencias.pago_em = 'Informe uma data válida (dd/mm/aaaa).';
    else if (iso > hojeEmBrasilia()) pendencias.pago_em = 'A data do pagamento não pode ser futura.';

    if (forma === null) pendencias.forma_pagamento = 'Escolha a forma de pagamento.';

    const centavos = centavosDeDigitos(valor);

    if (pedirValor && (centavos < 1 || centavos > LIMITE_EM_CENTAVOS)) pendencias.valor_centavos = 'Informe o valor (entre R$ 0,01 e R$ 1.000.000,00).';

    setErros(pendencias);

    if (Object.keys(pendencias).length > 0 || iso === null || forma === null) return;

    aoConfirmar({ pagoEm: iso, forma, ...(pedirValor ? { valorCentavos: centavos } : {}) });
  }

  const erroDe = (campo: string) => erros[campo] ?? errosDoCampo[campo];
  // O erro de um campo some assim que a pessoa começa a corrigi-lo.
  const limpar = (campo: string) => setErros((atuais) => Object.fromEntries(Object.entries(atuais).filter(([chave]) => chave !== campo)));

  return (
    <Cartao style={estilos.painel}>
      <ThemedText type="subtitle">Marcar como pago</ThemedText>

      {pedirValor ? (
        <CampoFormulario
          rotulo="Valor recebido"
          value={valor === '' ? '' : mascaraDeReais(valor)}
          onChangeText={(texto) => {
            setValor(texto.replace(/\D/g, ''));
            limpar('valor_centavos');
          }}
          placeholder="R$ 0,00"
          keyboardType="number-pad"
          erro={erroDe('valor_centavos')}
          ajuda="Este lançamento ainda está sem valor; ele será definido junto com o pagamento."
        />
      ) : null}

      <CampoFormulario
        rotulo="Data do pagamento"
        value={data}
        onChangeText={(texto) => {
          setData(mascaraDeData(texto));
          limpar('pago_em');
        }}
        placeholder="dd/mm/aaaa"
        keyboardType="number-pad"
        maxLength={10}
        erro={erroDe('pago_em')}
      />

      <SeletorOpcoes rotulo="Forma de pagamento" opcoes={OPCOES} valor={forma} onChange={(escolhida) => {
          setForma(escolhida);
          limpar('forma_pagamento');
        }}
        erro={erroDe('forma_pagamento')} />

      {erroAcao && Object.keys(errosDoCampo).length === 0 ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroAcao}
        </ThemedText>
      ) : null}

      <View style={estilos.botoes}>
        <Botao titulo="Confirmar pagamento" onPress={confirmar} carregando={executando} />
        <Botao titulo="Voltar" variante="secundario" onPress={aoVoltar} desabilitado={executando} />
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  painel: { gap: Spacing.three },
  botoes: { gap: Spacing.two },
});
