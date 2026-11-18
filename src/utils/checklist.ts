import type { Avaria, Checklist, FotoChecklist, ItemChecklist } from '@/types/api';

/** Chave do item "Outros" no catálogo: quando presente, exige a descrição. */
export const ITEM_OUTROS = 'outros';

/** Erros por campo do passo; vazio quando o passo está completo. As mensagens são as mesmas que a API devolve no envio. */
export type ErrosDoPasso = Partial<Record<string, string>>;

const vazio = (texto: string | null | undefined): boolean => !texto || texto.trim() === '';

/**
 * Campos obrigatórios de cada passo, para bloquear o avanço antes do envio. A API repete a mesma validação em
 * `POST /checklists/{id}/enviar`, que é a que vale.
 */
export function validarPasso(passo: number, checklist: Checklist): ErrosDoPasso {
  const erros: ErrosDoPasso = {};

  if (passo === 1) {
    if (!checklist.cliente) erros.cliente_id = 'Escolha o cliente.';
    if (!checklist.veiculo) erros.veiculo_id = 'Escolha o veículo.';
    if (vazio(checklist.local_retirada)) erros.local_retirada = 'Informe o local de retirada.';
    if (vazio(checklist.destino)) erros.destino = 'Informe o destino.';
    if (checklist.cliente_acompanha === null) erros.cliente_acompanha = 'Informe se o cliente acompanha o serviço.';
  }

  if (passo === 3) {
    if (!checklist.pneus.dianteiro) erros.pneu_dianteiro = 'Informe o estado do pneu dianteiro.';
    if (!checklist.pneus.traseiro) erros.pneu_traseiro = 'Informe o estado do pneu traseiro.';
    if (!checklist.pneus.estepe) erros.pneu_estepe = 'Informe o estado do estepe.';
    if (!checklist.combustivel) erros.combustivel = 'Informe o nível de combustível.';

    const outros = checklist.itens.find((item) => item.item === ITEM_OUTROS);

    if (outros?.presente && vazio(outros.observacao)) erros.item_outros = 'Descreva o item "Outros".';
  }

  return erros;
}

/** Texto do tipo no indicador de passos: "Retirada" ou "Entrega". */
export function rotuloDoTipo(tipo: Checklist['tipo']): string {
  return tipo === 'entrega' ? 'Entrega' : 'Retirada';
}

/** Recalcula as contagens a partir das listas do checklist (avarias, itens presentes, fotos e itens sem foto). */
export function recontar(checklist: Checklist): Checklist {
  const fotosDeAvarias = checklist.avarias.reduce((total, avaria) => total + avaria.fotos.length, 0);
  const fotosDeItens = checklist.itens.reduce((total, item) => total + item.fotos.length, 0);
  const presentes = checklist.itens.filter((item) => item.presente);

  return {
    ...checklist,
    contagens: {
      avarias: checklist.avarias.length,
      fotos: fotosDeAvarias + fotosDeItens,
      itens_presentes: presentes.length,
      itens_sem_foto: presentes.filter((item) => item.fotos.length === 0).length,
    },
  };
}

/** Aviso (não impede o envio) de itens presentes sem foto; a API devolve o mesmo texto no envio. */
export function avisoDeItensSemFoto(quantidade: number): string[] {
  return quantidade === 0 ? [] : [`${quantidade} ${quantidade === 1 ? 'item' : 'itens'} sem foto`];
}

/** Texto da linha de um item: "Sem foto", "N foto(s)" e, se houver, "com observação". */
export function resumoDoItem(item: ItemChecklist): string {
  const fotos = item.fotos.length === 0 ? 'Sem foto' : item.fotos.length === 1 ? '1 foto' : `${item.fotos.length} fotos`;

  return item.observacao ? `${fotos} · com observação` : fotos;
}

/** Substitui o item (do catálogo) pelo que a API devolveu. */
export function comItem(checklist: Checklist, item: ItemChecklist): Checklist {
  return recontar({
    ...checklist,
    itens: checklist.itens.map((atual) => (atual.item === item.item ? item : atual)),
  });
}

/** Acrescenta a foto ao item (sem duplicar se o reenvio devolveu a mesma). */
export function comFotoNoItem(checklist: Checklist, chave: string, foto: FotoChecklist): Checklist {
  return recontar({
    ...checklist,
    itens: checklist.itens.map((item) =>
      item.item === chave && !item.fotos.some((atual) => atual.id === foto.id) ? { ...item, fotos: [...item.fotos, foto] } : item,
    ),
  });
}

/** Insere a avaria, ou substitui a que já existe com o mesmo id (edição e reenvio idempotente). */
export function comAvaria(checklist: Checklist, avaria: Avaria): Checklist {
  const existe = checklist.avarias.some((atual) => atual.id === avaria.id);
  const avarias = existe
    ? checklist.avarias.map((atual) => (atual.id === avaria.id ? avaria : atual))
    : [...checklist.avarias, avaria];

  return recontar({ ...checklist, avarias });
}

export function semAvaria(checklist: Checklist, avariaId: number): Checklist {
  return recontar({ ...checklist, avarias: checklist.avarias.filter((avaria) => avaria.id !== avariaId) });
}

/** Acrescenta a foto à avaria (sem duplicar se o reenvio devolveu a mesma). */
export function comFotoNaAvaria(checklist: Checklist, avariaId: number, foto: FotoChecklist): Checklist {
  return recontar({
    ...checklist,
    avarias: checklist.avarias.map((avaria) =>
      avaria.id === avariaId && !avaria.fotos.some((atual) => atual.id === foto.id)
        ? { ...avaria, fotos: [...avaria.fotos, foto] }
        : avaria,
    ),
  });
}

export function semFoto(checklist: Checklist, fotoId: number): Checklist {
  return recontar({
    ...checklist,
    avarias: checklist.avarias.map((avaria) => ({ ...avaria, fotos: avaria.fotos.filter((foto) => foto.id !== fotoId) })),
    itens: checklist.itens.map((item) => ({ ...item, fotos: item.fotos.filter((foto) => foto.id !== fotoId) })),
  });
}

export type PeriodoDaLista = 'todos' | 'hoje' | '7dias' | '30dias';

export const PERIODOS: { valor: PeriodoDaLista; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todo o período' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7dias', rotulo: '7 dias' },
  { valor: '30dias', rotulo: '30 dias' },
];

const doisDigitos = (numero: number): string => String(numero).padStart(2, '0');

/** Data local no formato AAAA-MM-DD, o que a API espera em `de` e `ate` (dia de Brasília). */
export function dataIso(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** Converte o período escolhido nos filtros `de` e `ate` da listagem. */
export function periodoParaDatas(periodo: PeriodoDaLista, agora: Date = new Date()): { de?: string; ate?: string } {
  if (periodo === 'todos') return {};

  const dias = periodo === 'hoje' ? 0 : periodo === '7dias' ? 6 : 29;
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - dias);

  return { de: dataIso(inicio), ate: dataIso(agora) };
}
