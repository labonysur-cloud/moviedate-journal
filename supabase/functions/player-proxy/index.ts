import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const allowedHosts = /(?:cinecloud\.|cloudnestra\.|yagaverse\.net|netfilm\.world|themoviebox\.|movibox\.|moviebox\.|inmoviebox\.|cinefreak\.|mlwbd\.|mlsbd\.|bubbletv\.|hdhub4u\.|vidsrc\.|2embed\.|multiembed\.|vidcloud\.)/i;
const nestedPlayerHosts = /(?:stream\.yagaverse\.net|cinecloud\.|cloudnestra\.|vidsrc\.|2embed\.|multiembed\.|vidcloud\.)/i;

function assertSafeUrl(input: string) {
  const url = new URL(input);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only web links are supported");
  if (!allowedHosts.test(url.hostname)) throw new Error("This source is not supported by the desktop player proxy");
  return url;
}

function absolutize(value: string, base: URL) {
  return new URL(value.replace(/&amp;/g, "&"), base).toString();
}

function getBaseHref(url: URL) {
  const pathname = url.pathname.endsWith("/") ? url.pathname : url.pathname.replace(/\/[^/]*$/, "/");
  return `${url.origin}${pathname}`;
}

function extractNestedPlayer(html: string, base: URL) {
  const iframeRe = /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = iframeRe.exec(html)) !== null) {
    const src = absolutize(match[1], base);
    if (nestedPlayerHosts.test(src)) return src;
  }
  return null;
}

function removeKnownAdScripts(html: string) {
  return html
    .replace(/<script\b[^>]*\bsrc=["'][^"']*(?:kiblahmafia|llvpn|tsyndicate|trafficstars|evadav|pufted|cloudfront\.net\/\?)[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script\b[^>]*>\s*\(function\(s\)\{s\.dataset\.zone[\s\S]*?<\/script>/gi, "");
}

function getPlayerCleanupInjection(finalUrl: URL) {
  const isMovieBox = /(?:^|\.)moviebox\.|(?:^|\.)themoviebox\.|(?:^|\.)movibox\.|(?:^|\.)inmoviebox\./i.test(finalUrl.hostname);

  const cleanupCss = `
<style id="cozy-player-cleanup">
  html, body { min-width: 1280px !important; background: #050505 !important; }
  .h5-page, .mobile-page, [class*="mobile-download" i], [class*="download-card" i], [class*="downloadapp" i],
  [href*="/downloadApp"], [href*="downloadApp"], [class*="ThirdPartyAd" i], [class*="AdsCard" i],
  [class*="interstitial" i], [class*="ad-card" i], [class*="adcard" i], [class*="ad_banner" i],
  [id*="google_ads" i], [id*="ad_iframe" i], [data-ad], ins.adsbygoogle,
  iframe[src*="googlesyndication"], iframe[src*="doubleclick"], iframe[src*="adservice"], iframe[src*="traffic"],
  script[src*="googlesyndication"], script[src*="doubleclick"] {
    display: none !important; visibility: hidden !important; pointer-events: none !important;
  }
  .pc-page { display: block !important; }
  video { max-width: 100% !important; }
</style>`;

  const cleanupScript = `
<script>
(() => {
  const isMovieBox = ${JSON.stringify(isMovieBox)};
  const blockedUrl = /(?:googlesyndication|doubleclick|google-analytics|googletagmanager|firebase|adservice|trafficstars|tsyndicate|evadav|ad\/get-config|\/app\/get-latest-app-pkgs)/i;
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  if (originalFetch) {
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (blockedUrl.test(String(url))) {
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch(input, init);
    };
  }

  const originalOpen = window.open;
  window.open = (url, target, features) => {
    if (/downloadApp|apk|adservice|doubleclick|googlesyndication|traffic|tsyndicate|evadav/i.test(String(url || ''))) return null;
    return originalOpen ? originalOpen.call(window, url, target, features) : null;
  };

  const isVisibleBox = (el) => {
    const rect = el.getBoundingClientRect?.();
    if (!rect) return false;
    return rect.width > 180 && rect.height > 120;
  };

  const isAdLike = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const marker = [el.id, el.className, el.getAttribute?.('aria-label'), el.getAttribute?.('data-ad')].join(' ').toLowerCase();
    const style = window.getComputedStyle(el);
    const z = Number(style.zIndex) || 0;
    const fixedOverlay = (style.position === 'fixed' || style.position === 'sticky') && z >= 8 && isVisibleBox(el);
    if (/explore what's happening|global conversations|fresh perspectives|advertisement|sponsored|\\bad\\b/.test(text) && isVisibleBox(el)) return true;
    if (/(^|[-_\\s])(ad|ads|advert|interstitial|popup|banner)([-_\\s]|$)/.test(marker) && isVisibleBox(el)) return true;
    if (fixedOverlay && /\\bad\\b|advertisement|sponsored|install app|download app/.test(text)) return true;
    return false;
  };

  const cleanupAds = () => {
    document.querySelectorAll('iframe, ins, [id], [class], [data-ad]').forEach((el) => {
      try { if (isAdLike(el)) el.remove(); } catch (_) {}
    });

    document.querySelectorAll('button, [role="button"], img, svg, div, span').forEach((el) => {
      try {
        const label = [el.getAttribute?.('aria-label'), el.getAttribute?.('alt'), el.innerText, el.textContent].join(' ').toLowerCase();
        if (!/(close|×|✕|skip|dismiss)/i.test(label)) return;
        const parent = el.closest?.('[id], [class], div');
        if (parent && isAdLike(parent)) el.click?.();
      } catch (_) {}
    });
  };

  const blockAppRedirects = (event) => {
    const target = event.target?.closest?.('a, button, [role="button"], div, span');
    if (!target) return;
    const href = target.getAttribute?.('href') || '';
    const text = (target.innerText || target.textContent || '').trim();
    if (/downloadApp|apk|watch in app|download app|moviebox app/i.test(href + ' ' + text)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener('click', blockAppRedirects, true);

  const clickWatchOnlineOnce = () => {
    if (!isMovieBox || window.__cozyClickedWatchOnline) return;
    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'));
    const watch = candidates.find((el) => /^\\s*watch online\\s*$/i.test(el.innerText || el.textContent || ''));
    if (watch) {
      window.__cozyClickedWatchOnline = true;
      try { watch.click(); } catch (_) {}
    }
  };

  const install = () => {
    cleanupAds();
    if (isMovieBox) {
      document.documentElement.classList.add('pc-html');
      document.querySelectorAll('.h5-page, .h5-detail-resource, .h5-footer').forEach((el) => el.remove());
      setTimeout(clickWatchOnlineOnce, 900);
      setTimeout(clickWatchOnlineOnce, 2500);
    }
  };

  install();
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(install, 1500);
})();
</script>`;

  return `${cleanupCss}${cleanupScript}`;
}

function injectDesktopEnvironment(html: string, finalUrl: URL) {
  const desktopScript = `
<script>
(() => {
  const desktopUA = ${JSON.stringify(DESKTOP_UA)};
  const define = (target, key, value) => {
    try { Object.defineProperty(target, key, { get: () => value, configurable: true }); } catch (_) {}
  };
  const createStorage = () => {
    const data = new Map();
    return {
      get length() { return data.size; },
      key: (index) => Array.from(data.keys())[index] || null,
      getItem: (key) => data.has(String(key)) ? data.get(String(key)) : null,
      setItem: (key, value) => { data.set(String(key), String(value)); },
      removeItem: (key) => { data.delete(String(key)); },
      clear: () => { data.clear(); },
    };
  };
  const storage = createStorage();
  const session = createStorage();
  try { Object.defineProperty(window, 'localStorage', { value: storage, configurable: true }); } catch (_) {}
  try { Object.defineProperty(window, 'sessionStorage', { value: session, configurable: true }); } catch (_) {}
  try {
    let cookieValue = 'gdplayer_desktop=1; cookie_consent=1; adsEnabled=false';
    Object.defineProperty(Document.prototype, 'cookie', {
      get: () => cookieValue,
      set: (value) => { cookieValue = cookieValue ? cookieValue + '; ' + String(value).split(';')[0] : String(value).split(';')[0]; },
      configurable: true,
    });
  } catch (_) {}
  define(Navigator.prototype, 'userAgent', desktopUA);
  define(Navigator.prototype, 'platform', 'Win32');
  define(Navigator.prototype, 'vendor', 'Google Inc.');
  define(Navigator.prototype, 'maxTouchPoints', 0);
  define(window, 'innerWidth', 1280);
  define(window, 'outerWidth', 1280);
  define(window, 'screen', { width: 1280, height: 720, availWidth: 1280, availHeight: 720, orientation: { type: 'landscape-primary', angle: 0 } });
  const originalMatchMedia = window.matchMedia ? window.matchMedia.bind(window) : null;
  window.matchMedia = (query) => {
    const q = String(query || '').toLowerCase();
    if (q.includes('pointer') || q.includes('hover') || q.includes('max-width') || q.includes('orientation')) {
      return { matches: q.includes('hover') || q.includes('fine') || q.includes('min-width'), media: query, onchange: null, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return false; } };
    }
    return originalMatchMedia ? originalMatchMedia(query) : { matches: false, media: query, onchange: null, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return false; } };
  };
})();
</script>`;

  const baseTag = `<base href="${getBaseHref(finalUrl)}">`;
  let out = removeKnownAdScripts(html);
  // Convert protocol-relative HTML asset attributes (`src="//cdn..."`) only.
  // Do not rewrite every `//` in the document: Nuxt/React scripts contain regex
  // literals and comments where global rewriting creates syntax errors.
  out = out.replace(/(\b(?:src|href|poster|content)=['"])\/\/([^"'\s>]+)/gi, "$1https://$2");
  out = out.replace(/(["'|])Ù:\/\/([£-ʯ.]+)/g, "$1https://$2");
  out = out.replace(/<meta\b[^>]*name=["']viewport["'][^>]*>/i, '<meta name="viewport" content="width=1280, initial-scale=1">');

  const cleanupInjection = getPlayerCleanupInjection(finalUrl);

  if (/<head[^>]*>/i.test(out)) {
    return out.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${desktopScript}${cleanupInjection}`);
  }

  return `<!doctype html><html><head>${baseTag}${desktopScript}${cleanupInjection}</head><body>${out}</body></html>`;
}

async function fetchDesktopHtml(url: URL) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": DESKTOP_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(`Source returned ${res.status}`);
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error("Source is not an HTML player");
  return { html: await res.text(), finalUrl: new URL(res.url) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestUrl = new URL(req.url);
    const { url } = req.method === "GET"
      ? { url: requestUrl.searchParams.get("url") }
      : await req.json();
    const requestedUrl = assertSafeUrl(String(url || ""));
    let { html, finalUrl } = await fetchDesktopHtml(requestedUrl);

    const nested = extractNestedPlayer(html, finalUrl);
    if (nested) {
      const nestedUrl = assertSafeUrl(nested);
      const nestedResult = await fetchDesktopHtml(nestedUrl);
      html = nestedResult.html;
      finalUrl = nestedResult.finalUrl;
    }

    const desktopHtml = injectDesktopEnvironment(html, finalUrl);

    if (req.method === "GET") {
      return new Response(desktopHtml, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response(JSON.stringify({ html: desktopHtml, finalUrl: finalUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load desktop player";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});