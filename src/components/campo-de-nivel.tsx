import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { indiceParaFracao, posicaoParaIndice } from '@/utils/nivel';

interface OpcaoDeNivel {
  valor: string;
  rotulo: string;
}

interface CampoDeNivelProps {
  rotulo: string;
  /** As paradas, em ordem (ex.: os cinco níveis de combustível do catálogo da API). */
  opcoes: OpcaoDeNivel[];
  valor: string | null;
  aoMudar: (valor: string) => void;
  erro?: string;
  /** Esconde o rótulo escrito (ele continua valendo para leitor de tela), quando a tela já tem um título de seção. */
  rotuloVisivel?: boolean;
}

const TAMANHO_DO_MARCADOR = 30;

/**
 * Controle de várias paradas em uma trilha (o combustível do checklist). Toque na trilha ou nos rótulos escolhe a parada
 * mais próxima; arrastar troca de parada (sem biblioteca: usa o responder do próprio `View`). Para leitor de tela é um controle ajustável, com ações de
 * aumentar e diminuir. O valor devolvido é sempre um dos `opcoes`.
 */
export function CampoDeNivel({ rotulo, opcoes, valor, aoMudar, erro, rotuloVisivel = true }: CampoDeNivelProps) {
  const theme = useTheme();
  const [largura, setLargura] = useState(0);
  const indice = opcoes.findIndex((opcao) => opcao.valor === valor);
  const fracao = indice < 0 ? 0 : indiceParaFracao(indice, opcoes.length);

  // Toque e arrasto usam as propriedades de responder do `View`: cada evento escolhe a parada mais próxima da posição.
  const escolherPorPosicao = (x: number) => {
    const escolhida = opcoes[posicaoParaIndice(x, largura, opcoes.length)];

    if (escolhida) aoMudar(escolhida.valor);
  };

  function mudarPor(passo: number) {
    const proximo = Math.min(Math.max((indice < 0 ? 0 : indice) + passo, 0), opcoes.length - 1);

    aoMudar(opcoes[proximo].valor);
  }

  const aoMedir = (evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width);
  const posicaoDoMarcador = Math.max(0, fracao * (largura - TAMANHO_DO_MARCADOR));

  return (
    <View style={estilos.campo}>
      {rotuloVisivel ? <ThemedText style={estilos.rotulo}>{rotulo}</ThemedText> : null}

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={rotulo}
        accessibilityValue={{ text: indice < 0 ? 'Não informado' : opcoes[indice].rotulo }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(evento) => mudarPor(evento.nativeEvent.actionName === 'increment' ? 1 : -1)}>
        <View
          style={estilos.area}
          onLayout={aoMedir}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(evento) => escolherPorPosicao(evento.nativeEvent.locationX)}
          onResponderMove={(evento) => escolherPorPosicao(evento.nativeEvent.locationX)}
          onResponderTerminationRequest={() => true}>
          <View pointerEvents="none" style={[estilos.trilha, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[estilos.preenchimento, { backgroundColor: theme.primary, width: `${fracao * 100}%` }]} />
          </View>

          <View
            pointerEvents="none"
            style={[
              estilos.marcador,
              {
                left: posicaoDoMarcador,
                backgroundColor: indice < 0 ? theme.backgroundElement : theme.marinho,
                borderColor: indice < 0 ? theme.bordaCampo : theme.branco,
              },
            ]}
          />
        </View>

        <View style={estilos.rotulos}>
          {opcoes.map((opcao, posicao) => (
            <Pressable
              key={opcao.valor}
              accessibilityElementsHidden
              importantForAccessibility="no"
              onPress={() => aoMudar(opcao.valor)}
              style={estilos.alvo}>
              <ThemedText
                style={[
                  estilos.textoDoRotulo,
                  posicao === indice
                    ? { color: theme.text, fontFamily: Fontes.corpoNegrito }
                    : { color: theme.textSecondary },
                ]}>
                {opcao.rotulo}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {erro}
        </ThemedText>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
  area: { height: 44, justifyContent: 'center' },
  trilha: { height: 8, borderRadius: 4, overflow: 'hidden' },
  preenchimento: { height: 8 },
  marcador: {
    position: 'absolute',
    top: 7,
    width: TAMANHO_DO_MARCADOR,
    height: TAMANHO_DO_MARCADOR,
    borderRadius: TAMANHO_DO_MARCADOR / 2,
    borderWidth: 3,
  },
  rotulos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.half },
  alvo: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  textoDoRotulo: { fontFamily: Fontes.corpo, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
