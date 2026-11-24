/** Tipos do contrato da API (specs/001-auth-cadastros/contracts/openapi.yaml). */

export type Papel = 'administrador' | 'motorista';

export interface Usuario {
  id: number;
  name: string;
  usuario: string;
  papel: Papel;
  ativo: boolean;
  deve_trocar_senha: boolean;
}

export interface Caminhao {
  id: number;
  placa: string;
  modelo: string;
  tipo_plataforma: string;
  ativo: boolean;
}

export interface Cliente {
  id: number;
  /** Todos os campos do cliente são opcionais ("Não informado"). */
  nome: string | null;
  documento: string | null;
  telefone: string | null;
  email_assinatura: string | null;
  rg: string | null;
  ativo: boolean;
}

export interface Veiculo {
  id: number;
  /** Só a placa é obrigatória. */
  placa: string;
  modelo: string | null;
  cor: string | null;
  ativo: boolean;
}

export interface Motorista {
  id: number;
  /** Id do usuário, usado para redefinir a senha. */
  user_id: number;
  nome: string;
  usuario: string;
  cnh_categoria: string;
  telefone: string;
  caminhao: Caminhao | null;
  ativo: boolean;
}

export interface Administrador {
  id: number;
  nome: string;
  usuario: string;
  ativo: boolean;
}

export interface Pagina<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface RespostaLogin {
  token: string;
  user: Usuario;
}

/** `concluido`: enviado e imutável. `assinado`: concluído e o cliente assinou na tela do motorista (opcional). */
export type StatusChecklist = 'rascunho' | 'concluido' | 'assinado';
export type TipoChecklist = 'retirada' | 'entrega';
export type TipoAvaria = 'batido' | 'riscado' | 'danificado' | 'falta';
export type EstadoPneu = 'bom' | 'medio' | 'ruim';
export type NivelCombustivel = 'vazio' | 'um_quarto' | 'meio' | 'tres_quartos' | 'cheio';

/** Item de um catálogo fixo da API (`GET /checklists/catalogo`): chave estável e rótulo em português. */
export interface OpcaoCatalogo {
  valor: string;
  rotulo: string;
}

export interface Catalogo {
  itens: OpcaoCatalogo[];
  partes: OpcaoCatalogo[];
  tipos_avaria: OpcaoCatalogo[];
  estados_pneu: OpcaoCatalogo[];
  niveis_combustivel: OpcaoCatalogo[];
  limites: {
    avarias: number;
    fotos_por_item: number;
    fotos_por_avaria: number;
    fotos_por_checklist: number;
  };
}

export interface FotoChecklist {
  id: number;
  client_uuid: string;
  /** Rota autenticada da API (precisa do cabeçalho Authorization). */
  arquivo_url: string;
  miniatura_url: string;
  largura: number;
  altura: number;
  criada_em: string;
}

export interface Avaria {
  id: number;
  client_uuid: string;
  parte: string;
  parte_rotulo: string;
  tipo: TipoAvaria;
  /** Posição normalizada (0 a 1) sobre o desenho do veículo. */
  pos_x: number;
  pos_y: number;
  fotos: FotoChecklist[];
}

export interface ItemChecklist {
  item: string;
  rotulo: string;
  presente: boolean;
  observacao: string | null;
  fotos: FotoChecklist[];
}

/** Cliente do checklist: o cadastro enquanto é rascunho, o snapshot depois do envio. */
export interface ClienteChecklist {
  id?: number;
  nome: string | null;
  documento: string | null;
  telefone: string | null;
  email_assinatura: string | null;
}

export interface CorrecaoChecklist {
  autor: string;
  motivo: string;
  alteracoes: Record<string, { de: unknown; para: unknown }>;
  criada_em: string;
}

export interface Checklist {
  id: number;
  tipo: TipoChecklist;
  status: StatusChecklist;
  versao: number;
  /** Verdadeiro só para o motorista dono, em rascunho. */
  editavel: boolean;
  passo_atual: number;
  motorista: { id: number; nome: string };
  caminhao: Caminhao | null;
  cliente: ClienteChecklist | null;
  /** Placa digitada (obrigatória); o checklist não usa mais veículo cadastrado. */
  placa: string | null;
  /** Combinados na retirada (a entrega é a mesma operação e não os tem). */
  valor_centavos: number | null;
  forma_pagamento: FormaPagamento | null;
  /** Na retirada: o único lançamento da operação; nulo antes de concluir. */
  lancamento?: { id: number; situacao: SituacaoLancamento; valor_centavos: number | null; forma_pagamento: FormaPagamento | null; pago_em: string | null } | null;
  local_retirada: string | null;
  destino: string | null;
  cliente_acompanha: boolean | null;
  pneus: { dianteiro: EstadoPneu | null; traseiro: EstadoPneu | null; estepe: EstadoPneu | null };
  combustivel: NivelCombustivel | null;
  observacoes_avarias: string | null;
  observacoes_gerais: string | null;
  avarias: Avaria[];
  itens: ItemChecklist[];
  contagens: { itens_presentes: number; fotos: number; avarias: number; itens_sem_foto: number };
  origem: { id: number; data_hora: string } | null;
  /** Na retirada: a entrega dela (cada retirada tem uma); nulo enquanto não foi iniciada. */
  entrega?: { id: number; status: StatusChecklist } | null;
  enviado_em: string | null;
  /** Data e hora da assinatura do cliente; nulo enquanto não assinado. */
  assinada_em: string | null;
  correcoes: CorrecaoChecklist[];
  created_at: string;
}

/** Linha da lista de checklists (`GET /checklists`). */
export interface ChecklistResumo {
  id: number;
  tipo: TipoChecklist;
  status: StatusChecklist;
  cliente: string | null;
  placa: string | null;
  motorista: string;
  data_hora: string;
  passo_atual: number;
}

/** Campos do autosave (`PATCH /checklists/{id}`); só os enviados mudam. */
export interface ChecklistAtualizacao {
  cliente_id?: number | null;
  placa?: string | null;
  valor_centavos?: number | null;
  forma_pagamento?: FormaPagamento | null;
  local_retirada?: string | null;
  destino?: string | null;
  cliente_acompanha?: boolean | null;
  pneu_dianteiro?: EstadoPneu | null;
  pneu_traseiro?: EstadoPneu | null;
  pneu_estepe?: EstadoPneu | null;
  combustivel?: NivelCombustivel | null;
  observacoes_avarias?: string | null;
  observacoes_gerais?: string | null;
  passo_atual?: number;
  versao_base?: number;
}

/** Resposta comum das gravações do rascunho. */
export interface EscritaResposta {
  versao: number;
  /** Verdadeiro quando `versao_base` não era a versão atual: outro aparelho alterou antes. */
  conflito: boolean;
}

/** Resposta de `POST/PUT /checklists/{id}/avarias`. */
export interface AvariaResposta extends EscritaResposta {
  avaria: Avaria;
}

/** Resposta de `PUT /checklists/{id}/itens/{item}`. */
export interface ItemResposta extends EscritaResposta {
  item: ItemChecklist;
}

/** Resposta de `POST /checklists/{id}/fotos`. */
export interface FotoResposta extends EscritaResposta {
  foto: FotoChecklist;
}

/** Resposta de `DELETE` de avaria ou foto: nova versão e as contagens atualizadas. */
export interface RemocaoResposta extends EscritaResposta {
  contagens: { avarias: number; fotos: number };
}

export interface Faltante {
  campo: string;
  passo: number;
  mensagem: string;
}

export interface EnvioResposta {
  checklist: Checklist;
  avisos: string[];
}

/** Rascunho em andamento listado no Início ("Continuar checklist"). */
export interface RascunhoResumo {
  id: number;
  tipo: TipoChecklist;
  passo_atual: number;
  placa: string | null;
  atualizado_em: string;
}

/** Situação de uma operação (retirada e entrega, com um financeiro só): pago vale mais que assinado, que vale mais que concluído. */
export type SituacaoDaOperacao = 'concluido' | 'assinado' | 'pago';

/** Item da lista "Operações recentes" do Início: `id` é o da retirada. */
export interface OperacaoRecente {
  id: number;
  placa: string | null;
  cliente: string | null;
  data_hora: string;
  situacao: SituacaoDaOperacao;
}

export interface InicioResposta {
  saudacao: string;
  nome: string;
  caminhao: Caminhao | null;
  contadores: {
    hoje: number;
    /** Enviados (com ou sem assinatura). */
    concluidos: number;
    assinados: number;
  };
  recentes: OperacaoRecente[];
  /** Rascunhos do motorista (o administrador não tem), do alterado mais recentemente ao mais antigo. */
  rascunhos: RascunhoResumo[];
  pode_criar_checklist: boolean;
}

export interface ErroApiCorpo {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
  /** Pendências do envio de checklist incompleto (422 `checklist_incompleto`). */
  faltantes?: Faltante[];
}

/** Situação do e-mail com a cópia em PDF. */
export type SituacaoDaCopia = 'pendente' | 'enviado' | 'falhou';

/** `GET /checklists/{id}/assinatura`: estado da assinatura (opcional, colhida na tela do motorista) e da cópia por e-mail. */
export interface EstadoDaAssinatura {
  situacao: 'sem_assinatura' | 'assinado';
  /** Verdadeiro quando o checklist está concluído e ainda sem assinatura. */
  pode_assinar: boolean;
  /** Texto que o cliente aceita ao assinar, conforme o tipo do checklist. */
  declaracao: string;
  assinada_em: string | null;
  pdf_disponivel: boolean;
  copia: {
    situacao: SituacaoDaCopia;
    enviada_em: string | null;
    reenvios_restantes: number;
  } | null;
}

/** `GET /checklists/{id}/pdf`: URL assinada e temporária do PDF do checklist assinado. */
export interface UrlDoPdf {
  url: string;
  expira_em: string;
}

/** Situação de um lançamento do Financeiro (spec 004). */
export type SituacaoLancamento = 'a_receber' | 'pago' | 'cancelado';
export type OrigemLancamento = 'automatica' | 'avulso';
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao' | 'transferencia';

/** Totais do conjunto filtrado inteiro, em centavos (cancelados e sem valor ficam fora das somas). */
export interface TotaisFinanceiro {
  recebido: number;
  a_receber: number;
  /** Quantos lançamentos a receber ainda estão sem valor definido. */
  sem_valor: number;
  quantidade: number;
}

/** Item da lista (`GET /lancamentos`). Dinheiro sempre em centavos inteiros; `valor_centavos` nulo = valor a definir. */
export interface ResumoDeLancamento {
  id: number;
  origem: OrigemLancamento;
  cliente: string;
  veiculo: string | null;
  placa: string | null;
  servico_origem: string | null;
  servico_destino: string | null;
  descricao: string;
  valor_centavos: number | null;
  /** AAAA-MM-DD */
  data_competencia: string;
  situacao: SituacaoLancamento;
}

export interface ListaDeLancamentos extends Pagina<ResumoDeLancamento> {
  totais: TotaisFinanceiro;
}

/** `GET /lancamentos/meses`: meses `AAAA-MM` com lançamento, do mais novo ao mais antigo (sempre com o mês atual). */
export interface MesesDeLancamentos {
  meses: string[];
}

/** Evento do histórico de um lançamento (`de` e `para` guardam só o que mudou, valores em centavos). */
export type NomeDoEvento = 'criado' | 'valor_alterado' | 'descricao_alterada' | 'vinculos_alterados' | 'pago' | 'reaberto' | 'cancelado';

export interface EventoDoHistorico {
  evento: NomeDoEvento;
  /** Nulo = sistema (lançamento automático). */
  autor: string | null;
  de: Record<string, unknown> | null;
  para: Record<string, unknown> | null;
  criado_em: string;
}

/** O que o usuário pode fazer, calculado pelo servidor (papel e situação). O app só mostra o que a API aceita. */
export interface AcoesDoLancamento {
  editar: boolean;
  pagar: boolean;
  reabrir: boolean;
  cancelar: boolean;
}

/** `GET /lancamentos/{id}`: o resumo mais vínculos, pagamento, ações e histórico. */
export interface Lancamento extends ResumoDeLancamento {
  caminhao_placa: string | null;
  motorista: string | null;
  cliente_id: number;
  veiculo_id: number | null;
  caminhao_id: number | null;
  motorista_id: number | null;
  /** Link para o checklist de origem; nulo no lançamento avulso. */
  checklist_id: number | null;
  pago_em: string | null;
  forma_pagamento: FormaPagamento | null;
  motivo_cancelamento: string | null;
  acoes: AcoesDoLancamento;
  historico: EventoDoHistorico[];
}
