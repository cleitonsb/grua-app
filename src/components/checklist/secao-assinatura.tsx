import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import type { UsoDaAssinatura } from '@/hooks/use-assinatura';
import { useTheme } from '@/hooks/use-theme';
import type { Checklist } from '@/types/api';
import { formatarDiaEHora } from '@/utils/formatadores';

interface SecaoAssinaturaProps {
  checklist: Checklist;
  assinatura: UsoDaAssinatura;
  /** Motorista dono: pode colher a assinatura e reenviar a cópia. O administrador só consulta. */
  podeAgir: boolean;
}

/**
 * "Assinatura do cliente" (passo 4 e detalhe). A assinatura é opcional e colhida na tela do motorista: antes de
 * concluir só avisa disso; depois, mostra se o cliente assinou, oferece colher a assinatura que faltou e, assinado, o
 * PDF e a cópia por e-mail.
 */
export function SecaoAssinatura({ checklist, assinatura, podeAgir }: SecaoAssinaturaProps) {
  const theme = useTheme();
  const router = useRouter();
  const { estado, carregando, erro, erroAcao, abrindoPdf, reenviandoCopia, baixarPdf, reenviarCopia } = assinatura;
  const concluido = checklist.status !== 'rascunho';
  const assinado = estado?.situacao === 'assinado';

  if (!concluido) {
    return (
      <View style={estilos.secao}>
        <ThemedText type="subtitle">Assinatura do cliente</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Opcional. Ao concluir, o app abre o quadro para o cliente assinar com o dedo, na tela do motorista.
        </ThemedText>
      </View>
    );
  }

  const titulo = carregando || !estado ? 'Carregando…' : assinado ? `Assinado em ${estado.assinada_em ? formatarDiaEHora(estado.assinada_em) : '—'}` : 'Sem assinatura do cliente';

  return (
    <View style={estilos.secao}>
      <ThemedText type="subtitle">Assinatura do cliente</ThemedText>

      <Cartao style={estilos.estado}>
        <View accessibilityLiveRegion="polite" style={estilos.estadoLinha}>
          <View style={[estilos.ponto, { backgroundColor: assinado ? theme.sucesso : theme.placeholder }]} />
          <View style={estilos.estadoTextos}>
            <ThemedText style={estilos.estadoTitulo}>{titulo}</ThemedText>
            {estado && !assinado ? (
              <ThemedText type="small" themeColor="textSecondary">
                A assinatura é opcional: o checklist já está concluído.
              </ThemedText>
            ) : null}
          </View>
        </View>

        {erro ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {erro}
          </ThemedText>
        ) : null}

        {erroAcao ? (
          <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
            {erroAcao}
          </ThemedText>
        ) : null}

        {podeAgir && estado?.pode_assinar ? (
          <Botao titulo="Colher assinatura do cliente" onPress={() => router.push(`/checklists/${checklist.id}/assinar`)} />
        ) : null}

        {assinado && estado ? (
          <View style={estilos.copia}>
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {estado.copia === null
                ? 'Sem cópia por e-mail: o cliente não tem e-mail cadastrado ou ela ainda será enviada.'
                : estado.copia.situacao === 'enviado'
                  ? `Cópia enviada${estado.copia.enviada_em ? ` em ${formatarDiaEHora(estado.copia.enviada_em)}` : ''}.`
                  : estado.copia.situacao === 'pendente'
                    ? 'Enviando a cópia…'
                    : 'Não foi possível enviar a cópia por e-mail.'}
            </ThemedText>
            {estado.pdf_disponivel ? <Botao titulo="Baixar PDF" carregando={abrindoPdf} onPress={() => void baixarPdf()} /> : null}
            {podeAgir && estado.pdf_disponivel ? (
              <Botao titulo="Reenviar cópia" variante="secundario" carregando={reenviandoCopia} onPress={() => void reenviarCopia()} />
            ) : null}
            {podeAgir && estado.copia !== null && estado.pdf_disponivel ? (
              <ThemedText type="small" themeColor="textSecondary">
                {estado.copia.reenvios_restantes === 1 ? '1 reenvio restante' : `${estado.copia.reenvios_restantes} reenvios restantes`} nesta hora.
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </Cartao>
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: Spacing.three },
  estado: { gap: Spacing.two },
  copia: { gap: Spacing.two },
  estadoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  estadoTextos: { flex: 1, gap: 2 },
  estadoTitulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 15, lineHeight: 22 },
  ponto: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
});
