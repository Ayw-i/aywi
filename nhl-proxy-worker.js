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

export default {
  async fetch(request) {
    const url = new URL(request.url);

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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    // --- Polymarket proxy: /polymarket/... ---
    if (url.pathname.startsWith('/polymarket/')) {
      const pmPath = url.pathname.slice('/polymarket'.length);
      const pmUrl  = 'https://gamma-api.polymarket.com' + pmPath + url.search;
      const pmResponse = await fetch(pmUrl, {
        headers: { 'User-Agent': 'aywi-proxy/1.0' },
      });
      const body = await pmResponse.text();
      return new Response(body, {
        status: pmResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // --- News feed proxy: /feeds/{key} ---
    if (url.pathname.startsWith('/feeds/')) {
      const key = url.pathname.slice(7);
      const feedUrl = FEEDS[key];
      if (!feedUrl) {
        return new Response('Unknown feed: ' + key, { status: 404 });
      }
      const feedResponse = await fetch(feedUrl, {
        headers: { 'User-Agent': 'aywi-proxy/1.0' },
      });
      const body = await feedResponse.text();
      return new Response(body, {
        status: feedResponse.status,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
