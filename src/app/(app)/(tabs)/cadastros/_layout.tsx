import { Stack } from 'expo-router';

/** Lista de cadastros e formulários (cliente, veículo...) empilhados dentro da aba Cadastros. */
export default function CadastrosLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
