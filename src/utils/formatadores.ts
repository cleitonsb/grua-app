/** Máscaras e formatação de CPF/CNPJ, telefone e placa. A API recebe e devolve só dígitos (ou placa sem hífen). */

export const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

function aplicarMascara(digitos: string, grupos: number[], separadores: string[]): string {
  let resultado = '';
  let posicao = 0;

  for (let indice = 0; indice < grupos.length && posicao < digitos.length; indice++) {
    resultado += digitos.slice(posicao, posicao + grupos[indice]);
    posicao += grupos[indice];

    if (posicao < digitos.length) {
      resultado += separadores[indice];
    }
  }

  return resultado;
}

/** CPF (000.000.000-00) até 11 dígitos; acima disso, CNPJ (00.000.000/0000-00). */
export function formatarCpfCnpj(valor: string | null | undefined): string {
  const digitos = apenasDigitos(valor ?? '').slice(0, 14);

  return digitos.length <= 11
    ? aplicarMascara(digitos, [3, 3, 3, 2], ['.', '.', '-'])
    : aplicarMascara(digitos, [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
}

/** Telefone com DDD: (61) 3333-4444 ou (61) 99999-8888. */
export function formatarTelefone(valor: string | null | undefined): string {
  const digitos = apenasDigitos(valor ?? '').slice(0, 11);

  if (digitos.length === 0) {
    return '';
  }

  if (digitos.length <= 2) {
    return `(${digitos}`;
  }

  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }

  const corte = digitos.length > 10 ? 7 : 6;

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, corte)}-${digitos.slice(corte)}`;
}

/** Placa em maiúsculas e sem hífen, até 7 caracteres (é como a API guarda). */
export function normalizarPlaca(valor: string): string {
  return valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
}

/** Placa completa e válida: formato antigo (ABC1234) ou Mercosul (ABC1D23), com ou sem hífen. */
export function placaValida(valor: string): boolean {
  const placa = normalizarPlaca(valor);

  return /^[A-Z]{3}\d{4}$/.test(placa) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa);
}

/** Placa para exibição: formato antigo com hífen (ABC-1234); Mercosul sem (ABC1D23). */
export function formatarPlaca(valor: string): string {
  const placa = normalizarPlaca(valor);

  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

/** Iniciais para o avatar: primeira e última inicial do nome ("Almir Souza" → "AS"); nome único usa as duas primeiras letras ("Almir" → "AL"). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return '?';
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** "hoje, 20:12" para o dia atual e "17/11, 20:12" para os demais, no horário de Brasília. */
export function formatarQuando(dataHoraIso: string, agora: Date = new Date()): string {
  const data = new Date(dataHoraIso);

  if (Number.isNaN(data.getTime())) {
    return '';
  }

  const opcoes = { timeZone: 'America/Sao_Paulo' } as const;

  try {
    const hora = data.toLocaleTimeString('pt-BR', { ...opcoes, hour: '2-digit', minute: '2-digit' });
    const dia = data.toLocaleDateString('pt-BR', { ...opcoes, day: '2-digit', month: '2-digit' });
    const hoje = agora.toLocaleDateString('pt-BR', { ...opcoes, day: '2-digit', month: '2-digit' });

    return `${dia === hoje ? 'hoje' : dia}, ${hora}`;
  } catch {
    return data.toLocaleString('pt-BR');
  }
}

/** "18/11 às 14:30" (sempre com o dia), no horário de Brasília. */
export function formatarDiaEHora(dataHoraIso: string): string {
  const data = new Date(dataHoraIso);

  if (Number.isNaN(data.getTime())) {
    return '';
  }

  const opcoes = { timeZone: 'America/Sao_Paulo' } as const;

  try {
    const hora = data.toLocaleTimeString('pt-BR', { ...opcoes, hour: '2-digit', minute: '2-digit' });
    const dia = data.toLocaleDateString('pt-BR', { ...opcoes, day: '2-digit', month: '2-digit' });

    return `${dia} às ${hora}`;
  } catch {
    return data.toLocaleString('pt-BR');
  }
}

/** Texto de quem não foi informado (cliente e veículo são opcionais no checklist). */
export const NAO_INFORMADO = 'Não informado';

/** Nome do cliente para listas; o cadastro pode existir sem nome. */
export function nomeDoCliente(nome: string | null | undefined): string {
  return nome?.trim() || 'Cliente sem nome';
}

/** Junta só o que foi preenchido, separado por " · " (ex.: documento e telefone; modelo, placa e cor). */
export function juntarPreenchidos(partes: (string | null | undefined)[]): string {
  return partes.filter((parte): parte is string => Boolean(parte?.trim())).join(' · ');
}

/** "Modelo · ABC-1234" com o que existir; a placa é sempre conhecida, modelo e cor podem faltar. */
export function descricaoDoVeiculo(veiculo: { placa: string; modelo?: string | null; cor?: string | null }, comCor = false): string {
  return juntarPreenchidos([veiculo.modelo, formatarPlaca(veiculo.placa), comCor ? veiculo.cor : null]);
}
