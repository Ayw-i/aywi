// timeline.js — the shared parts of the "Hall of Isles" timeline pages
// (goalies.html, goals.html). Each is a band-membership style chart: one row
// per player, one column per month that had NYI games (newest on the left,
// off-season months skipped, a small gap between seasons), and a bar in each
// month the player played. What the bar looks like is up to each page — it
// passes a drawRow function to tlRender().
//
// Needs nhl-schedule.js (WORKER) and tooltip.js (makeGameTooltip).

var TL_ROW_H        = 22;   // height of one player's row (the .tl-name CSS matches)
var TL_COL_W        = 10;   // width of one month
var TL_SEASON_GAP   = 5;    // blank space between seasons
var TL_AXIS_H       = 34;   // month letters + season labels under the bars
var TL_FIRST_SEASON = 2010; // the NHL API's data starts with 2010-11

var TL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                 'August', 'September', 'October', 'November', 'December'];

function tlFetchJson(path) {
  return fetch(WORKER + path).then(function (r) {
    if (!r.ok) throw new Error(path + ' → ' + r.status);
    return r.json();
  });
}

// 20252026 -> '25–26' (axis), or '2025–26' with long = true (status lines)
function tlSeasonLabel(season, long) {
  return season.slice(long ? 0 : 2, 4) + '–' + season.slice(6, 8);
}

// Same September rollover as getSelectedSeason(), newest season first
function tlSeasonList() {
  var now = new Date();
  var currentStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  var list = [];
  for (var y = currentStart; y >= TL_FIRST_SEASON; y--) list.push(y + '' + (y + 1));
  return list;
}

// '2026-03' -> 'March 2026'
function tlMonthName(month) {
  return TL_MONTHS[parseInt(month.slice(5, 7), 10) - 1] + ' ' + month.slice(0, 4);
}

// Last names on the axis; first initial too when two players share one.
// players: [{ first, last }]
function tlLabels(players) {
  var count = {};
  players.forEach(function (p) { count[p.last] = (count[p.last] || 0) + 1; });
  return players.map(function (p) {
    return count[p.last] > 1 ? p.first.charAt(0) + '. ' + p.last : p.last;
  });
}

// Draws the whole timeline.
//   graphId, namesId — the graph's scroll box contents and the names column
//   players          — rows, top to bottom, each at least { first, last }
//   monthSeason      — { 'YYYY-MM': '20252026' } for every month with NYI games
//   drawRow(player, row, colX) — returns SVG strings for that player's bars;
//                      colX['YYYY-MM'] is the month's left edge, and the row's
//                      middle is row * TL_ROW_H + TL_ROW_H / 2
//   rename(text)     — optional: rewrites the names column's names (the short
//                      label and the full name shown on hover)
function tlRender(opts) {
  var players = opts.players;
  var rename  = opts.rename || function (text) { return text; };

  // Columns: months with games, newest on the left, a gap between seasons
  var months = Object.keys(opts.monthSeason).sort().reverse();
  var colX = {};
  var seasons = [];   // [{ season, x1, x2 }] for the season labels and dividers
  var x = 0;
  months.forEach(function (m, i) {
    var season = opts.monthSeason[m];
    if (i > 0 && season !== opts.monthSeason[months[i - 1]]) x += TL_SEASON_GAP;
    colX[m] = x;
    if (!seasons.length || seasons[seasons.length - 1].season !== season) {
      seasons.push({ season: season, x1: x, x2: x + TL_COL_W });
    } else {
      seasons[seasons.length - 1].x2 = x + TL_COL_W;
    }
    x += TL_COL_W;
  });

  var width  = x;
  var barsH  = players.length * TL_ROW_H;
  var height = barsH + TL_AXIS_H;
  var svg = ['<svg width="' + width + '" height="' + height + '" style="display:block;">'];

  // Faint row guides, then season dividers down the middle of each gap
  players.forEach(function (p, row) {
    var cy = row * TL_ROW_H + TL_ROW_H / 2;
    svg.push('<line x1="0" x2="' + width + '" y1="' + cy + '" y2="' + cy + '" stroke="#222"/>');
  });
  seasons.forEach(function (s, i) {
    if (i === 0) return;
    var dx = s.x1 - TL_SEASON_GAP / 2;
    svg.push('<line x1="' + dx + '" x2="' + dx + '" y1="0" y2="' + barsH + '" stroke="#333"/>');
  });

  players.forEach(function (p, row) {
    svg = svg.concat(opts.drawRow(p, row, colX));
  });

  // Axis: first letter of each month, season label centred under its months
  months.forEach(function (m) {
    var letter = TL_MONTHS[parseInt(m.slice(5, 7), 10) - 1].charAt(0);
    svg.push('<text x="' + (colX[m] + TL_COL_W / 2) + '" y="' + (barsH + 12) +
      '" fill="#666" font-size="8" text-anchor="middle">' + letter + '</text>');
  });
  seasons.forEach(function (s) {
    svg.push('<text x="' + ((s.x1 + s.x2) / 2) + '" y="' + (barsH + 28) +
      '" fill="#aaa" font-size="10" text-anchor="middle">' + tlSeasonLabel(s.season) + '</text>');
  });

  svg.push('</svg>');
  document.getElementById(opts.graphId).innerHTML = svg.join('');

  // Names column, one row per player, lined up with the bars
  var labels = tlLabels(players);
  document.getElementById(opts.namesId).innerHTML = players.map(function (p, i) {
    return '<div class="tl-name" title="' + rename(p.first + ' ' + p.last) + '">' + rename(labels[i]) + '</div>';
  }).join('');
}

// An invisible hover target covering a month's whole row height, so thin bars
// are still easy to hit. lines become the tooltip's lines, in order.
function tlHoverTarget(colX, row, lines) {
  return '<rect x="' + colX + '" y="' + (row * TL_ROW_H) + '" width="' + TL_COL_W +
    '" height="' + TL_ROW_H + '" fill="none" pointer-events="all" data-tip="' +
    lines.join('|') + '"/>';
}

// Hover (or tap, on phones) a month to fill the tooltip. lineIds are the
// tooltip's line elements, filled in the same order as tlHoverTarget's lines.
function tlSetupTooltip(graphId, tooltipId, lineIds) {
  var tt = makeGameTooltip(tooltipId, function () { return null; });
  var graph = document.getElementById(graphId);

  function show(e) {
    var tip = e.target.getAttribute && e.target.getAttribute('data-tip');
    if (!tip) { tt.hide(); return; }
    var parts = tip.split('|');
    lineIds.forEach(function (id, i) {
      document.getElementById(id).textContent = parts[i] || '';
    });
    tt.move(e);
  }

  graph.addEventListener('mousemove', show);
  graph.addEventListener('mouseleave', tt.hide);
  // Phones have no hover: a tap shows the tooltip, a tap anywhere else hides it
  graph.addEventListener('click', show);
  document.addEventListener('click', function (e) {
    if (!graph.contains(e.target)) tt.hide();
  });
}
