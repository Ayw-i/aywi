// Cloudflare Worker — NHL API proxy + news feed proxy
// Deployed separately at Cloudflare Dashboard → Workers & Pages → nhl-proxy → Edit code
// This file is for reference only; paste the contents into the Worker editor.

// --- News feed sources ---
// To add a new source: add one line here AND add it to config.json news.sources
const FEEDS = {
  'lighthouse': 'https://www.lighthousehockey.com/rss/index.xml',
  // 'nypost':     'https://...',
  // 'athletic':   'https://...',
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
