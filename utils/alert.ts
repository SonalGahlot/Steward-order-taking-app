// Registered by AlertProvider (see components/AlertProvider.tsx)
let alertManager: {
  showAlert: (options: AlertOptions) => Promise<{ isConfirmed: boolean }>;
} | null = null;

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AlertOptions {
  title: string;
  text: string;
  icon?: 'success' | 'error' | 'warning' | 'info';
  /** If set, overrides showCancelButton / confirmButtonText */
  buttons?: AlertButton[];
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

export const setAlertManager = (manager: {
  showAlert: (options: AlertOptions) => Promise<{ isConfirmed: boolean }>;
}) => {
  alertManager = manager;
};

export const showAlert = (
  options: AlertOptions,
): Promise<{ isConfirmed: boolean }> => {
  if (!alertManager) {
    console.warn(
      'AlertProvider not initialized. Wrap the app with <AlertProvider>.',
    );
    return Promise.resolve({ isConfirmed: false });
  }
  return alertManager.showAlert(options);
};

export const showSuccess = (title: string, text: string) => {
  return showAlert({ title, text, icon: 'success' });
};

export const showError = (title: string, text: string) => {
  return showAlert({ title, text, icon: 'error' });
};

export const showInfo = (title: string, text: string) => {
  return showAlert({ title, text, icon: 'info' });
};

export const showWarning = (title: string, text: string) => {
  return showAlert({ title, text, icon: 'warning' });
};

export const showConfirm = (
  title: string,
  text: string,
  confirmText = 'Delete',
  cancelText = 'Cancel',
) => {
  return showAlert({
    title,
    text,
    icon: 'warning',
    buttons: [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, style: 'destructive' },
    ],
  });
};

/** Same shape as React Native `Alert.alert` — uses the custom modal UI. */
export type AppAlertButton = AlertButton;

export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
): void {
  void showAlertAsync(title, message, buttons);
}

async function showAlertAsync(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
): Promise<void> {
  const text = message ?? '';
  if (!buttons?.length) {
    await showAlert({ title, text, icon: 'info', confirmButtonText: 'OK' });
    return;
  }
  const hasDestructive = buttons.some((b) => b.style === 'destructive');
  await showAlert({
    title,
    text,
    icon: hasDestructive ? 'warning' : 'info',
    buttons: buttons.map((b) => ({
      text: b.text,
      style: b.style ?? 'default',
      onPress: b.onPress,
    })),
  });
}
