import { Tabs, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeDoIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Fontes } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Telas em que a barra de abas some, como no protótipo: formulários, fluxo do checklist e tela de foto.
 * Aparece nas telas raiz das abas e na lista e no detalhe de checklists.
 */
const TELAS_SEM_BARRA = new Set(['editar', 'foto', 'novo', 'cliente', 'veiculo', 'motorista', 'caminhao', 'administrador']);

const ABAS: { nome: string; rotulo: string; icone: NomeDoIcone }[] = [
  { nome: 'index', rotulo: 'Início', icone: 'inicio' },
  { nome: 'cadastros', rotulo: 'Cadastros', icone: 'cadastros' },
  { nome: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' },
  { nome: 'checklists', rotulo: 'Checklists', icone: 'checklists' },
];

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const segmentos: string[] = useSegments();
  const semBarra = TELAS_SEM_BARRA.has(segmentos[segmentos.length - 1] ?? '');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.marinho,
        tabBarInactiveTintColor: theme.placeholder,
        tabBarStyle: semBarra
          ? { display: 'none' }
          : {
              backgroundColor: theme.backgroundElement,
              borderTopColor: theme.borda,
              borderTopWidth: 1,
              height: 64 + insets.bottom,
              paddingTop: 8,
              paddingBottom: 8 + insets.bottom,
            },
      }}>
      {ABAS.map((aba) => (
        <Tabs.Screen
          key={aba.nome}
          name={aba.nome}
          options={{
            title: aba.rotulo,
            tabBarAccessibilityLabel: aba.rotulo,
            tabBarIcon: ({ color, focused }) => <Icone nome={aba.icone} cor={color as string} preenchido={focused} />,
            tabBarLabel: ({ color, focused }) => (
              <ThemedText
                style={{
                  color,
                  fontFamily: focused ? Fontes.corpoNegrito : Fontes.corpoSemiNegrito,
                  fontSize: 12,
                  lineHeight: 16,
                }}>
                {aba.rotulo}
              </ThemedText>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
