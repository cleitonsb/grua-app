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
  /** Motorista dono: pode enviar e reenviar. O administrador só consulta. */
  podeAgir: boolean;
}

/**
 * "Assinatura do cliente" (passo 4 e detalhe): o e-mail do cliente (somente leitura), a situação do link e as ações de
 * envio. Antes do envio do checklist, só avisa para onde o link irá depois do envio.
 */
export function SecaoAssinatura({ checklist, assinatura, podeAgir }: SecaoAssinaturaProps) {
  const theme = useTheme();
  const { estado, carregando, erro, enviando, erroAcao, enviarLink, abrindoPdf, reenviandoCopia, baixarPdf, reenviarCopia } = assinatura;
  const enviado = checklist.status !== 'rascunho';
  const emailDoCliente = checklist.cliente?.email_assinatura;

  const situacao = estado?.situacao;
  const emailExibido = estado?.link?.destinatario ?? emailDoCliente ?? 'Sem e-mail cadastrado';

  const titulo =
    !enviado || situacao === 'sem_envio'
      ? 'Aguardando envio'
      : situacao === 'enviado'
        ? `Link enviado em ${estado?.link?.enviado_em ? formatarDiaEHora(estado.link.enviado_em) : '—'}`
        : situacao === 'falhou'
          ? 'Não foi possível enviar'
          : situacao === 'expirado'
            ? 'Link expirado'
            : situacao === 'assinado'
              ? `Assinado em ${estado?.assinada_em ? formatarDiaEHora(estado.assinada_em) : '—'}`
              : 'Carregando…';

  const detalhe = !enviado
    ? 'Depois do envio, o link será enviado para este e-mail e o status muda para “Aguardando assinatura”.'
    : situacao === 'enviado' && estado?.link?.expira_em
      ? `O cliente tem até ${formatarDiaEHora(estado.link.expira_em)} para assinar.`
      : situacao === 'falhou'
        ? 'O e-mail não saiu. Confira o endereço do cliente e tente de novo.'
        : situacao === 'expirado'
          ? 'O prazo para assinar acabou. Envie um novo link.'
          : situacao === 'assinado'
            ? 'O cliente assinou e o checklist está concluído.'
            : situacao === 'sem_envio'
              ? 'O link ainda não foi enviado ao cliente.'
              : undefined;

  const corDoPonto =
    situacao === 'assinado' ? theme.sucesso : situacao === 'falhou' ? theme.danger : situacao === 'enviado' ? theme.alerta : theme.placeholder;
  const corDoTitulo = situacao === 'falhou' ? theme.danger : theme.text;

  const rotuloDoBotao =
    situacao === 'falhou' ? 'Tentar de novo' : situacao === 'enviado' ? 'Reenviar link' : situacao === 'expirado' ? 'Enviar novo link' : 'Enviar link para o e-mail';
  const mostrarBotao = enviado && podeAgir && !carregando && situacao !== undefined && situacao !== 'assinado';
  const restantes = estado?.link?.reenvios_restantes;

  return (
    <View style={estilos.secao}>
      <ThemedText type="subtitle">Assinatura do cliente</ThemedText>

      <View style={estilos.campo}>
        <ThemedText type="smallBold">Enviar link para o e-mail</ThemedText>
        <View style={[estilos.email, { backgroundColor: theme.backgroundElement, borderColor: theme.bordaCampo }]}>
          <ThemedText selectable={false}>{emailExibido}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          O cliente abre o link no celular, revisa o checklist e assina com o dedo. Para corrigir o e-mail, atualize o cadastro do cliente.
        </ThemedText>
      </View>

      <Cartao style={estilos.estado}>
        <View accessibilityLiveRegion="polite" style={estilos.estadoLinha}>
          <View style={[estilos.ponto, { backgroundColor: corDoPonto }]} />
          <View style={estilos.estadoTextos}>
            <ThemedText style={[estilos.estadoTitulo, { color: corDoTitulo }]}>{titulo}</ThemedText>
            {detalhe ? (
              <ThemedText type="small" themeColor="textSecondary">
                {detalhe}
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

        {situacao === 'assinado' && estado ? (
          <View style={estilos.copia}>
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {estado.copia === null
                ? 'A cópia por e-mail será enviada em instantes.'
                : estado.copia.situacao === 'enviado'
                  ? `Cópia enviada${estado.copia.enviada_em ? ` em ${formatarDiaEHora(estado.copia.enviada_em)}` : ''}.`
                  : estado.copia.situacao === 'pendente'
                    ? 'Enviando a cópia…'
                    : 'Não foi possível enviar a cópia.'}
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

        {mostrarBotao ? (
          <>
            <Botao
              titulo={rotuloDoBotao}
              variante={situacao === 'enviado' ? 'secundario' : 'primario'}
              carregando={enviando}
              onPress={() => void enviarLink()}
            />
            {restantes !== undefined && situacao === 'enviado' ? (
              <ThemedText type="small" themeColor="textSecondary">
                {restantes === 1 ? '1 reenvio restante' : `${restantes} reenvios restantes`} nesta hora.
              </ThemedText>
            ) : null}
          </>
        ) : null}
      </Cartao>
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: { gap: Spacing.three },
  campo: { gap: Spacing.one },
  email: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 12, borderWidth: 1 },
  estado: { gap: Spacing.two },
  copia: { gap: Spacing.two },
  estadoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  estadoTextos: { flex: 1, gap: 2 },
  estadoTitulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 15, lineHeight: 22 },
  ponto: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
});
