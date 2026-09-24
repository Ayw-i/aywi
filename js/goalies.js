// goalies.html — every goalie to play for NYI since 2010-11, as a band-membership
// style timeline: one row per goalie, one column per month with games, and the
// bar is thicker the more games that goalie played that month.
//
// Data: for each season, club-stats lists the goalies who appeared for NYI
// (regular season = type 2, playoffs = type 3), then each goalie's game log
// gives the dates. Preseason (type 1) is never fetched. A game where the
// starter got pulled shows up in both goalies' logs, so it counts for both.
//
// Loading goes one season at a time, newest first, and redraws after each.
// Because rows are ordered by most recent game and columns newest-left, an
// older season only ever adds columns on the right and rows at the bottom —
// nothing already drawn moves. It also keeps the NHL API from seeing more than
// one season's handful of calls at once.

var GH_ROW_H         = 22;   // height of one goalie's row
var GH_PX_PER_GAME   = 1.4;  // bar thickness per game (14 games, the most so far, ≈ 20px)
var GH_COL_W         = 10;   // width of one month
var GH_SEASON_GAP    = 5;    // blank space between seasons
var GH_AXIS_H        = 34;   // month letters + season labels under the bars
var GH_FIRST_SEASON  = 2010; // the NHL API's data starts with 2010-11
var GH_MINOR_GAMES   = 10;   // "Hide minor goalies": never played this many in one season

var GH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                 'August', 'September', 'October', 'November', 'December'];

// playerId -> { first, last, lastDate, months: { 'YYYY-MM': { reg, po } },
//               seasons: { '20252026': games } }
var _ghGoalies = {};
// 'YYYY-MM' -> season id ('20252026') for every month that had an NYI game
var _ghMonthSeason = {};

function ghFetchJson(path) {
  return fetch(WORKER + path).then(function (r) {
    if (!r.ok) throw new Error(path + ' → ' + r.status);
    return r.json();
  });
}

// 20252026 -> '25–26' (axis), or '2025–26' with long = true (status line)
function ghSeasonLabel(season, long) {
  return season.slice(long ? 0 : 2, 4) + '–' + season.slice(6, 8);
}

// Same September rollover as getSelectedSeason(), newest season first
function ghSeasonList() {
  var now = new Date();
  var currentStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  var list = [];
  for (var y = currentStart; y >= GH_FIRST_SEASON; y--) list.push(y + '' + (y + 1));
  return list;
}

// One season's goalies and their NYI games, regular season and playoffs.
// Resolves to [{ goalie, type, games }, ...]
function ghFetchSeason(season) {
  return Promise.all([2, 3].map(function (type) {
    return ghFetchJson('/v1/club-stats/NYI/' + season + '/' + type).then(function (d) {
      return Promise.all((d.goalies || []).map(function (g) {
        return ghFetchJson('/v1/player/' + g.playerId + '/game-log/' + season + '/' + type)
          .then(function (log) {
            return { goalie: g, type: type, games: log.gameLog || [] };
          });
      }));
    });
  })).then(function (byType) {
    return byType[0].concat(byType[1]);
  });
}

function ghAddSeason(season, results) {
  results.forEach(function (res) {
    var g = res.goalie;
    var entry = _ghGoalies[g.playerId];
    if (!entry) {
      entry = _ghGoalies[g.playerId] = {
        first: g.firstName.default,
        last:  g.lastName.default,
        lastDate: '',
        months: {},
        seasons: {},
      };
    }
    res.games.forEach(function (game) {
      // A goalie traded mid-season has their other team's games in the same log
      if (game.teamAbbrev !== 'NYI') return;
      var month = game.gameDate.slice(0, 7);
      if (!entry.months[month]) entry.months[month] = { reg: 0, po: 0 };
      if (res.type === 3) entry.months[month].po++;
      else                entry.months[month].reg++;
      if (game.gameDate > entry.lastDate) entry.lastDate = game.gameDate;
      entry.seasons[season] = (entry.seasons[season] || 0) + 1;
      _ghMonthSeason[month] = season;
    });
  });
}

// Goalies with at least one NYI game, most recent game first
function ghSortedGoalies() {
  var list = [];
  for (var id in _ghGoalies) {
    if (_ghGoalies[id].lastDate) list.push(_ghGoalies[id]);
  }
  list.sort(function (a, b) {
    if (a.lastDate !== b.lastDate) return a.lastDate < b.lastDate ? 1 : -1;
    return a.last < b.last ? -1 : 1;
  });
  return list;
}

// Third-stringers and call-ups: never played GH_MINOR_GAMES games for NYI in
// one season (regular season + playoffs). Anyone who played in the newest
// season is never minor, so a new backup isn't hidden every October until
// they reach 10 games.
function ghIsMinor(g, newestSeason) {
  if (g.seasons[newestSeason]) return false;
  for (var s in g.seasons) {
    if (g.seasons[s] >= GH_MINOR_GAMES) return false;
  }
  return true;
}

// Last names on the axis; first initial too when two goalies share one
function ghLabels(goalies) {
  var count = {};
  goalies.forEach(function (g) { count[g.last] = (count[g.last] || 0) + 1; });
  return goalies.map(function (g) {
    return count[g.last] > 1 ? g.first.charAt(0) + '. ' + g.last : g.last;
  });
}

function ghRender() {
  var goalies = ghSortedGoalies();
  if (goalies.length === 0) return;

  // Columns: months with games, newest on the left, a gap between seasons.
  // Hidden goalies' months stay, so the time axis doesn't change when toggling.
  var months = Object.keys(_ghMonthSeason).sort().reverse();

  if (document.getElementById('gh-hide-minor').checked) {
    var newestSeason = _ghMonthSeason[months[0]];
    goalies = goalies.filter(function (g) { return !ghIsMinor(g, newestSeason); });
  }
  var colX = {};
  var seasons = [];   // [{ season, x1, x2 }] for the season labels and dividers
  var x = 0;
  months.forEach(function (m, i) {
    var season = _ghMonthSeason[m];
    if (i > 0 && season !== _ghMonthSeason[months[i - 1]]) x += GH_SEASON_GAP;
    colX[m] = x;
    if (!seasons.length || seasons[seasons.length - 1].season !== season) {
      seasons.push({ season: season, x1: x, x2: x + GH_COL_W });
    } else {
      seasons[seasons.length - 1].x2 = x + GH_COL_W;
    }
    x += GH_COL_W;
  });

  var width  = x;
  var barsH  = goalies.length * GH_ROW_H;
  var height = barsH + GH_AXIS_H;
  var svg = ['<svg width="' + width + '" height="' + height + '" style="display:block;">'];

  // Faint row guides, then season dividers down the middle of each gap
  goalies.forEach(function (g, row) {
    var cy = row * GH_ROW_H + GH_ROW_H / 2;
    svg.push('<line x1="0" x2="' + width + '" y1="' + cy + '" y2="' + cy + '" stroke="#222"/>');
  });
  seasons.forEach(function (s, i) {
    if (i === 0) return;
    var dx = s.x1 - GH_SEASON_GAP / 2;
    svg.push('<line x1="' + dx + '" x2="' + dx + '" y1="0" y2="' + barsH + '" stroke="#333"/>');
  });

  // Bars. Each month is drawn on its own, but neighbouring months touch, so a
  // run of months reads as one bar whose thickness steps up and down.
  goalies.forEach(function (g, row) {
    var cy   = row * GH_ROW_H + GH_ROW_H / 2;
    var name = g.first + ' ' + g.last;
    for (var m in g.months) {
      var c     = g.months[m];
      var games = c.reg + c.po;
      var h     = games * GH_PX_PER_GAME;
      svg.push('<rect x="' + colX[m] + '" y="' + (cy - h / 2) + '" width="' + GH_COL_W +
        '" height="' + h + '" fill="white"/>');
      // Invisible hover target covering the whole row height, so 1-game
      // slivers are still easy to hit
      var monthName = GH_MONTHS[parseInt(m.slice(5, 7), 10) - 1] + ' ' + m.slice(0, 4);
      var gamesText = games + (games === 1 ? ' game' : ' games') +
        (c.po ? ' (' + c.po + ' playoff)' : '');
      svg.push('<rect x="' + colX[m] + '" y="' + (row * GH_ROW_H) + '" width="' + GH_COL_W +
        '" height="' + GH_ROW_H + '" fill="none" pointer-events="all" data-tip="' +
        name + '|' + monthName + '|' + gamesText + '"/>');
    }
  });

  // Axis: first letter of each month, season label centred under its months
  months.forEach(function (m) {
    var letter = GH_MONTHS[parseInt(m.slice(5, 7), 10) - 1].charAt(0);
    svg.push('<text x="' + (colX[m] + GH_COL_W / 2) + '" y="' + (barsH + 12) +
      '" fill="#666" font-size="8" text-anchor="middle">' + letter + '</text>');
  });
  seasons.forEach(function (s) {
    svg.push('<text x="' + ((s.x1 + s.x2) / 2) + '" y="' + (barsH + 28) +
      '" fill="#aaa" font-size="10" text-anchor="middle">' + ghSeasonLabel(s.season) + '</text>');
  });

  svg.push('</svg>');
  document.getElementById('gh-graph').innerHTML = svg.join('');

  // Names column, one row per goalie, lined up with the bars
  var labels = ghLabels(goalies);
  document.getElementById('gh-names').innerHTML = goalies.map(function (g, i) {
    return '<div class="gh-name" title="' + g.first + ' ' + g.last + '">' + labels[i] + '</div>';
  }).join('');
}

// Key under the graph: what a few thicknesses mean
function ghRenderKey() {
  var samples = [1, 5, 10, 14];
  var html = 'Games in a month: ';
  samples.forEach(function (n) {
    var h = n * GH_PX_PER_GAME;
    html += '<svg width="' + GH_COL_W * 3 + '" height="' + GH_ROW_H + '" style="vertical-align:middle;">' +
      '<rect x="0" y="' + (GH_ROW_H - h) / 2 + '" width="' + GH_COL_W * 3 + '" height="' + h + '" fill="white"/>' +
      '</svg> ' + n + '&nbsp;&nbsp; ';
  });
  document.getElementById('gh-key').innerHTML = html;
}

function ghSetupTooltip() {
  var tt = makeGameTooltip('gh-tt', function () { return null; });
  var graph = document.getElementById('gh-graph');

  function show(e) {
    var tip = e.target.getAttribute && e.target.getAttribute('data-tip');
    if (!tip) { tt.hide(); return; }
    var parts = tip.split('|');
    document.getElementById('gh-tt-name').textContent  = parts[0];
    document.getElementById('gh-tt-month').textContent = parts[1];
    document.getElementById('gh-tt-games').textContent = parts[2];
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

async function ghLoadAll() {
  var status  = document.getElementById('gh-status');
  var seasons = ghSeasonList();
  var failed  = [];

  for (var i = 0; i < seasons.length; i++) {
    status.textContent = 'Loading ' + ghSeasonLabel(seasons[i], true) + '…';
    try {
      var results = await ghFetchSeason(seasons[i]);
      ghAddSeason(seasons[i], results);
      ghRender();
    } catch (err) {
      console.error('Goalie history: ' + seasons[i] + ' failed', err);
      failed.push(ghSeasonLabel(seasons[i], true));
    }
  }

  var count = ghSortedGoalies().length;
  if (count === 0) {
    status.textContent = 'Couldn\'t load any goalie data. Try reloading.';
    return;
  }
  var withGames = Object.keys(_ghMonthSeason).map(function (m) { return _ghMonthSeason[m]; }).sort();
  status.textContent = count + ' goalies, ' +
    ghSeasonLabel(withGames[0], true) + ' to ' + ghSeasonLabel(withGames[withGames.length - 1], true) + '.' +
    (failed.length ? ' Couldn\'t load ' + failed.join(', ') + ' — reload to try again.' : '');
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('gh-hide-minor').addEventListener('change', ghRender);
  ghRenderKey();
  ghSetupTooltip();
  ghLoadAll();
});
