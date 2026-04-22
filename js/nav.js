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

  var current = window.location.pathname.split('/').pop() || 'index.html';

  var html = '<h1>Are Ya Winning, Isles?</h1><nav>';
  links.forEach(function (link) {
    var active = link.href === current ? ' style="font-weight:bold;text-decoration:none;"' : '';
    html += '<a href="' + link.href + '"' + active + '>' + link.label + '</a>';
  });
  html += '</nav>';

  var el = document.getElementById('nav');
  if (el) el.innerHTML = html;
}());
