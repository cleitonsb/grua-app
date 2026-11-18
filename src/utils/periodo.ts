/**
 * Mês e datas do Financeiro no horário de Brasília (UTC−3; o Brasil não tem horário de verão desde 2019). Puro de
 * propósito: verificado pelo Node em specs/004-financeiro/verificacao/periodo.mts. O mês viaja como `AAAA-MM` e a
 * data como `AAAA-MM-DD` (API) ou `dd/mm/aaaa` (tela).
 */

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const DESLOCAMENTO_DE_BRASILIA_MS = 3 * 60 * 60 * 1000;

const doisDigitos = (numero: number) => String(numero).padStart(2, '0');

/** Relógio de Brasília como um `Date` cujos campos UTC são a hora local de lá. */
function emBrasilia(agora: Date): Date {
  return new Date(agora.getTime() - DESLOCAMENTO_DE_BRASILIA_MS);
}

/** `AAAA-MM` do mês atual em Brasília. */
export function mesAtual(agora: Date = new Date()): string {
  const local = emBrasilia(agora);

  return `${local.getUTCFullYear()}-${doisDigitos(local.getUTCMonth() + 1)}`;
}

/** `AAAA-MM-DD` de hoje em Brasília. */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  const local = emBrasilia(agora);

  return `${local.getUTCFullYear()}-${doisDigitos(local.getUTCMonth() + 1)}-${doisDigitos(local.getUTCDate())}`;
}

function somarMeses(mes: string, delta: number): string {
  const [ano, numero] = mes.split('-').map(Number);
  const indice = ano * 12 + (numero - 1) + delta;

  return `${Math.floor(indice / 12)}-${doisDigitos((indice % 12) + 1)}`;
}

export const mesAnterior = (mes: string): string => somarMeses(mes, -1);

export const proximoMes = (mes: string): string => somarMeses(mes, 1);

/** `2026-11` → `Novembro`. */
export function rotuloDoMes(mes: string): string {
  return MESES[Number(mes.split('-')[1]) - 1] ?? mes;
}

/** `2026-11` → `Novembro de 2026`. */
export function rotuloCompletoDoMes(mes: string): string {
  return `${rotuloDoMes(mes)} de ${mes.split('-')[0]}`;
}

/** `dd/mm/aaaa` → `AAAA-MM-DD`; `null` se não for uma data existente. */
export function dataParaIso(texto: string): string | null {
  const partes = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!partes) {
    return null;
  }

  const [, dia, mes, ano] = partes;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const existe = data.getUTCFullYear() === Number(ano) && data.getUTCMonth() === Number(mes) - 1 && data.getUTCDate() === Number(dia);

  return existe ? `${ano}-${mes}-${dia}` : null;
}

/** `AAAA-MM-DD` → `dd/mm/aaaa`. */
export function isoParaData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');

  return `${dia}/${mes}/${ano}`;
}

/** Máscara do campo de data: `18112026` → `18/11/2026` (ignora tudo que não for dígito). */
export function mascaraDeData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;

  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}
