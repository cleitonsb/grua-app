import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';

/** Distância mínima, em pontos, entre a base do campo focado e o topo do teclado. */
const FOLGA = 32;

interface ContextoDaRolagem {
  /** Avisa que um campo ganhou o foco, para garantir que ele não fique atrás do teclado. */
  campoFocado: () => void;
}

const RolagemContexto = createContext<ContextoDaRolagem | null>(null);

/** Devolve a função que os campos de texto chamam ao receber o foco (nula fora de uma `RolagemComTeclado`). */
export function useAoFocarCampo(): (() => void) | undefined {
  return useContext(RolagemContexto)?.campoFocado;
}

/**
 * `ScrollView` que mantém o campo focado acima do teclado.
 *
 * O Android rola o campo para a vista no instante do foco, antes de o teclado abrir (e, no modo edge-to-edge, a janela
 * nem é redimensionada), então campos perto da base da tela ficavam cobertos. Aqui, depois que o teclado abre, medimos
 * o campo focado e a área visível e rolamos o necessário; quando o teclado sobrepõe a rolagem, um espaço no fim do
 * conteúdo permite rolar até o último campo.
 */
export const RolagemComTeclado = forwardRef<ScrollViewInstance, ScrollViewProps>(function RolagemComTeclado(
  { children, onScroll, keyboardShouldPersistTaps = 'handled', scrollEventThrottle = 16, ...resto },
  refExterna,
) {
  const interna = useRef<ScrollViewInstance>(null);
  const deslocamento = useRef(0);
  const topoDoTeclado = useRef<number | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [espaco, setEspaco] = useState(0);

  useImperativeHandle(refExterna, () => interna.current as ScrollViewInstance);

  const mostrarCampo = useCallback(() => {
    const topo = topoDoTeclado.current;
    const rolagem = interna.current;
    const campo = TextInput.State.currentlyFocusedInput();

    if (topo === null || !rolagem || !campo) {
      return;
    }

    rolagem.measureInWindow((_x, y, _largura, altura) => {
      // Quanto da rolagem fica sob o teclado (zero quando a janela já foi redimensionada).
      setEspaco(Math.max(0, y + altura - topo));

      // Espera o espaço entrar no layout antes de rolar, senão a rolagem é limitada ao fim antigo do conteúdo.
      setTimeout(() => {
        campo.measureInWindow((_cx, cy, _cl, ca) => {
          const excesso = cy + ca + FOLGA - topo;

          if (excesso > 0) {
            rolagem.scrollTo({ y: deslocamento.current + excesso, animated: true });
          }
        });
      }, 60);
    });
  }, []);

  const agendar = useCallback(
    (atrasoMs: number) => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(mostrarCampo, atrasoMs);
    },
    [mostrarCampo],
  );

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const aoAbrir = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (evento) => {
      topoDoTeclado.current = evento.endCoordinates.screenY;
      agendar(120);
    });
    const aoFechar = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      clearTimeout(temporizador.current);
      topoDoTeclado.current = null;
      setEspaco(0);
    });

    return () => {
      aoAbrir.remove();
      aoFechar.remove();
      clearTimeout(temporizador.current);
    };
  }, [agendar]);

  const contexto = useMemo<ContextoDaRolagem>(() => ({ campoFocado: () => agendar(150) }), [agendar]);

  function aoRolar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    deslocamento.current = evento.nativeEvent.contentOffset.y;
    onScroll?.(evento);
  }

  return (
    <RolagemContexto.Provider value={contexto}>
      <ScrollView
        ref={interna}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={aoRolar}
        {...resto}>
        {children}
        {espaco > 0 ? <View style={{ height: espaco }} /> : null}
      </ScrollView>
    </RolagemContexto.Provider>
  );
});
