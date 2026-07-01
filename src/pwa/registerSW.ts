// Guarded service-worker registration.
// Never registers in dev, iframe, or Lovable preview hosts.
// Supports ?sw=off kill switch.

const APP_SW_PATH = "/sw.js";

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) {
    const scriptURL = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
    if (scriptURL.endsWith(APP_SW_PATH)) {
      try {
        await r.unregister();
      } catch {}
    }
  }
}

export async function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const refused =
    !import.meta.env.PROD || isInIframe() || isPreviewHost() || killSwitch;

  if (refused) {
    await unregisterMatching();
    return;
  }

  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch (e) {
    console.warn("SW register failed", e);
  }
}
