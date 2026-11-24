import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Botao } from '@/components/botao';
import { FormularioTela } from '@/components/formulario-tela';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/services/api';
import type { Checklist } from '@/types/api';

const MENSAGEM_SEM_CAMINHAO = 'Você ainda não tem caminhão associado. Fale com o administrador para criar um checklist.';

/**
 * Novo checklist: todo serviço começa por uma retirada. A entrega não é criada aqui; ela nasce de dentro da retirada,
 * no passo que a fecha (cada retirada tem uma entrega).
 */
export default function NovoChecklistScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string>();

  async function criarRetirada() {
    setCriando(true);
    setErro(undefined);

    try {
      const checklist = await api<Checklist>('/checklists', { method: 'POST', body: { tipo: 'retirada' } });

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

  return (
    <FormularioTela titulo="Nova retirada">
      <ThemedText themeColor="textSecondary">
        Todo serviço começa pela retirada. Ao enviá-la, você inicia a entrega dela. O checklist é salvo automaticamente e você
        pode continuar de onde parou.
      </ThemedText>

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erro}
        </ThemedText>
      ) : null}

      <Botao titulo="Iniciar retirada" onPress={() => void criarRetirada()} carregando={criando} />
      <Botao titulo="Cancelar" variante="secundario" onPress={() => router.back()} desabilitado={criando} />
    </FormularioTela>
  );
}
