(function () {
  var links = [
    { href: 'index.html',    label: 'Home' },
    { href: 'season.html',   label: 'Season' },
    { href: 'series.html',   label: 'Series' },
    { href: 'schedule.html', label: 'Schedule' },
    { href: 'playoffs.html', label: 'Playoffs' },
    { href: 'stats.html',    label: 'Stats' },
    { href: 'about.html',    label: 'About' },
  ];

  // Compared without ".html": the live site serves pages at /season rather
  // than /season.html, while Live Server keeps the .html.
  var current = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');

  var html = '<h1>Are Ya Winning, Isles?</h1><nav>';
  links.forEach(function (link) {
    var active = link.href.replace(/\.html$/, '') === current ? ' style="font-weight:bold;text-decoration:none;"' : '';
    // Trailing space: without it the links run together as one unbreakable
    // "word", and the nav can't wrap onto a second line on a phone
    html += '<a href="' + link.href + '"' + active + '>' + link.label + '</a> ';
  });
  html += '</nav>';

  var el = document.getElementById('nav');
  if (el) el.innerHTML = html;
}());
