import { ThemedText } from '@/components/themed-text';
import type { EstadoSalvamento } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';

const TEXTOS: Record<EstadoSalvamento, string> = {
  salvo: 'Salvo',
  salvando: 'Salvando...',
  pendente: 'A salvar...',
  erro: 'Alteração não salva, tentando de novo...',
};

/**
 * Estado do autosave do rascunho, sempre visível para o motorista saber que nada se perde. Aparece sobre o cabeçalho
 * azul-marinho: o erro usa o âmbar (o vermelho de erro não tem contraste sobre o azul-marinho).
 */
export function SalvamentoStatus({ estado, mensagem }: { estado: EstadoSalvamento; mensagem?: string }) {
  const theme = useTheme();

  return (
    <ThemedText
      type="small"
      accessibilityLiveRegion="polite"
      numberOfLines={2}
      style={{ color: estado === 'erro' ? theme.primary : theme.textoSobreMarinho, maxWidth: 140, textAlign: 'right' }}>
      {estado === 'erro' && mensagem ? mensagem : TEXTOS[estado]}
    </ThemedText>
  );
}
