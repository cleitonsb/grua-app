import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Botao } from '@/components/botao';
import { Cartao } from '@/components/cartao';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

/** Ações da conta do usuário logado: trocar a própria senha e sair. */
export function ContaAcoes() {
  const router = useRouter();
  const { usuario, sair } = useSession();
  const [saindo, setSaindo] = useState(false);

  async function confirmarSaida() {
    setSaindo(true);
    await sair();
  }

  return (
    <Cartao style={estilos.bloco}>
      <ThemedText type="subtitle">Minha conta</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Usuário: {usuario?.usuario}
      </ThemedText>
      <Botao titulo="Trocar senha" variante="secundario" onPress={() => router.push('/trocar-senha')} desabilitado={saindo} />
      <Botao titulo="Sair" variante="secundario" onPress={confirmarSaida} carregando={saindo} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Spacing.two },
});
