import type { TipoAvaria } from '@/types/api';

/**
 * Desenho do veículo visto de cima, com a frente para cima. As coordenadas são normalizadas: x de 0 (esquerda) a 1
 * (direita) e y de 0 (frente) a 1 (traseira), independentes do tamanho em que o desenho é exibido. A API guarda a
 * posição da avaria nessas mesmas coordenadas (`pos_x`, `pos_y`).
 *
 * Esquerda e direita são as do veículo, que vistas de cima coincidem com as da tela.
 */
export interface Retangulo {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** O desenho é duas vezes mais alto que largo. */
export const PROPORCAO_ALTURA_LARGURA = 2;

const espelho = ({ x0, y0, x1, y1 }: Retangulo): Retangulo => ({ x0: 1 - x1, y0, x1: 1 - x0, y1 });
const retangulo = (x0: number, y0: number, x1: number, y1: number): Retangulo => ({ x0, y0, x1, y1 });

/** Faixa esquerda (da frente para a traseira); a direita é o espelho. */
const FAIXA_ESQUERDA = {
  paralama_dianteiro_esquerdo: retangulo(0.0, 0.06, 0.2, 0.14),
  roda_dianteira_esquerda: retangulo(0.0, 0.14, 0.2, 0.26),
  retrovisor_esquerdo: retangulo(0.04, 0.26, 0.2, 0.32),
  porta_dianteira_esquerda: retangulo(0.0, 0.32, 0.2, 0.48),
  porta_traseira_esquerda: retangulo(0.0, 0.48, 0.2, 0.64),
  roda_traseira_esquerda: retangulo(0.0, 0.64, 0.2, 0.78),
  paralama_traseiro_esquerdo: retangulo(0.0, 0.78, 0.2, 0.9),
} as const;

const direita = Object.fromEntries(
  Object.entries(FAIXA_ESQUERDA).map(([chave, area]) => [chave.replace('esquerd', 'direit'), espelho(area)]),
);

/**
 * Regiões tocáveis de cada parte (retângulos fechados à esquerda e abertos à direita, para nunca se sobreporem).
 * Algumas partes têm mais de um retângulo (o capô e a tampa traseira contornam os faróis e as lanternas).
 */
export const PARTES_NO_DESENHO: Record<string, Retangulo[]> = {
  para_choque_dianteiro: [retangulo(0.2, 0.0, 0.8, 0.06)],
  farol_dianteiro_esquerdo: [retangulo(0.2, 0.06, 0.34, 0.12)],
  farol_dianteiro_direito: [retangulo(0.66, 0.06, 0.8, 0.12)],
  capo: [retangulo(0.34, 0.06, 0.66, 0.12), retangulo(0.2, 0.12, 0.8, 0.28)],
  para_brisa: [retangulo(0.2, 0.28, 0.8, 0.4)],
  teto: [retangulo(0.2, 0.4, 0.8, 0.6)],
  vidro_traseiro: [retangulo(0.2, 0.6, 0.8, 0.7)],
  tampa_traseira: [retangulo(0.2, 0.7, 0.8, 0.88), retangulo(0.34, 0.88, 0.66, 0.94)],
  lanterna_traseira_esquerda: [retangulo(0.2, 0.88, 0.34, 0.94)],
  lanterna_traseira_direita: [retangulo(0.66, 0.88, 0.8, 0.94)],
  para_choque_traseiro: [retangulo(0.2, 0.94, 0.8, 1.0)],
  ...Object.fromEntries(Object.entries(FAIXA_ESQUERDA).map(([chave, area]) => [chave, [area]])),
  ...Object.fromEntries(Object.entries(direita).map(([chave, area]) => [chave, [area]])),
};

const dentro = (x: number, y: number, area: Retangulo): boolean => x >= area.x0 && x < area.x1 && y >= area.y0 && y < area.y1;

/**
 * Chave da parte do veículo sob um ponto normalizado, ou `null` fora de qualquer parte. Os valores 1 exatos (borda
 * direita e traseira) contam como dentro da última faixa.
 */
export function parteNoPonto(x: number, y: number): string | null {
  const px = Math.min(Math.max(x, 0), 1 - Number.EPSILON);
  const py = Math.min(Math.max(y, 0), 1 - Number.EPSILON);

  for (const [chave, areas] of Object.entries(PARTES_NO_DESENHO)) {
    if (areas.some((area) => dentro(px, py, area))) {
      return chave;
    }
  }

  return null;
}

/** Centro do maior retângulo da parte; serve de posição padrão e aos testes. */
export function centroDaParte(chave: string): { x: number; y: number } | null {
  const areas = PARTES_NO_DESENHO[chave];

  if (!areas) {
    return null;
  }

  const maior = areas.reduce((a, b) => ((b.x1 - b.x0) * (b.y1 - b.y0) > (a.x1 - a.x0) * (a.y1 - a.y0) ? b : a));

  return { x: (maior.x0 + maior.x1) / 2, y: (maior.y0 + maior.y1) / 2 };
}

/** Letra do marcador de cada tipo de avaria, como no protótipo. */
export const LETRA_DO_TIPO: Record<TipoAvaria, string> = {
  batido: 'B',
  riscado: 'R',
  danificado: 'D',
  falta: 'F',
};

/** Cor do marcador de cada tipo, como a legenda do protótipo (spec 005). */
export const COR_DO_TIPO: Record<TipoAvaria, string> = {
  batido: '#B42318',
  riscado: '#F5A300',
  danificado: '#0F2A43',
  falta: '#475467',
};

/** Cor da letra sobre o marcador: escura sobre o âmbar (branco sobre âmbar tem só 2,1:1) e branca nos demais. */
export const COR_DA_LETRA_DO_TIPO: Record<TipoAvaria, string> = {
  batido: '#FFFFFF',
  riscado: '#101828',
  danificado: '#FFFFFF',
  falta: '#FFFFFF',
};
