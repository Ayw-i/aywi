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

async function loadNews() {
  try {
    const config = await getConfig();
    const { sources, maxPerSource } = config.news;

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

    const tbody = document.getElementById('news-tbody');
    if (allArticles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No news available.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    allArticles.forEach(function (article) {
      const row = document.createElement('tr');
      row.innerHTML =
        '<td>' + article.headline + '</td>' +
        '<td>' + article.site + '</td>' +
        '<td><a href="' + article.url + '" target="_blank" rel="noopener">Read</a></td>';
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('Failed to load news:', err);
    document.getElementById('news-tbody').innerHTML =
      '<tr><td colspan="3">Could not load news.</td></tr>';
  }
}
