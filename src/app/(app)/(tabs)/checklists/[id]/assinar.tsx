import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { Cartao } from '@/components/cartao';
import { PROPORCAO_DO_QUADRO, QuadroDeAssinatura, type Tracos } from '@/components/quadro-de-assinatura';
import { RodapeFixo } from '@/components/rodape-fixo';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAssinatura } from '@/hooks/use-assinatura';
import { useIniciarEntrega } from '@/hooks/use-iniciar-entrega';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Checklist } from '@/types/api';

/**
 * Fim do registro, na tela do motorista: depois de concluir a retirada ou a entrega, o cliente pode assinar com o
 * dedo. A assinatura é opcional: o motorista conclui sem ela. Na retirada, o passo seguinte é a entrega dela.
 */
export default function AssinarChecklistScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useSession();
  const [checklist, setChecklist] = useState<Checklist>();
  const [erro, setErro] = useState<string>();
  const [tracos, setTracos] = useState<Tracos>([]);
  const [semAssinatura, setSemAssinatura] = useState(false);
  const assinatura = useAssinatura(id, checklist !== undefined && checklist.status !== 'rascunho');
  const entrega = useIniciarEntrega(id);

  useEffect(() => {
    let ativo = true;

    api<Checklist>(`/checklists/${id}`)
      .then((resposta) => ativo && setChecklist(resposta))
      .catch((excecao) => ativo && setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar o checklist.'));

    return () => {
      ativo = false;
    };
  }, [id]);

  const detalhe = `/checklists/${id}` as const;

  if (usuario && usuario.papel !== 'motorista') {
    return <Redirect href={detalhe} />;
  }

  if (checklist?.status === 'rascunho') {
    return <Redirect href={`/checklists/${id}/editar`} />;
  }

  const nome = checklist?.tipo === 'entrega' ? 'Entrega' : 'Retirada';
  const estado = assinatura.estado;
  const assinado = estado?.situacao === 'assinado';
  // Já assinado antes (ou o motorista escolheu seguir sem assinar): só falta o passo seguinte.
  const finalizado = assinado || semAssinatura || (estado !== undefined && !estado.pode_assinar);

  async function confirmar() {
    await assinatura.assinar(tracos, PROPORCAO_DO_QUADRO);
  }

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo={finalizado ? `${nome} concluída` : 'Assinatura do cliente'}
        subtitulo={finalizado ? undefined : `${nome} concluída`}
        aoVoltar={() => router.replace(detalhe)}
      />

      <View style={estilos.conteudo}>
        <View style={estilos.coluna}>
          {erro ? <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText> : null}
          {!checklist && !erro ? <ActivityIndicator /> : null}

          {checklist && !finalizado ? (
            <>
              <ThemedText themeColor="textSecondary">
                Passe o celular ao cliente para assinar com o dedo. A assinatura é opcional: você pode concluir sem ela.
              </ThemedText>

              {estado?.declaracao ? (
                <Cartao>
                  <ThemedText type="small">{estado.declaracao}</ThemedText>
                </Cartao>
              ) : null}

              <QuadroDeAssinatura tracos={tracos} aoMudar={setTracos} desabilitado={assinatura.enviando} />

              <Botao titulo="Limpar" variante="secundario" onPress={() => setTracos([])} desabilitado={tracos.length === 0 || assinatura.enviando} />

              {assinatura.erroAcao ? (
                <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                  {assinatura.erroAcao}
                </ThemedText>
              ) : null}
            </>
          ) : null}

          {checklist && finalizado ? (
            <>
              <Cartao>
                <ThemedText type="smallBold">{assinado ? 'Assinado pelo cliente' : 'Concluída sem assinatura do cliente'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {assinado
                    ? 'A assinatura foi gravada e o checklist não pode mais ser alterado.'
                    : 'O checklist está concluído e não pode mais ser alterado. A assinatura pode ser colhida depois, pelo detalhe do checklist.'}
                </ThemedText>
              </Cartao>

              {checklist.tipo === 'retirada' ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Toda retirada tem uma entrega. Inicie a entrega agora ou depois, pelo detalhe da retirada.
                </ThemedText>
              ) : null}

              {entrega.erro ? (
                <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
                  {entrega.erro}
                </ThemedText>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      {checklist && !finalizado ? (
        <RodapeFixo
          secundario={{ titulo: 'Concluir sem assinatura', aoTocar: () => setSemAssinatura(true), desabilitado: assinatura.enviando }}
          principal={{ titulo: 'Confirmar assinatura', aoTocar: () => void confirmar(), carregando: assinatura.enviando, desabilitado: tracos.length === 0 }}
        />
      ) : null}

      {checklist && finalizado && checklist.tipo === 'retirada' ? (
        <RodapeFixo
          secundario={{ titulo: 'Fazer depois', aoTocar: () => router.replace('/'), desabilitado: entrega.iniciando }}
          principal={{
            titulo: checklist.entrega ? 'Abrir entrega' : 'Iniciar entrega',
            aoTocar: () => (checklist.entrega ? router.replace(`/checklists/${checklist.entrega.id}`) : void entrega.iniciar()),
            carregando: entrega.iniciando,
          }}
        />
      ) : null}

      {checklist && finalizado && checklist.tipo === 'entrega' ? (
        <RodapeFixo principal={{ titulo: 'Concluir', aoTocar: () => router.replace('/') }} />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flex: 1, padding: Spacing.three },
  coluna: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
});
