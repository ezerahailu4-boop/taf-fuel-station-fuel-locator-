/** Subset of the Telegram Mini App SDK that we use. https://core.telegram.org/bots/webapps */
export interface TelegramLocationManager {
  isInited: boolean;
  isLocationAvailable: boolean;
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  init(cb?: () => void): void;
  getLocation(cb: (loc: { latitude: number; longitude: number } | null) => void): void;
  openSettings(): void;
}

export interface TelegramWebApp {
  initData: string;
  colorScheme?: "light" | "dark";
  ready(): void;
  expand(): void;
  openLink?(url: string, opts?: { try_instant_view?: boolean }): void;
  onEvent?(event: string, cb: () => void): void;
  offEvent?(event: string, cb: () => void): void;
  LocationManager?: TelegramLocationManager;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}
