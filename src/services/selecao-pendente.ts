import type { Cliente, Veiculo } from '@/types/api';

type Tipo = 'cliente' | 'veiculo';
type Registro = Cliente | Veiculo;

/**
 * Ponte entre telas: ao cadastrar um cliente ou veículo a partir do checklist, o formulário deixa o registro
 * salvo aqui e o passo 1 o consome ao voltar ao foco, selecionando-o sem o motorista perder o checklist.
 */
const pendentes: Partial<Record<Tipo, Registro>> = {};

export function definirSelecaoPendente(tipo: Tipo, registro: Registro): void {
  pendentes[tipo] = registro;
}

export function consumirSelecaoPendente<T extends Registro>(tipo: Tipo): T | undefined {
  const registro = pendentes[tipo] as T | undefined;
  delete pendentes[tipo];

  return registro;
}
