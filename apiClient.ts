import axios, { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { showAlert } from './utils/alert';
import { logout } from './redux-store/slices/userSlice';
import { store } from './redux-store/store';

const BASE_URL = "http://187.127.133.72:5005";

console.log('[apiClient] baseURL =', BASE_URL);

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

interface ErrorResponse {
  error?: string;
  message?: string;
  success?: boolean;
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ErrorResponse>) => {
    if (error.response?.status === 401) {
      const hadToken = !!store.getState().user.token;
      const url = String(error.config?.url ?? '');
      const isLoginAttempt = url.includes('/auth/login');

      if (hadToken && !isLoginAttempt) {
        const data = error.response?.data;
        const text =
          (typeof data?.message === 'string' && data.message) ||
          (typeof data?.error === 'string' && data.error) ||
          'Your session is no longer valid. Please log in again.';
        const title =
          typeof data?.message === 'string' &&
          /blocked|inactive/i.test(data.message)
            ? 'Account unavailable'
            : 'Session ended';

        await showAlert({
          title,
          text,
          icon: 'warning',
          confirmButtonText: 'OK',
        });
        store.dispatch(logout());
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        } else {
          router.replace('/(auth)/login');
        }
      }
    }

    return Promise.reject(error);
  },
);

/** RN FormData often fails `instanceof FormData`, so we must detect append()-based bodies. */
function isMultipartBody(data: unknown): boolean {
  if (data == null) return false;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return true;
  return (
    typeof data === 'object' &&
    typeof (data as { append?: unknown }).append === 'function'
  );
}

apiClient.interceptors.request.use((config) => {
  try {
    const state = store.getState();
    const token = state.user.token;
    if (token) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Authorization =
        `Bearer ${token}`;
    } else {
      config.headers = config.headers || {};
    }

    if (isMultipartBody(config.data)) {
      // Let axios set multipart boundary; never send application/json for uploads.
      const ch = config.headers;
      if (ch instanceof AxiosHeaders) {
        ch.delete('Content-Type');
      } else {
        const h = ch as Record<string, string>;
        delete h['Content-Type'];
        delete h['content-type'];
      }
    } else {
      config.headers = config.headers || {};
      if (!(config.headers as Record<string, string>)['Content-Type']) {
        (config.headers as Record<string, string>)['Content-Type'] =
          'application/json';
      }
    }
  } catch {
    /* ignore */
  }
  return config;
});

function getApiBaseUrl(): string {
    return BASE_URL;
}

function joinApiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Multipart item create/update must use `fetch`, not Axios: React Native's FormData is often not
 * recognized by Axios and gets serialized incorrectly → generic "Network Error".
 */
export async function fetchWithAuthMultipart(
  method: 'POST' | 'PUT',
  path: string,
  form: FormData,
): Promise<void> {
  const token = store.getState().user.token;
  const headers: Record<string, string> = {
    // Note: React Native's FormData requirement sometimes means we shouldn't set Content-Type
    // so the multipart boundary is handled by the fetch engine.
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(joinApiUrl(path), {
      method,
      body: form,
      headers,
      signal: controller.signal,
    });

    if (res.status === 401) {
      const hadToken = !!token;
      const isLoginAttempt = path.includes('/auth/login');
      if (hadToken && !isLoginAttempt) {
        let text = 'Your session is no longer valid. Please log in again.';
        try {
          const data = (await res.json()) as ErrorResponse;
          if (typeof data?.message === 'string' && data.message)
            text = data.message;
        } catch {
          /* ignore */
        }
        await showAlert({
          title: /blocked|inactive/i.test(text)
            ? 'Account unavailable'
            : 'Session ended',
          text,
          icon: 'warning',
          confirmButtonText: 'OK',
        });
        store.dispatch(logout());
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') window.location.href = '/';
        } else {
          router.replace('/(auth)/login');
        }
      }
      throw new Error('Session ended');
    }

    if (!res.ok) {
      const raw = await res.text();
      let msg = `Request failed (${res.status})`;
      try {
        const j = JSON.parse(raw) as {
          message?: string;
          error?: string;
          errors?: string[];
        };
        if (typeof j?.message === 'string' && j.message) msg = j.message;
        else if (typeof j?.error === 'string' && j.error) msg = j.error;
        else if (Array.isArray(j?.errors) && j.errors.length)
          msg = String(j.errors[0]);
      } catch {
        if (raw.trim()) msg = raw.trim().slice(0, 300);
      }
      throw new Error(msg);
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        'Upload timed out. Try a smaller image or check your connection.',
      );
    }
    if (
      e instanceof Error &&
      /network request failed|failed to fetch|load failed|internet connection appears/i.test(
        e.message,
      )
    ) {
      throw new Error(
        'Could not reach the API. Check EXPO_PUBLIC_API_URL, Wi‑Fi, and that the server allows HTTPS from your device.',
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export default apiClient;
