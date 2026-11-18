import { Pressable, StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BotaoCameraProps {
  /** Descrição para leitor de tela (ex.: "Adicionar foto de Tapetes"). A contagem é acrescentada. */
  rotulo: string;
  /** 0: botão escuro, sem contador; maior que 0: botão claro com o contador âmbar no canto. */
  quantidade: number;
  aoTocar: () => void;
  desabilitado?: boolean;
}

/** Botão quadrado de câmera dos itens e das avarias, com o contador de fotos no canto superior direito. */
export function BotaoCamera({ rotulo, quantidade, aoTocar, desabilitado = false }: BotaoCameraProps) {
  const theme = useTheme();
  const comFoto = quantidade > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={comFoto ? `${rotulo}. ${quantidade} ${quantidade === 1 ? 'foto' : 'fotos'}` : rotulo}
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={aoTocar}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: comFoto ? theme.backgroundSelected : theme.marinho },
        desabilitado && estilos.desabilitado,
        pressed && estilos.pressionado,
      ]}>
      <Icone nome="camera" cor={comFoto ? theme.marinho : theme.branco} />

      {comFoto ? (
        <View style={[estilos.contador, { backgroundColor: theme.primary }]}>
          <ThemedText style={[estilos.numero, { color: theme.primaryText }]}>{quantidade}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    width: Alturas.alvoMinimo,
    height: Alturas.alvoMinimo,
    borderRadius: Raios.campo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contador: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { fontFamily: Fontes.tituloNegrito, fontSize: 12, lineHeight: 16 },
  desabilitado: { opacity: 0.5 },
  pressionado: { opacity: 0.85 },
});
