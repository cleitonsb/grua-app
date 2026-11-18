import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { Pilula } from '@/components/pilula';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CabecalhoTelaProps {
  titulo: string;
  /** Linha pequena acima do título (ex.: "Retirada · passo 2 de 4", ou a saudação do Início). */
  subtitulo?: string;
  /** Linha pequena abaixo do título (ex.: "Motorista · Caminhão plataforma 01"). */
  descricao?: string;
  /** Título maior, como o nome no Início. */
  grande?: boolean;
  /** Com esta função, mostra a seta de voltar. */
  aoVoltar?: () => void;
  /** Elemento à direita (avatar, indicador de salvamento...). */
  acao?: ReactNode;
  /** Variante com abas em pílulas, que rolam na horizontal. */
  pilulas?: { chave: string; rotulo: string }[];
  pilulaAtiva?: string;
  aoEscolherPilula?: (chave: string) => void;
  /** Variante com a barra de segmentos dos passos. */
  passo?: { atual: number; total: number };
  /** Espaço extra no fim da faixa, para um botão da tela se sobrepor a ela (como o "Novo checklist" do Início). */
  sobreposicao?: number;
}

/**
 * Faixa azul-marinho do topo de todas as telas, que se estende sob a barra de status. Tem três variantes (simples, com
 * pílulas e com barra de passos), combináveis com seta de voltar e elemento à direita.
 */
export function CabecalhoTela({
  titulo,
  subtitulo,
  descricao,
  grande = false,
  aoVoltar,
  acao,
  pilulas,
  pilulaAtiva,
  aoEscolherPilula,
  passo,
  sobreposicao = 0,
}: CabecalhoTelaProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.faixa, { backgroundColor: theme.marinho, paddingTop: insets.top + Spacing.three, paddingBottom: Spacing.three + sobreposicao }]}>
      <View style={estilos.linha}>
        {aoVoltar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={aoVoltar}
            hitSlop={8}
            style={estilos.voltar}>
            <Icone nome="voltar" cor={theme.branco} />
          </Pressable>
        ) : null}

        <View style={estilos.textos}>
          {subtitulo ? (
            <ThemedText style={[estilos.pequeno, { color: theme.textoSobreMarinho }]}>{subtitulo}</ThemedText>
          ) : null}
          <ThemedText
            accessibilityRole="header"
            style={[estilos.titulo, grande && estilos.tituloGrande, { color: theme.branco }]}>
            {titulo}
          </ThemedText>
          {descricao ? (
            <ThemedText style={[estilos.pequeno, { color: theme.textoSobreMarinho }]}>{descricao}</ThemedText>
          ) : null}
        </View>

        {acao ? <View style={estilos.acao}>{acao}</View> : null}
      </View>

      {pilulas ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.pilulas}
          accessibilityRole="radiogroup">
          {pilulas.map((pilula) => (
            <Pilula
              key={pilula.chave}
              sobreCabecalho
              rotulo={pilula.rotulo}
              ativa={pilula.chave === pilulaAtiva}
              aoTocar={() => aoEscolherPilula?.(pilula.chave)}
            />
          ))}
        </ScrollView>
      ) : null}

      {passo ? (
        <View
          accessible
          accessibilityLabel={`Passo ${passo.atual} de ${passo.total}`}
          style={estilos.segmentos}>
          {Array.from({ length: passo.total }, (_, indice) => (
            <View
              key={indice}
              style={[estilos.segmento, { backgroundColor: indice < passo.atual ? theme.primary : theme.trilha }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  voltar: { width: Alturas.alvoMinimo, height: Alturas.alvoMinimo, marginLeft: -Spacing.two, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  acao: { marginLeft: Spacing.two },
  pequeno: { fontFamily: Fontes.corpo, fontSize: 13, lineHeight: 18 },
  titulo: { fontFamily: Fontes.tituloNegrito, fontSize: 22, lineHeight: 28 },
  tituloGrande: { fontSize: 26, lineHeight: 32 },
  pilulas: { gap: Spacing.two, paddingRight: Spacing.three },
  segmentos: { flexDirection: 'row', gap: 6 },
  segmento: { flex: 1, height: 5, borderRadius: 3 },
});
