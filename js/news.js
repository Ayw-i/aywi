function parseFeed(xmlText, sourceName) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, 'text/xml');
  const isAtom = doc.querySelector('feed') !== null;
  const items  = isAtom
    ? Array.from(doc.querySelectorAll('entry'))
    : Array.from(doc.querySelectorAll('item'));

  return items.map(function (item) {
    const headline = item.querySelector('title')
      ? item.querySelector('title').textContent.trim() : '';

    let url = '';
    if (isAtom) {
      const linkEl = item.querySelector('link[rel="alternate"]') || item.querySelector('link');
      url = linkEl ? (linkEl.getAttribute('href') || linkEl.textContent.trim()) : '';
    } else {
      const linkEl = item.querySelector('link');
      url = linkEl ? linkEl.textContent.trim() : '';
    }

    const dateEl = isAtom
      ? (item.querySelector('published') || item.querySelector('updated'))
      : item.querySelector('pubDate');

    return {
      headline: headline,
      url:      url,
      site:     sourceName,
      date:     dateEl ? new Date(dateEl.textContent) : new Date(0),
    };
  });
}

// Returns the URL only if it's http(s); anything else ("javascript:", "data:",
// garbage) comes back as ''.
function safeArticleURL(raw) {
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
  } catch (e) {
    return '';
  }
}

async function loadNews() {
  try {
    const config = await getConfig();
    const { sources, maxPerSource, maxTotal } = config.news;

    const allArticles = [];

    await Promise.all(sources.map(async function (source) {
      try {
        const res      = await fetch(WORKER + '/feeds/' + source.key);
        const xml      = await res.text();
        const articles = parseFeed(xml, source.name).slice(0, maxPerSource);
        allArticles.push(...articles);
      } catch (e) {
        console.warn('Failed to load feed:', source.key, e);
      }
    }));

    allArticles.sort(function (a, b) { return b.date - a.date; });
    if (maxTotal) allArticles.length = Math.min(allArticles.length, maxTotal);

    const tbody = document.getElementById('news-tbody');
    if (allArticles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No news available.</td></tr>';
      return;
    }

    // Feed text comes from third-party sites, so it's never parsed as HTML:
    // cells are filled with textContent, and links are only kept if they're
    // plain http(s) URLs (a "javascript:" link would run code on click).
    tbody.innerHTML = '';
    allArticles.forEach(function (article) {
      const row = document.createElement('tr');

      const headlineCell = document.createElement('td');
      headlineCell.textContent = article.headline;

      const siteCell = document.createElement('td');
      siteCell.textContent = article.site;

      const linkCell = document.createElement('td');
      const safeUrl  = safeArticleURL(article.url);
      if (safeUrl) {
        const link = document.createElement('a');
        link.href        = safeUrl;
        link.target      = '_blank';
        link.rel         = 'noopener';
        link.textContent = 'Read';
        linkCell.appendChild(link);
      } else {
        linkCell.textContent = '—';
      }

      row.appendChild(headlineCell);
      row.appendChild(siteCell);
      row.appendChild(linkCell);
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('Failed to load news:', err);
    document.getElementById('news-tbody').innerHTML =
      '<tr><td colspan="3">Could not load news.</td></tr>';
  }
}
