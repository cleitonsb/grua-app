import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fontes, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fontes.corpo,
    fontSize: 13,
    lineHeight: 18,
  },
  smallBold: {
    fontFamily: Fontes.corpoSemiNegrito,
    fontSize: 13,
    lineHeight: 18,
  },
  default: {
    fontFamily: Fontes.corpo,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    fontFamily: Fontes.tituloNegrito,
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: Fontes.titulo,
    fontSize: 18,
    lineHeight: 24,
  },
  link: {
    fontFamily: Fontes.corpoSemiNegrito,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fontes.corpoSemiNegrito,
    lineHeight: 30,
    fontSize: 14,
    color: Colors.marinho,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
