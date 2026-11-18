/**
 * Converte a posição horizontal de um toque ou arrasto na trilha em um índice entre as paradas do controle de
 * nível (por exemplo, as cinco do combustível). Função pura: o componente só passa as medidas.
 *
 * - `x` menor ou igual a 0 → primeira parada; `x` maior ou igual a `largura` → última;
 * - no meio, a parada mais próxima (as paradas ficam espaçadas por igual de ponta a ponta);
 * - `total` menor que 2 ou `largura` menor ou igual a 0 → 0.
 */
export function posicaoParaIndice(x: number, largura: number, total: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(largura) || total < 2 || largura <= 0) {
    return 0;
  }

  if (x <= 0) return 0;
  if (x >= largura) return total - 1;

  return Math.round((x / largura) * (total - 1));
}

/** Posição (0 a 1) da parada `indice` na trilha, para desenhar o marcador. */
export function indiceParaFracao(indice: number, total: number): number {
  if (total < 2) return 0;

  return Math.min(Math.max(indice, 0), total - 1) / (total - 1);
}
