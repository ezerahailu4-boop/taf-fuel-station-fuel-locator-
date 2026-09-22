import "@/types/telegram";

/** Opens a link outside the Mini App (Telegram's own opener when available). */
export function openExternal(url: string): void {
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink && /^https?:/i.test(url)) tg.openLink(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
