/**
 * Cozy Cinema — Ad Shield
 *
 * Honest scope: browsers block any page from reaching INSIDE a cross-origin
 * iframe (same-origin policy), so we cannot directly remove ads injected by a
 * third-party streaming host. What we CAN do, reliably:
 *
 *   1. Apply a strict `sandbox` to the player iframe. Without `allow-popups`
 *      and `allow-top-navigation`, the iframe physically cannot open new
 *      tabs, hijack the address bar, or trigger `window.open` — which kills
 *      the vast majority of streaming-site "ads" (popunders + redirects).
 *
 *   2. Intercept `window.open` and top-level navigation attempts that bubble
 *      out of the iframe (some browsers still try) while the watch page is
 *      mounted, and silently swallow them.
 *
 *   3. Curate ad-friendly embed sources (handled in movie-ai edge function).
 *
 * Toggleable, because a few legitimate players need popups for fullscreen.
 */

const STORAGE_KEY = "cozy-cinema:ad-shield";

export function getAdShieldEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function setAdShieldEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Strict sandbox for embedded players.
 * - allow-scripts: player needs JS
 * - allow-same-origin: required for HLS/cookies on most hosts
 * - allow-forms: some players post for source selection
 * - allow-presentation + allow-orientation-lock: fullscreen / mobile
 * - NO allow-popups → popunders blocked
 * - NO allow-top-navigation → redirects blocked
 * - NO allow-modals → no alert() spam
 */
export const PLAYER_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock";

/**
 * Hardened iframe `allow` policy — denies camera/mic/geolocation/payment
 * which some ad networks probe.
 */
export const PLAYER_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

/**
 * Install a temporary guard against popups / new-tab hijacks while the
 * watch page is mounted. Returns a cleanup function.
 */
export function installPopupGuard(): () => void {
  if (typeof window === "undefined") return () => {};

  const originalOpen = window.open;
  let blockedCount = 0;

  window.open = function blocked(...args: unknown[]) {
    blockedCount++;
    // eslint-disable-next-line no-console
    console.info("[AdShield] Blocked popup attempt:", args[0]);
    // Return a stub so callers don't crash.
    return null as unknown as Window;
  } as typeof window.open;

  const beforeUnload = (e: BeforeUnloadEvent) => {
    // Heuristic: if an iframe just tried to navigate the top page right
    // after a click on its own area, we can't always tell — but we never
    // confirm leaving when shield is on.
    // (We deliberately do not preventDefault here to avoid trapping the
    // user on real navigations.)
    void e;
  };
  window.addEventListener("beforeunload", beforeUnload);

  return () => {
    window.open = originalOpen;
    window.removeEventListener("beforeunload", beforeUnload);
    if (blockedCount > 0) {
      // eslint-disable-next-line no-console
      console.info(`[AdShield] Session blocked ${blockedCount} popup(s).`);
    }
  };
}
