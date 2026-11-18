import { Pressable, StyleSheet, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Fontes } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Avaria } from '@/types/api';
import { COR_DA_LETRA_DO_TIPO, COR_DO_TIPO, LETRA_DO_TIPO, PARTES_NO_DESENHO, PROPORCAO_ALTURA_LARGURA, parteNoPonto } from '@/utils/desenho';

/** Distância máxima, em pixels, entre o toque e o centro de um marcador para selecionar a avaria em vez de marcar outra. */
const TOLERANCIA_DO_TOQUE_PX = 18;

// O desenho usa um sistema de 100 × 200 unidades; as coordenadas normalizadas (0 a 1) são multiplicadas por ele.
const LARGURA_SVG = 100;
const ALTURA_SVG = LARGURA_SVG * PROPORCAO_ALTURA_LARGURA;

export interface PontoDoToque {
  parte: string;
  /** Posição normalizada (0 a 1) onde o dedo tocou. */
  x: number;
  y: number;
}

interface VeiculoDesenhoProps {
  avarias: Avaria[];
  selecionadaId?: number;
  /** Ponto onde uma avaria nova está sendo marcada (ainda sem tipo). */
  pontoNovo?: { x: number; y: number };
  onToqueNaParte?: (ponto: PontoDoToque) => void;
  onToqueNaAvaria?: (avariaId: number) => void;
  /** Só mostra os marcadores (detalhe e resumo): o desenho não responde a toques. */
  somenteLeitura?: boolean;
}

/**
 * Veículo visto de cima, com a frente para cima. Tocar numa parte marca uma avaria ali; tocar num marcador existente
 * seleciona a avaria. Os marcadores levam a letra do tipo (B, R, D, F), como no protótipo.
 */
export function VeiculoDesenho({ avarias, selecionadaId, pontoNovo, onToqueNaParte, onToqueNaAvaria, somenteLeitura = false }: VeiculoDesenhoProps) {
  const theme = useTheme();
  const janela = useWindowDimensions();

  const largura = Math.min(260, Math.max(180, janela.width * 0.6));
  const altura = largura * PROPORCAO_ALTURA_LARGURA;

  function aoTocar(evento: GestureResponderEvent) {
    const { locationX, locationY } = evento.nativeEvent;

    const proxima = avarias.find(
      (avaria) => Math.hypot(avaria.pos_x * largura - locationX, avaria.pos_y * altura - locationY) <= TOLERANCIA_DO_TOQUE_PX,
    );

    if (proxima) {
      onToqueNaAvaria?.(proxima.id);

      return;
    }

    const x = Math.min(Math.max(locationX / largura, 0), 1);
    const y = Math.min(Math.max(locationY / altura, 0), 1);
    const parte = parteNoPonto(x, y);

    if (parte) {
      onToqueNaParte?.({ parte, x, y });
    }
  }

  return (
    <Pressable
      accessibilityRole={somenteLeitura ? 'image' : 'button'}
      accessibilityLabel={
        somenteLeitura
          ? `Desenho do veículo visto de cima com ${avarias.length} ${avarias.length === 1 ? 'avaria marcada' : 'avarias marcadas'}.`
          : 'Desenho do veículo visto de cima. Toque na parte avariada para marcar uma avaria.'
      }
      disabled={somenteLeitura}
      onPress={aoTocar}
      style={[estilos.desenho, { width: largura, height: altura }]}>
      <Svg width={largura} height={altura} viewBox={`0 0 ${LARGURA_SVG} ${ALTURA_SVG}`} pointerEvents="none">
        {/* Carroceria, vidros e teto */}
        <Rect x={20} y={2} width={60} height={196} rx={16} fill={theme.backgroundSelected} stroke={theme.marinho} strokeWidth={1.4} />
        <Path d="M 22 56 L 78 56 L 72 80 L 28 80 Z" fill={theme.backgroundElement} stroke={theme.marinho} strokeWidth={0.8} />
        <Path d="M 28 120 L 72 120 L 78 140 L 22 140 Z" fill={theme.backgroundElement} stroke={theme.marinho} strokeWidth={0.8} />
        <Rect x={28} y={82} width={44} height={36} rx={6} fill="none" stroke={theme.marinho} strokeWidth={0.8} />

        {/* Rodas e retrovisores */}
        {[3, 83].map((x) => (
          <G key={x}>
            <Rect x={x} y={30} width={14} height={22} rx={4} fill={theme.marinho} />
            <Rect x={x} y={130} width={14} height={24} rx={4} fill={theme.marinho} />
          </G>
        ))}
        <Rect x={8} y={53} width={12} height={8} rx={3} fill={theme.backgroundElement} stroke={theme.marinho} strokeWidth={0.8} />
        <Rect x={80} y={53} width={12} height={8} rx={3} fill={theme.backgroundElement} stroke={theme.marinho} strokeWidth={0.8} />

        {/* Faróis e lanternas */}
        <Rect x={23} y={14} width={10} height={7} rx={2} fill={theme.primary} />
        <Rect x={67} y={14} width={10} height={7} rx={2} fill={theme.primary} />
        <Rect x={23} y={178} width={10} height={7} rx={2} fill={theme.danger} />
        <Rect x={67} y={178} width={10} height={7} rx={2} fill={theme.danger} />

        {/* Contorno das partes que respondem ao toque */}
        {Object.values(PARTES_NO_DESENHO)
          .flat()
          .map((area) => (
            <Rect
              key={`${area.x0}-${area.y0}`}
              x={area.x0 * LARGURA_SVG}
              y={area.y0 * ALTURA_SVG}
              width={(area.x1 - area.x0) * LARGURA_SVG}
              height={(area.y1 - area.y0) * ALTURA_SVG}
              fill="none"
              stroke={theme.textSecondary}
              strokeOpacity={0.25}
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
          ))}

        {pontoNovo ? (
          <Circle
            cx={pontoNovo.x * LARGURA_SVG}
            cy={pontoNovo.y * ALTURA_SVG}
            r={5.5}
            fill="none"
            stroke={theme.marinho}
            strokeWidth={1.6}
            strokeDasharray="2 1.5"
          />
        ) : null}

        {avarias.map((avaria) => {
          const selecionada = avaria.id === selecionadaId;
          const cx = avaria.pos_x * LARGURA_SVG;
          const cy = avaria.pos_y * ALTURA_SVG;

          return (
            <G key={avaria.id}>
              <Circle
                cx={cx}
                cy={cy}
                r={selecionada ? 7 : 6}
                fill={COR_DO_TIPO[avaria.tipo]}
                stroke={selecionada ? theme.marinho : theme.branco}
                strokeWidth={selecionada ? 2 : 1}
              />
              <SvgText x={cx} y={cy + 2.8} fontSize={8} fontFamily={Fontes.tituloNegrito} fill={COR_DA_LETRA_DO_TIPO[avaria.tipo]} textAnchor="middle">
                {LETRA_DO_TIPO[avaria.tipo]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  desenho: { alignSelf: 'center' },
});
