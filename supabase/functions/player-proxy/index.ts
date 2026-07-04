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
  out = out.replace(/(["'=\(,])\/\/([a-z0-9.-]+\.[a-z]{2,}[^"'\s<)]*)/gi, "$1https://$2");
  out = out.replace(/(["'|])Ù:\/\/([£-ʯ.]+)/g, "$1https://$2");
  out = out.replace(/<meta\b[^>]*name=["']viewport["'][^>]*>/i, '<meta name="viewport" content="width=1280, initial-scale=1">');

  if (/<head[^>]*>/i.test(out)) {
    return out.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${desktopScript}`);
  }

  return `<!doctype html><html><head>${baseTag}${desktopScript}</head><body>${out}</body></html>`;
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