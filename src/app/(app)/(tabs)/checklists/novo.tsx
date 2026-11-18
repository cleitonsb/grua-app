import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { ChecklistRecenteItem } from '@/components/checklist-recente-item';
import { FormularioTela } from '@/components/formulario-tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Checklist, ChecklistResumo, Pagina, TipoChecklist } from '@/types/api';

const MENSAGEM_SEM_CAMINHAO = 'Você ainda não tem caminhão associado. Fale com o administrador para criar um checklist.';

/**
 * Escolha do tipo de checklist. A entrega pode partir de uma retirada já enviada (copia cliente, veículo e rota) ou
 * ser criada sem origem.
 */
export default function NovoChecklistScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [criando, setCriando] = useState(false);
  const [escolhendoOrigem, setEscolhendoOrigem] = useState(false);
  const [retiradas, setRetiradas] = useState<ChecklistResumo[]>();
  const [carregandoRetiradas, setCarregandoRetiradas] = useState(false);
  const [erro, setErro] = useState<string>();

  async function criar(tipo: TipoChecklist, origemId?: number) {
    setCriando(true);
    setErro(undefined);

    try {
      const checklist = await api<Checklist>('/checklists', {
        method: 'POST',
        body: origemId === undefined ? { tipo } : { tipo, origem_id: origemId },
      });

      router.replace(`/checklists/${checklist.id}/editar`);
    } catch (excecao) {
      setErro(
        excecao instanceof ApiError && excecao.status === 403
          ? MENSAGEM_SEM_CAMINHAO
          : excecao instanceof ApiError
            ? excecao.message
            : 'Não foi possível criar o checklist. Tente novamente.',
      );
      setCriando(false);
    }
  }

  async function escolherOrigem() {
    setEscolhendoOrigem(true);
    setErro(undefined);

    if (retiradas) return;

    setCarregandoRetiradas(true);

    try {
      const pagina = await api<Pagina<ChecklistResumo>>('/checklists', { query: { tipo: 'retirada', per_page: 50 } });

      setRetiradas(pagina.data.filter((checklist) => checklist.status !== 'rascunho'));
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar as retiradas.');
      setEscolhendoOrigem(false);
    } finally {
      setCarregandoRetiradas(false);
    }
  }

  return (
    <FormularioTela titulo="Novo checklist">
      <ThemedText themeColor="textSecondary">
        {escolhendoOrigem
          ? 'Escolha a retirada que está sendo entregue. Cliente, veículo e rota são copiados para a entrega.'
          : 'Escolha o tipo de serviço. O checklist é salvo automaticamente e você pode continuar de onde parou.'}
      </ThemedText>

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erro}
        </ThemedText>
      ) : null}

      {escolhendoOrigem ? (
        <>
          {carregandoRetiradas ? <ActivityIndicator /> : null}

          {retiradas?.length === 0 ? (
            <ThemedText themeColor="textSecondary">Você ainda não tem retiradas enviadas.</ThemedText>
          ) : (
            <View style={estilos.retiradas}>
              {retiradas?.map((retirada) => (
                <ChecklistRecenteItem key={retirada.id} checklist={retirada} onPress={criando ? undefined : () => void criar('entrega', retirada.id)} />
              ))}
            </View>
          )}

          <Botao titulo="Entrega sem retirada de origem" variante="secundario" onPress={() => void criar('entrega')} carregando={criando} />
          <Botao titulo="Voltar" variante="secundario" onPress={() => setEscolhendoOrigem(false)} desabilitado={criando} />
        </>
      ) : (
        <>
          <Botao titulo="Retirada" onPress={() => void criar('retirada')} carregando={criando} />
          <Botao titulo="Entrega" onPress={() => void escolherOrigem()} desabilitado={criando} />
          <Botao titulo="Cancelar" variante="secundario" onPress={() => router.back()} desabilitado={criando} />
        </>
      )}
    </FormularioTela>
  );
}

const estilos = StyleSheet.create({
  retiradas: { gap: Spacing.two },
});
