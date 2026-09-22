// Some feeds (Lighthouse Hockey) wrap titles in CDATA, so HTML entities like
// "&#8211;" reach us as literal text instead of "–". This decodes them using an
// inert HTML document: DOMParser documents never run scripts or load images,
// and only the resulting plain text is kept. That text is still only ever put
// on the page with textContent, so decoded "<...>" shows as text, never markup.
function decodeEntities(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent;
}

function parseFeed(xmlText, sourceName) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, 'text/xml');
  const isAtom = doc.querySelector('feed') !== null;
  const items  = isAtom
    ? Array.from(doc.querySelectorAll('entry'))
    : Array.from(doc.querySelectorAll('item'));

  return items.map(function (item) {
    const headline = item.querySelector('title')
      ? decodeEntities(item.querySelector('title').textContent).trim() : '';

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

    // Missing or unreadable dates become new Date(0): sorted last, shown as "—"
    const parsed = dateEl ? new Date(dateEl.textContent) : null;

    return {
      headline: headline,
      url:      url,
      site:     sourceName,
      date:     (parsed && !isNaN(parsed)) ? parsed : new Date(0),
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

// --- Dates ---

// "12m ago" / "3h ago" today, "Yesterday", then "Sep 18" (plus the year if it
// isn't this year). Articles with no usable date show "—".
function formatNewsDate(date, now) {
  if (!date || isNaN(date) || date.getTime() === 0) return '—';

  const diffMs = now - date;
  if (diffMs < 60 * 1000) return 'Just now';        // also covers slightly-future clocks
  if (diffMs < 60 * 60 * 1000) return Math.floor(diffMs / 60000) + 'm ago';

  const sameDay = function (a, b) { return a.toDateString() === b.toDateString(); };
  if (sameDay(date, now)) return Math.floor(diffMs / 3600000) + 'h ago';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[date.getMonth()] + ' ' + date.getDate() +
    (date.getFullYear() !== now.getFullYear() ? ', ' + date.getFullYear() : '');
}

// --- Paging ---
// Page 1 is the balanced front page: at most maxPerSource from each feed, so
// one busy site (Eyes on Isles posts ~90 a month) can't take over the table.
// Pages 2+ are everything else the feeds returned, newest first. All pages come
// from the articles already fetched — paging never makes another request.

let _newsPages    = [];
let _newsPageIdx  = 0;
let _newsPageSize = 12;

function newestFirst(a, b) { return b.date - a.date; }

function buildNewsPages(feeds, maxPerSource, pageSize, maxPages) {
  let firstPage = [];
  feeds.forEach(function (articles) {
    firstPage = firstPage.concat(articles.slice().sort(newestFirst).slice(0, maxPerSource));
  });
  firstPage.sort(newestFirst);
  firstPage = firstPage.slice(0, pageSize);

  const rest = [].concat.apply([], feeds)
    .filter(function (article) { return firstPage.indexOf(article) === -1; })
    .sort(newestFirst);

  const pages = [firstPage];
  for (let i = 0; i < rest.length && pages.length < maxPages; i += pageSize) {
    pages.push(rest.slice(i, i + pageSize));
  }
  return pages;
}

// Feed text comes from third-party sites, so it's never parsed as HTML:
// cells are filled with textContent, and links are only kept if they're
// plain http(s) URLs (a "javascript:" link would run code on click).
function renderNewsPage(idx) {
  _newsPageIdx = idx;
  const tbody = document.getElementById('news-tbody');
  const now   = new Date();
  tbody.innerHTML = '';

  _newsPages[idx].forEach(function (article) {
    const row = document.createElement('tr');

    // The headline is the link. If the URL isn't a plain http(s) one, the
    // headline still shows, just not clickable.
    const headlineCell = document.createElement('td');
    const safeUrl      = safeArticleURL(article.url);
    if (safeUrl) {
      const link = document.createElement('a');
      link.href        = safeUrl;
      link.target      = '_blank';
      link.rel         = 'noopener';
      link.textContent = article.headline;
      link.title       = article.headline;   // full text on hover when cut off with "…"
      headlineCell.appendChild(link);
    } else {
      headlineCell.textContent = article.headline;
      headlineCell.title       = article.headline;
    }

    const siteCell = document.createElement('td');
    siteCell.textContent = article.site;

    const dateCell = document.createElement('td');
    dateCell.textContent = formatNewsDate(article.date, now);

    row.appendChild(headlineCell);
    row.appendChild(siteCell);
    row.appendChild(dateCell);
    tbody.appendChild(row);
  });

  // A short last page gets blank rows, so the table's height (and the pager
  // under it) stays put.
  for (let i = _newsPages[idx].length; i < _newsPageSize; i++) {
    const blank = document.createElement('tr');
    for (let c = 0; c < 3; c++) {
      const td = document.createElement('td');
      td.textContent = '\u00a0';   // non-breaking space: keeps the row full height
      blank.appendChild(td);
    }
    tbody.appendChild(blank);
  }

  renderNewsPager();
}

// « Prev | Page 2 of 10 | Next »  — the ends show as dimmed plain text.
// Laid out as a three-cell table with a fixed-width middle, so the links stay
// in exactly the same spot whether it says "Page 1 of 10" or "Page 10 of 10".
function renderNewsPager() {
  const pager = document.getElementById('news-pager');
  if (!pager) return;
  pager.innerHTML = '';
  if (_newsPages.length < 2) return;

  function pagerLink(label, targetIdx) {
    if (targetIdx < 0 || targetIdx >= _newsPages.length) {
      const dim = document.createElement('span');
      dim.textContent = label;
      dim.style.opacity = '0.35';
      return dim;
    }
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = label;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      renderNewsPage(targetIdx);
    });
    return link;
  }

  function cell(content, css) {
    const td = document.createElement('td');
    td.style.cssText = 'border:none;padding:0;' + css;
    td.appendChild(content);
    return td;
  }

  const table = document.createElement('table');
  table.style.border = 'none';
  const row = table.insertRow();
  row.appendChild(cell(pagerLink('« Prev', _newsPageIdx - 1), 'width:50%;text-align:right;'));
  row.appendChild(cell(document.createTextNode('Page ' + (_newsPageIdx + 1) + ' of ' + _newsPages.length),
    'width:120px;min-width:120px;text-align:center;white-space:nowrap;'));
  row.appendChild(cell(pagerLink('Next »', _newsPageIdx + 1), 'width:50%;text-align:left;'));
  pager.appendChild(table);
}

// --- Load ---

async function loadNews() {
  try {
    const config = await getConfig();
    const news   = config.news;

    // One list per feed, in config order. A feed that fails just stays empty.
    const feeds = await Promise.all(news.sources.map(async function (source) {
      try {
        const res = await fetch(WORKER + '/feeds/' + source.key);
        const xml = await res.text();
        return parseFeed(xml, source.name);
      } catch (e) {
        console.warn('Failed to load feed:', source.key, e);
        return [];
      }
    }));

    _newsPageSize = news.pageSize || 12;
    _newsPages    = buildNewsPages(feeds, news.maxPerSource || 5, _newsPageSize, news.maxPages || 10);

    if (_newsPages[0].length === 0) {
      document.getElementById('news-tbody').innerHTML = '<tr><td colspan="3">No news available.</td></tr>';
      return;
    }
    renderNewsPage(0);

  } catch (err) {
    console.error('Failed to load news:', err);
    document.getElementById('news-tbody').innerHTML =
      '<tr><td colspan="3">Could not load news.</td></tr>';
  }
}
