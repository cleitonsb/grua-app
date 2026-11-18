import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'grua.token';
const CHAVE_ULTIMO_USUARIO = 'grua.ultimo_usuario';

/**
 * Guarda a sessão memorizada no armazenamento seguro do aparelho (Keychain/Keystore).
 * Só o token de acesso e o último nome de usuário são gravados; a senha nunca é guardada.
 */
async function ler(chave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(chave);
  } catch {
    return null;
  }
}

async function gravar(chave: string, valor: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(chave, valor);
  } catch {
    // Sem armazenamento seguro disponível, a sessão só vale até o app ser fechado.
  }
}

async function apagar(chave: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(chave);
  } catch {
    // Nada a fazer: a chave pode não existir.
  }
}

export const lerToken = () => ler(CHAVE_TOKEN);
export const gravarToken = (token: string) => gravar(CHAVE_TOKEN, token);
export const apagarToken = () => apagar(CHAVE_TOKEN);

export const lerUltimoUsuario = () => ler(CHAVE_ULTIMO_USUARIO);
export const gravarUltimoUsuario = (usuario: string) => gravar(CHAVE_ULTIMO_USUARIO, usuario);
