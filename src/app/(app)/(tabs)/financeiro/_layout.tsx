import { Stack } from 'expo-router';

/** Lista, detalhe e formulário de lançamentos, empilhados dentro da aba Financeiro. */
export default function FinanceiroLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
