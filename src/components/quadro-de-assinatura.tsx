import { useState, type Dispatch, type SetStateAction } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { Raios } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Ponto do traço, em fração do quadro (0 a 1 na largura e na altura): independe do tamanho da tela. */
export interface PontoDoTraco {
  x: number;
  y: number;
}

/** Cada traço é um dedo apoiado e arrastado; a assinatura é a lista deles. */
export type Tracos = PontoDoTraco[][];

/** Proporção (largura / altura) do quadro; vai para a API, que desenha o PNG na mesma proporção. */
export const PROPORCAO_DO_QUADRO = 2;

interface QuadroDeAssinaturaProps {
  tracos: Tracos;
  /** O `set` de um `useState<Tracos>`: o quadro usa a forma com função, para nunca perder pontos entre renderizações. */
  aoMudar: Dispatch<SetStateAction<Tracos>>;
  desabilitado?: boolean;
}

const limitar = (valor: number) => Math.min(1, Math.max(0, valor));

/**
 * Quadro em que o cliente assina com o dedo na tela do motorista. Controlado: quem usa guarda os `tracos` e limpa
 * passando uma lista vazia. Usa o sistema de respostas de toque do React Native (não cede o gesto à rolagem) e SVG,
 * sem biblioteca nova.
 */
export function QuadroDeAssinatura({ tracos, aoMudar, desabilitado = false }: QuadroDeAssinaturaProps) {
  const theme = useTheme();
  const [largura, setLargura] = useState(0);
  const altura = largura / PROPORCAO_DO_QUADRO;

  const ponto = (evento: GestureResponderEvent): PontoDoTraco => ({
    x: limitar(evento.nativeEvent.locationX / (largura || 1)),
    y: limitar(evento.nativeEvent.locationY / (altura || 1)),
  });

  function comecar(evento: GestureResponderEvent) {
    const novo = ponto(evento);

    aoMudar((anteriores) => [...anteriores, [novo]]);
  }

  function continuar(evento: GestureResponderEvent) {
    const novo = ponto(evento);

    aoMudar((anteriores) =>
      anteriores.length === 0 ? anteriores : [...anteriores.slice(0, -1), [...anteriores[anteriores.length - 1], novo]],
    );
  }

  const caminho = tracos
    .map((traco) => {
      const [primeiro, ...resto] = traco;

      if (!primeiro) {
        return '';
      }

      const inicio = `M ${primeiro.x * largura} ${primeiro.y * altura}`;

      // Um toque sem arrastar vira um pontinho.
      return resto.length === 0
        ? `${inicio} l 0.1 0`
        : `${inicio} ${resto.map((p) => `L ${p.x * largura} ${p.y * altura}`).join(' ')}`;
    })
    .join(' ');

  function aoMedir(evento: LayoutChangeEvent) {
    setLargura(evento.nativeEvent.layout.width);
  }

  return (
    <View
      accessibilityLabel="Quadro de assinatura: o cliente assina aqui com o dedo"
      onLayout={aoMedir}
      onStartShouldSetResponder={() => !desabilitado}
      onMoveShouldSetResponder={() => !desabilitado}
      onResponderTerminationRequest={() => false}
      onResponderGrant={comecar}
      onResponderMove={continuar}
      style={[
        estilos.quadro,
        { aspectRatio: PROPORCAO_DO_QUADRO, backgroundColor: theme.backgroundElement, borderColor: theme.bordaCampo },
      ]}>
      <Svg width={largura} height={altura} pointerEvents="none">
        <Line x1={largura * 0.06} x2={largura * 0.94} y1={altura * 0.78} y2={altura * 0.78} stroke={theme.bordaCampo} strokeWidth={1} />
        <Path d={caminho} stroke={theme.marinho} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

const estilos = StyleSheet.create({
  quadro: { width: '100%', borderWidth: 1, borderRadius: Raios.campo, overflow: 'hidden' },
});
