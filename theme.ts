// Shared UI theme (colors) to keep styling consistent across the app.
// Keep this file small and easy to reuse from any screen/component.
export const theme = {
  colors: {
    // Warm "medium-light" palette (not too white, not too dark).
    background: '#efe6cf',
    surface: '#fff3d9',
    surfaceAlt: '#f7efdb',

    headerFooter: '#f7efdb',
    border: '#e2cf9f',

    textPrimary: '#2a1a08',
    textSecondary: '#6a5030',

    primary: '#c8933a',
    primaryDark: '#b87300',

    // Used for the small dark badges/overlays.
    overlay: 'rgba(0,0,0,0.25)',
    overlaySoft: 'rgba(0,0,0,0.15)',

    // Text placed on dark overlays.
    onOverlay: '#ffffff',
  },
} as const;
