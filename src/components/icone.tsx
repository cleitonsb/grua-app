import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type NomeDoIcone =
  | 'inicio'
  | 'cadastros'
  | 'financeiro'
  | 'checklists'
  | 'busca'
  | 'camera'
  | 'galeria'
  | 'voltar'
  | 'baixo'
  | 'mais'
  | 'fechar'
  | 'aviso'
  | 'email'
  | 'check'
  | 'guincho';

interface IconeProps {
  nome: NomeDoIcone;
  tamanho?: number;
  /** Sempre explícita: vem do tema. */
  cor: string;
  /** Variante ativa das abas: preenche de leve as formas fechadas. */
  preenchido?: boolean;
  /** Descrição para leitor de tela. Sem rótulo, o ícone é decorativo e fica escondido dele. */
  rotulo?: string;
}

/**
 * Conjunto único de ícones do app, desenhados em uma grade de 24 px com traço de 2 px (react-native-svg), no estilo
 * do protótipo. Nenhuma biblioteca de ícones.
 */
export function Icone({ nome, tamanho = 24, cor, preenchido = false, rotulo }: IconeProps) {
  return (
    <View
      accessible={rotulo !== undefined}
      accessibilityRole={rotulo !== undefined ? 'image' : undefined}
      accessibilityLabel={rotulo}
      accessibilityElementsHidden={rotulo === undefined}
      importantForAccessibility={rotulo === undefined ? 'no-hide-descendants' : 'yes'}>
      <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
        <G
          stroke={cor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={preenchido ? cor : 'none'}
          fillOpacity={preenchido ? 0.16 : undefined}>
          {desenho(nome, cor)}
        </G>
      </Svg>
    </View>
  );
}

/** Formas de cada ícone. O que não deve ser preenchido leva `fill="none"`. */
function desenho(nome: NomeDoIcone, cor: string) {
  switch (nome) {
    case 'inicio':
      return (
        <>
          <Path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
          <Path d="M9.5 20.5v-5.5h5v5.5" fill="none" />
        </>
      );
    case 'cadastros':
      return (
        <>
          <Circle cx={9} cy={8} r={3.5} />
          <Path d="M2.5 20.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" fill="none" />
          <Path d="M19 7.5v6M16 10.5h6" fill="none" />
        </>
      );
    case 'financeiro':
      return (
        <>
          <Rect x={2.5} y={6} width={19} height={12} rx={2} />
          <Circle cx={12} cy={12} r={2.7} fill="none" />
          <Path d="M6 12h.01M18 12h.01" fill="none" />
        </>
      );
    case 'checklists':
      return (
        <>
          <Path d="M6 4.5h12a1.5 1.5 0 0 1 1.5 1.5v13.5A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 6 4.5z" />
          <Path d="M9 3h6v3.5H9z" />
          <Path d="m8.5 13.5 2.5 2.5 4.5-5" fill="none" />
        </>
      );
    case 'busca':
      return (
        <>
          <Circle cx={11} cy={11} r={6.5} fill="none" />
          <Path d="m20 20-4.4-4.4" fill="none" />
        </>
      );
    case 'camera':
      return (
        <>
          <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H8l1.5-2h5L16 7h3.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
          <Circle cx={12} cy={13} r={3.5} fill="none" />
        </>
      );
    case 'galeria':
      return (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2} />
          <Circle cx={9} cy={10} r={1.8} fill="none" />
          <Path d="m3.5 17 5-5 4 4 3-3 5 5" fill="none" />
        </>
      );
    case 'voltar':
      return <Path d="m15 5-7 7 7 7" fill="none" />;
    case 'baixo':
      return <Path d="m6 9 6 6 6-6" fill="none" />;
    case 'mais':
      return <Path d="M12 5v14M5 12h14" fill="none" />;
    case 'fechar':
      return <Path d="m6 6 12 12M18 6 6 18" fill="none" />;
    case 'aviso':
      return (
        <>
          <Circle cx={12} cy={12} r={9} fill="none" />
          <Path d="M12 7.5v5.5M12 16.5h.01" fill="none" />
        </>
      );
    case 'email':
      return (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} fill="none" />
          <Path d="m3.5 7 8.5 6 8.5-6" fill="none" />
        </>
      );
    case 'check':
      return <Path d="m5 12.5 4.5 4.5L19 7" fill="none" />;
    case 'guincho':
      return (
        <>
          <Path d="M3 17v-5.5L5.8 7H11v10" />
          <Path d="m11 13.5 9.5-3.5M11 17h10" fill="none" />
          <Circle cx={6.5} cy={18} r={2.2} fill={cor} fillOpacity={1} stroke="none" />
          <Circle cx={17} cy={18} r={2.2} fill={cor} fillOpacity={1} stroke="none" />
        </>
      );
  }
}
