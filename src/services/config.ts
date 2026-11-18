import Constants from 'expo-constants';

type Extra = { apiUrl?: string };

const extra = Constants.expoConfig?.extra as Extra | undefined;

/** Endereço da API, definido em `expo.extra.apiUrl` no app.json (sem barra final). */
export const API_URL = (extra?.apiUrl ?? 'http://localhost:8000').replace(/\/+$/, '');

export const API_BASE_URL = `${API_URL}/api/v1`;
