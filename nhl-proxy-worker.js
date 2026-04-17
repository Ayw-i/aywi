// Cloudflare Worker — NHL API proxy
// Deployed separately at Cloudflare Dashboard → Workers & Pages → Create Worker
// This file is for reference only; paste the contents into the Worker editor.

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only allow /v1/ paths
    if (!url.pathname.startsWith('/v1/')) {
      return new Response('Not found', { status: 404 });
    }

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
  },
};
