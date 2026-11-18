/**
 * UUID v4 para o `client_uuid` de avarias e fotos (idempotência do reenvio). Não precisa ser criptograficamente
 * forte: serve só para a API reconhecer uma repetição da mesma chamada. Usa `crypto.getRandomValues` quando existe.
 */
export function gerarUuid(): string {
  const bytes = new Uint8Array(16);
  const cripto = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;

  if (cripto?.getRandomValues) {
    cripto.getRandomValues(bytes);
  } else {
    for (let indice = 0; indice < bytes.length; indice++) {
      bytes[indice] = Math.floor(Math.random() * 256);
    }
  }

  // Versão 4 e variante RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
