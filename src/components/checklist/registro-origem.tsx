import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { FotoAmpliada } from '@/components/checklist/miniatura-foto';
import { BlocoDeAvarias, BlocoDeItens } from '@/components/checklist/resumo-checklist';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Checklist, FotoChecklist } from '@/types/api';
import { formatarQuando } from '@/utils/formatadores';

interface RegistroOrigemProps {
  /** Retirada de origem da entrega (`checklist.origem.id`). */
  origemId: number;
  /** O que mostrar: as avarias (passo 2) ou os itens (passo 3). */
  parte: 'avarias' | 'itens';
}

/**
 * Painel somente leitura com o que foi registrado na retirada, para conferir na entrega o estado em que o veículo
 * saiu. Só busca a retirada (`GET /checklists/{id}`) quando o motorista abre o painel.
 */
export function RegistroOrigem({ origemId, parte }: RegistroOrigemProps) {
  const theme = useTheme();
  const [aberto, setAberto] = useState(false);
  const [retirada, setRetirada] = useState<Checklist>();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [ampliada, setAmpliada] = useState<FotoChecklist>();

  async function alternar() {
    if (aberto) {
      setAberto(false);

      return;
    }

    setAberto(true);

    if (retirada) return;

    setCarregando(true);
    setErro(undefined);

    try {
      setRetirada(await api<Checklist>(`/checklists/${origemId}`));
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar a retirada.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={estilos.bloco}>
      <Botao titulo={aberto ? 'Ocultar registro da retirada' : 'Ver registro da retirada'} variante="secundario" onPress={() => void alternar()} />

      {aberto ? (
        <Cartao style={estilos.painel}>
          {carregando ? <ActivityIndicator /> : null}

          {erro ? <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText> : null}

          {retirada ? (
            <>
              <ThemedText type="smallBold">
                {parte === 'avarias' ? 'Avarias' : 'Itens'} na retirada · {formatarQuando(retirada.enviado_em ?? retirada.created_at)}
              </ThemedText>
              {parte === 'avarias' ? (
                <BlocoDeAvarias checklist={retirada} onAmpliar={setAmpliada} />
              ) : (
                <BlocoDeItens checklist={retirada} onAmpliar={setAmpliada} />
              )}
            </>
          ) : null}
        </Cartao>
      ) : null}

      <FotoAmpliada foto={ampliada} onFechar={() => setAmpliada(undefined)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Spacing.two },
  painel: { gap: Spacing.two },
});
