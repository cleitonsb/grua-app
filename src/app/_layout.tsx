import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, Fontes } from '@/constants/theme';
import { SessionProvider, useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

/** Tema de navegação com as cores do protótipo: o app tem uma única aparência, clara (spec 005, D5). */
const TemaDeNavegacao = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundElement,
    text: Colors.text,
    border: Colors.borda,
  },
};

export default function RootLayout() {
  // O splash fica na tela até as fontes estarem prontas, para o texto nunca aparecer em branco nem trocar de fonte.
  // Se o carregamento falhar, o app abre mesmo assim, com a fonte do sistema.
  const [fontesProntas, erroDeFontes] = useFonts({
    [Fontes.corpo]: Inter_400Regular,
    [Fontes.corpoSemiNegrito]: Inter_600SemiBold,
    [Fontes.corpoNegrito]: Inter_700Bold,
    [Fontes.titulo]: SpaceGrotesk_600SemiBold,
    [Fontes.tituloNegrito]: SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontesProntas || erroDeFontes) {
      SplashScreen.hideAsync();
    }
  }, [fontesProntas, erroDeFontes]);

  if (!fontesProntas && !erroDeFontes) {
    return null;
  }

  return (
    <ThemeProvider value={TemaDeNavegacao}>
      <StatusBar style="light" />
      <SessionProvider>
        <Navegacao />
      </SessionProvider>
    </ThemeProvider>
  );
}

/**
 * Sem sessão: só o login. Com senha provisória: só a troca de senha.
 * Com sessão normal: o app (abas). A mudança de sessão redireciona sozinha (Stack.Protected).
 */
function Navegacao() {
  const { usuario, carregando } = useSession();

  return (
    <>
      <AnimatedSplashOverlay />
      {carregando ? null : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!usuario}>
            <Stack.Screen name="(auth)/login" />
          </Stack.Protected>

          <Stack.Protected guard={!!usuario}>
            <Stack.Screen name="(auth)/trocar-senha" />
          </Stack.Protected>

          <Stack.Protected guard={!!usuario && !usuario.deve_trocar_senha}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      )}
    </>
  );
}
