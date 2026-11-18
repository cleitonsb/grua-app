import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { ResumoChecklist } from '@/components/checklist/resumo-checklist';
import { SecaoAssinatura } from '@/components/checklist/secao-assinatura';
import { Icone } from '@/components/icone';
import { Selo } from '@/components/selo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { UsoDaAssinatura } from '@/hooks/use-assinatura';
import { useTheme } from '@/hooks/use-theme';
import type { Checklist, Faltante } from '@/types/api';
import { avisoDeItensSemFoto } from '@/utils/checklist';

interface PassoResumoProps {
  checklist: Checklist;
  faltantes: Faltante[];
  avisos: string[];
  erroEnvio?: string;
  /** Estado e ações do link de assinatura (hook `useAssinatura` da tela). */
  assinatura: UsoDaAssinatura;
  /** Motorista dono: pode enviar e reenviar o link. */
  podeAgir: boolean;
  onIrParaPasso: (passo: number) => void;
}

/**
 * Passo 4: resumo, avisos, pendências do envio e a assinatura do cliente. Depois do envio (ou para quem só consulta), mostra o status. As
 * ações (Voltar, enviar, concluir) ficam no rodapé fixo da tela de edição.
 */
export function PassoResumo({ checklist, faltantes, avisos, erroEnvio, assinatura, podeAgir, onIrParaPasso }: PassoResumoProps) {
  const theme = useTheme();
  const enviado = checklist.status !== 'rascunho';
  // Antes do envio o aviso vem das contagens da tela; depois, do que a API devolveu.
  const avisosExibidos = enviado ? avisos : avisoDeItensSemFoto(checklist.contagens.itens_sem_foto);

  return (
    <View style={estilos.passo}>
      {enviado ? (
        <Cartao style={estilos.status}>
          <View accessibilityLiveRegion="polite" style={estilos.status}>
            <Selo tipo={checklist.status === 'assinado' ? 'assinado' : 'aguardando_assinatura'} />
            <ThemedText type="small" themeColor="textSecondary">
              {checklist.status === 'assinado'
                ? 'O cliente já assinou este checklist.'
                : 'Checklist enviado. Ele não pode mais ser alterado e aguarda a assinatura do cliente.'}
            </ThemedText>
          </View>
        </Cartao>
      ) : null}

      {avisosExibidos.map((aviso) => (
        <View key={aviso} style={[estilos.aviso, { backgroundColor: theme.alertaFundo }]}>
          <Icone nome="aviso" cor={theme.alerta} />
          <ThemedText type="small" style={[estilos.avisoTexto, { color: theme.alerta }]}>
            {aviso}. Você pode enviar mesmo assim.
          </ThemedText>
        </View>
      ))}

      {faltantes.length > 0 ? (
        <View style={estilos.pendencias}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            Falta preencher
          </ThemedText>
          {faltantes.map((faltante) => (
            <Cartao key={faltante.campo} aoTocar={() => onIrParaPasso(faltante.passo)} style={estilos.pendencia}>
              <ThemedText type="small" style={estilos.pendenciaTexto}>
                {faltante.mensagem}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Passo {faltante.passo}
              </ThemedText>
            </Cartao>
          ))}
        </View>
      ) : null}

      {erroEnvio ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroEnvio}
        </ThemedText>
      ) : null}

      <ResumoChecklist checklist={checklist} />

      <SecaoAssinatura checklist={checklist} assinatura={assinatura} podeAgir={podeAgir} />
    </View>
  );
}

const estilos = StyleSheet.create({
  passo: { gap: Spacing.three },
  status: { gap: Spacing.two },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  avisoTexto: { flex: 1 },
  pendencias: { gap: Spacing.two },
  pendencia: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pendenciaTexto: { flex: 1 },
});
