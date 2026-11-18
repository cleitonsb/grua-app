import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { CampoFormulario } from '@/components/campo-formulario';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DialogoDeCancelamentoProps {
  executando: boolean;
  erroAcao?: string;
  errosDoCampo: Record<string, string>;
  aoConfirmar: (motivo: string) => void;
  aoVoltar: () => void;
}

/** Painel "Cancelar lançamento": o motivo é obrigatório e o cancelamento não pode ser desfeito. */
export function DialogoDeCancelamento({ executando, erroAcao, errosDoCampo, aoConfirmar, aoVoltar }: DialogoDeCancelamentoProps) {
  const theme = useTheme();
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string>();

  function confirmar() {
    const texto = motivo.trim();

    if (texto === '') {
      setErro('Informe o motivo do cancelamento.');

      return;
    }

    setErro(undefined);
    aoConfirmar(texto);
  }

  return (
    <Cartao style={estilos.painel}>
      <ThemedText type="subtitle">Cancelar lançamento</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        O cancelamento não pode ser desfeito. O lançamento sai dos totais e do histórico de pendências, mas continua registrado.
      </ThemedText>

      <CampoFormulario
        rotulo="Motivo"
        value={motivo}
        onChangeText={(texto) => {
          setMotivo(texto);
          setErro(undefined);
        }}
        placeholder="Ex.: serviço cobrado junto com a retirada"
        multiline
        maxLength={500}
        erro={erro ?? errosDoCampo.motivo}
      />

      {erroAcao && Object.keys(errosDoCampo).length === 0 ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroAcao}
        </ThemedText>
      ) : null}

      <View style={estilos.botoes}>
        <Botao titulo="Cancelar lançamento" variante="perigo" onPress={confirmar} carregando={executando} />
        <Botao titulo="Voltar" variante="secundario" onPress={aoVoltar} desabilitado={executando} />
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  painel: { gap: Spacing.three },
  botoes: { gap: Spacing.two },
});
