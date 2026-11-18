/**
 * Dinheiro do Financeiro: valores em centavos inteiros (nunca decimais). Sem `Intl` (o do Hermes varia por
 * plataforma) e sem dependência. Este arquivo é puro de propósito: é verificado pelo Node em
 * specs/004-financeiro/verificacao/dinheiro.mts.
 */

/** R$ 1.000.000,00: acima disso o valor é tratado como provável erro de digitação. */
export const LIMITE_EM_CENTAVOS = 100000000;

/** `123456` → `R$ 1.234,56`. */
export function formatarReais(centavos: number): string {
  const negativo = centavos < 0;
  const absoluto = Math.abs(Math.trunc(centavos));
  const reais = Math.floor(absoluto / 100);
  const resto = absoluto % 100;
  const inteiro = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${negativo ? '-' : ''}R$ ${inteiro},${String(resto).padStart(2, '0')}`;
}

/** Valor ainda não definido pelo administrador aparece como "Valor a definir". */
export function formatarValorOuIndefinido(centavos: number | null): string {
  return centavos === null ? 'Valor a definir' : formatarReais(centavos);
}

/** Só os dígitos viram o valor em centavos: `"R$ 1.234,56"` → `123456`; sem dígitos → `0`. */
export function centavosDeDigitos(texto: string): number {
  const digitos = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

  return digitos === '' ? 0 : Number(digitos.slice(0, 12));
}

/** Máscara do campo de valor: digitar `123456` mostra `R$ 1.234,56`; ignora letras e limita ao máximo. */
export function mascaraDeReais(texto: string): string {
  const centavos = Math.min(centavosDeDigitos(texto), LIMITE_EM_CENTAVOS);

  return formatarReais(centavos);
}
