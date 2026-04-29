import { Platform } from 'react-native';

const Q_OUTLET_ID = 'outletId';

export type GuestUrlParams = {
  outletId: number | null;
};

function parsePositiveInt(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** Read guest navigation params from the current URL (web only). */
export function readGuestUrlParams(): GuestUrlParams {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { outletId: null };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    outletId: parsePositiveInt(sp.get(Q_OUTLET_ID)),
  };
}

type WriteParams = {
  outletId?: number;
};

/** Update the address bar without reloading (web only). */
export function writeGuestUrlParams(
  params: WriteParams,
  mode: 'replace' | 'push' = 'replace',
): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  if (params.outletId != null) sp.set(Q_OUTLET_ID, String(params.outletId));
  const qs = sp.toString();
  const path = window.location.pathname || '/';
  const url = qs ? `${path}?${qs}` : path;
  if (mode === 'push') {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}

export function clearGuestUrlParams(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  window.history.replaceState(null, '', path);
}
