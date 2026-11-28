export function isOfferAcceptedForCommunity(admissionsStatus: unknown, offerStatus: unknown): boolean {
  return admissionsStatus === "offer_accepted" && offerStatus === "accepted";
}

/**
 * Accept only private Telegram invitation-link forms. Whether Telegram is
 * configured to require admin approval is enforced separately by a server-only
 * deployment flag and a manual Telegram-side acceptance check.
 */
export function getSafeTelegramInviteUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const validPath = /^\/\+[^/]+$/.test(url.pathname) || /^\/joinchat\/[^/]+$/.test(url.pathname);
    if (url.protocol !== "https:" || url.hostname !== "t.me" || url.username || url.password || !validPath) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
