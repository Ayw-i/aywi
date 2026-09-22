// Cloudflare Worker — NHL API proxy + news feed proxy
// Deployed separately at Cloudflare Dashboard → Workers & Pages → nhl-proxy → Edit code
// This file is for reference only; paste the contents into the Worker editor.

// --- News feed sources ---
// To add a new source: add one line here AND add it to config.json news.sources
const FEEDS = {
  'lighthouse':  'https://www.lighthousehockey.com/rss/index.xml',
  'nypost':      'https://nypost.com/tag/new-york-islanders/feed/',
  'eyesonisles': 'https://eyesonisles.com/feed/',

  // All Islanders-specific by design. Checked 2026-09-21, NOT usable:
  //   The Athletic          — 404, paywalled, killed public RSS
  //   nhl.com               — serves HTML, no feed
  //   nypost /sports/islanders/feed/ — valid RSS but ZERO items (use /tag/ above)
  //   thehockeywriters.com tag feed  — 404
  //   islesnation.net       — serves HTML, no feed
  //   reddit r/NewYorkIslanders      — fan posts not news, and had gone stale
  //
  // League-wide NHL feeds were checked and rejected — Islanders items in a
  // current sample: ESPN 0/13, CBS 0/36, SB Nation 0/10, Yahoo 0/50 headlines
  // (Yahoo's apparent hits were syndicated Lighthouse Hockey pieces, i.e.
  // duplicates of a feed we already carry). If one is ever added, it needs
  // headline filtering in news.js or it will flood the table with other teams.
};

// --- Who may use this proxy ---
// Browsers only let a page read these responses if the Origin it sent is
// listed here. Without this, any other website could use this Worker as its
// own NHL/Polymarket proxy on our request quota.
const ALLOWED_ORIGINS = [
  'https://aywi.aywi.workers.dev',   // public site (Cloudflare → Workers & Pages → aywi)
];
// VS Code Live Server, on any port (it moves off 5500 when that's busy)
const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.indexOf(origin) !== -1 || LOCAL_DEV_ORIGIN.test(origin);
}

// Only these Polymarket (gamma-api) endpoints are passed through, so this
// isn't an open proxy to the whole Polymarket API. sorokin.html uses /events.
const POLYMARKET_PATHS = ['/events', '/public-search'];

// Response headers shared by every proxied route. The CORS header is only
// sent back for an allowed origin; "Vary: Origin" keeps caches from handing
// one site's response to another.
function proxyHeaders(origin, contentType, maxAge) {
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=' + maxAge,
    'Vary': 'Origin',
  };
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export default {
  async fetch(request) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin');

    // A request from another website's page: refuse before spending an
    // upstream fetch on it. (Requests with no Origin — typing the URL into the
    // address bar, curl — still work, which keeps debugging easy.)
    if (origin && !isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // --- NHL API proxy: /v1/... ---
    if (url.pathname.startsWith('/v1/')) {
      const nhlUrl = 'https://api-web.nhle.com' + url.pathname + url.search;
      const nhlResponse = await fetch(nhlUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'aywi-proxy/1.0' },
      });
      const body = await nhlResponse.text();
      return new Response(body, {
        status: nhlResponse.status,
        headers: proxyHeaders(origin, 'application/json', 60),
      });
    }

    // --- Polymarket proxy: /polymarket/... ---
    if (url.pathname.startsWith('/polymarket/')) {
      const pmPath = url.pathname.slice('/polymarket'.length);
      if (POLYMARKET_PATHS.indexOf(pmPath) === -1) {
        return new Response('Not found', { status: 404 });
      }
      const pmUrl  = 'https://gamma-api.polymarket.com' + pmPath + url.search;
      const pmResponse = await fetch(pmUrl, {
        headers: { 'User-Agent': 'aywi-proxy/1.0' },
      });
      const body = await pmResponse.text();
      return new Response(body, {
        status: pmResponse.status,
        headers: proxyHeaders(origin, 'application/json', 300),
      });
    }

    // --- News feed proxy: /feeds/{key} ---
    if (url.pathname.startsWith('/feeds/')) {
      const key = url.pathname.slice(7);
      // hasOwn, not FEEDS[key]: a key like "constructor" would otherwise find a
      // built-in JavaScript property instead of a feed and crash the request.
      if (!Object.hasOwn(FEEDS, key)) {
        return new Response('Unknown feed', { status: 404 });
      }
      const feedUrl = FEEDS[key];
      const feedResponse = await fetch(feedUrl, {
        headers: { 'User-Agent': 'aywi-proxy/1.0' },
      });
      const body = await feedResponse.text();
      return new Response(body, {
        status: feedResponse.status,
        headers: proxyHeaders(origin, 'application/xml; charset=utf-8', 300),
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
