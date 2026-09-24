// goalies.html — every goalie to play for NYI since 2010-11, as a band-membership
// style timeline: one row per goalie, one column per month with games, and the
// bar is thicker the more games that goalie played that month. The chart
// layout itself (columns, axis, names, tooltip) is in timeline.js.
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

var GH_PX_PER_GAME   = 1.4;  // bar thickness per game (14 games, the most so far, ≈ 20px)
var GH_MINOR_GAMES   = 10;   // "Hide minor goalies": never played this many in one season

// League-average save % for each regular season: every NHL goalie's saves ÷
// shots faced (from api.nhle.com/stats/rest/en/goalie/summary). Add a line when
// a season ends; until then the newest season borrows the latest number here.
var GH_LEAGUE_SV = {
  '20102011': 0.9129, '20112012': 0.9135, '20122013': 0.9119, '20132014': 0.9138,
  '20142015': 0.9146, '20152016': 0.9149, '20162017': 0.9135, '20172018': 0.9122,
  '20182019': 0.9099, '20192020': 0.9096, '20202021': 0.9079, '20212022': 0.9070,
  '20222023': 0.9044, '20232024': 0.9035, '20242025': 0.9001, '20252026': 0.8958,
};

// "Color by save %": a month's save % minus that season's league average picks
// one of these, best first. The cut-offs put about a third of all NYI games
// since 2010 in "average" and roughly 15% in each of great and rough.
// Great and good are gradients defined in ghRenderDefs().
var GH_TIERS = [
  { name: 'great',      min:  0.025,    fill: 'url(#gh-great)', key: '+.025 or better' },
  { name: 'good',       min:  0.010,    fill: 'url(#gh-good)',  key: '+.010 to +.025' },
  { name: 'average',    min: -0.010,    fill: '#D8D8D8',        key: 'within .010' },
  { name: 'below avg.', min: -0.025,    fill: '#8A8A8A',        key: '−.010 to −.025' },
  { name: 'rough',      min: -Infinity, fill: '#5E5E5E',        key: '−.025 or worse' },
];
var GH_SHUTOUT_COLOR = '#FFD700';   // same gold as shutouts elsewhere on the site

// playerId -> { first, last, lastDate, seasons: { '20252026': games },
//               months: { 'YYYY-MM': { reg, po, shots, ga, toi, w, l, otl, so } } }
// (toi in seconds; w/l/otl only count games where this goalie got the decision)
var _ghGoalies = {};
// 'YYYY-MM' -> season id ('20252026') for every month that had an NYI game
var _ghMonthSeason = {};

// One season's goalies and their NYI games, regular season and playoffs.
// Resolves to [{ goalie, type, games }, ...]
function ghFetchSeason(season) {
  return Promise.all([2, 3].map(function (type) {
    return tlFetchJson('/v1/club-stats/NYI/' + season + '/' + type).then(function (d) {
      return Promise.all((d.goalies || []).map(function (g) {
        return tlFetchJson('/v1/player/' + g.playerId + '/game-log/' + season + '/' + type)
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
      if (!entry.months[month]) {
        entry.months[month] = { reg: 0, po: 0, shots: 0, ga: 0, toi: 0, w: 0, l: 0, otl: 0, so: 0 };
      }
      var c = entry.months[month];
      if (res.type === 3) c.po++;
      else                c.reg++;
      c.shots += game.shotsAgainst || 0;
      c.ga    += game.goalsAgainst || 0;
      c.toi   += ghToiSeconds(game.toi);
      c.so    += game.shutouts || 0;
      if (game.decision === 'W') c.w++;
      if (game.decision === 'L') c.l++;
      if (game.decision === 'O') c.otl++;
      if (game.gameDate > entry.lastDate) entry.lastDate = game.gameDate;
      entry.seasons[season] = (entry.seasons[season] || 0) + 1;
      _ghMonthSeason[month] = season;
    });
  });
}

// '56:57' -> 3417
function ghToiSeconds(toi) {
  if (!toi) return 0;
  var parts = toi.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function ghLeagueSv(season) {
  if (GH_LEAGUE_SV[season]) return GH_LEAGUE_SV[season];
  var seasons = Object.keys(GH_LEAGUE_SV).sort();
  return GH_LEAGUE_SV[seasons[seasons.length - 1]];
}

// Save % minus the league average that season (null if no shots faced — a
// short relief appearance can have none)
function ghSvDiff(c, season) {
  if (!c.shots) return null;
  return (c.shots - c.ga) / c.shots - ghLeagueSv(season);
}

function ghTier(diff) {
  if (diff === null) return GH_TIERS[2];   // no shots: call it average
  for (var i = 0; i < GH_TIERS.length; i++) {
    if (diff >= GH_TIERS[i].min) return GH_TIERS[i];
  }
}

// +.018 / −.004 (a real minus sign, like the key)
function ghFormatDiff(diff) {
  var rounded = Math.round(diff * 1000) / 1000;   // so -0.0003 shows as +.000, not −.000
  return (rounded < 0 ? '−' : '+') + formatSVP(Math.abs(rounded));
}

// The tooltip's stat line: "8-3-1 · .921 SV% · 2.31 GAA · 1 SO"
function ghStatLine(c) {
  var parts = [];
  if (c.w + c.l + c.otl > 0) parts.push(c.w + '-' + c.l + '-' + c.otl);
  if (c.shots) parts.push(formatSVP((c.shots - c.ga) / c.shots) + ' SV%');
  if (c.toi)   parts.push(formatGAA(c.ga * 3600 / c.toi) + ' GAA');
  if (c.so)    parts.push(c.so + ' SO');
  return parts.join(' · ');
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

function ghRender() {
  var goalies = ghSortedGoalies();
  if (goalies.length === 0) return;

  // Hidden goalies' months stay, so the time axis doesn't change when toggling
  if (document.getElementById('gh-hide-minor').checked) {
    var newestSeason = _ghMonthSeason[Object.keys(_ghMonthSeason).sort().reverse()[0]];
    goalies = goalies.filter(function (g) { return !ghIsMinor(g, newestSeason); });
  }

  var colorBySave = document.getElementById('gh-color').value === 'save';

  tlRender({
    graphId: 'gh-graph',
    namesId: 'gh-names',
    players: goalies,
    monthSeason: _ghMonthSeason,
    // Each month is drawn on its own, but neighbouring months touch, so a run
    // of months reads as one bar whose thickness steps up and down.
    drawRow: function (g, row, colX) {
      var out  = [];
      var cy   = row * TL_ROW_H + TL_ROW_H / 2;
      for (var m in g.months) {
        var c     = g.months[m];
        var games = c.reg + c.po;
        var h     = games * GH_PX_PER_GAME;
        var diff  = ghSvDiff(c, _ghMonthSeason[m]);
        var fill  = colorBySave ? ghTier(diff).fill : 'white';
        out.push('<rect x="' + colX[m] + '" y="' + (cy - h / 2) + '" width="' + TL_COL_W +
          '" height="' + h + '" fill="' + fill + '"/>');
        // Shutout month: a small gold mark along the top of the row
        if (colorBySave && c.so) {
          out.push('<rect x="' + (colX[m] + 3) + '" y="' + (row * TL_ROW_H) + '" width="' + (TL_COL_W - 6) +
            '" height="2" fill="' + GH_SHUTOUT_COLOR + '"/>');
        }
        var gamesText = games + (games === 1 ? ' game' : ' games') +
          (c.po ? ' (' + c.po + ' playoff)' : '');
        var vsText = diff === null ? '' :
          ghFormatDiff(diff) + ' vs. league (' + formatSVP(ghLeagueSv(_ghMonthSeason[m])) + ')';
        out.push(tlHoverTarget(colX[m], row,
          [g.first + ' ' + g.last, tlMonthName(m), gamesText, ghStatLine(c), vsText]));
      }
      return out;
    },
  });
}

// The great/good gradients: Islanders blue at the top of the bar fading to
// orange at the bottom; good is the same pair halfway to average's light gray.
// Kept in a hidden SVG of their own so both the graph and the key can use them.
function ghRenderDefs() {
  function gradient(id, top, bottom) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + top + '"/>' +
      '<stop offset="1" stop-color="' + bottom + '"/></linearGradient>';
  }
  document.getElementById('gh-defs').innerHTML =
    '<svg width="0" height="0" style="position:absolute;"><defs>' +
    gradient('gh-great', '#2F6FD6', '#F47D30') +
    gradient('gh-good',  '#84A4D7', '#E6AA84') +
    '</defs></svg>';
}

// Key under the graph: what a few thicknesses mean, and (when coloring by
// save %) what each color means
function ghRenderKey() {
  function swatch(h, fill) {
    return '<svg width="' + TL_COL_W * 3 + '" height="' + TL_ROW_H + '" style="vertical-align:middle;">' +
      '<rect x="0" y="' + (TL_ROW_H - h) / 2 + '" width="' + TL_COL_W * 3 + '" height="' + h +
      '" fill="' + fill + '"/></svg>';
  }

  var html = '<div>Games in a month: ';
  [1, 5, 10, 14].forEach(function (n) {
    html += swatch(n * GH_PX_PER_GAME, 'white') + ' ' + n + '&nbsp;&nbsp; ';
  });
  html += '</div>';

  if (document.getElementById('gh-color').value === 'save') {
    html += '<div>Save % vs. league average that season: ';
    GH_TIERS.forEach(function (t) {
      html += '<span style="white-space:nowrap;">' + swatch(12, t.fill) + ' ' + t.name +
        ' <span style="color:#666;">(' + t.key + ')</span></span>&nbsp;&nbsp; ';
    });
    html += '<span style="white-space:nowrap;">' +
      '<svg width="' + TL_COL_W * 3 + '" height="' + TL_ROW_H + '" style="vertical-align:middle;">' +
      '<rect x="11" y="10" width="8" height="2" fill="' + GH_SHUTOUT_COLOR + '"/></svg> shutout</span>';
    html += '</div>';
  }
  document.getElementById('gh-key').innerHTML = html;
}

async function ghLoadAll() {
  var status  = document.getElementById('gh-status');
  var seasons = tlSeasonList();
  var failed  = [];

  for (var i = 0; i < seasons.length; i++) {
    status.textContent = 'Loading ' + tlSeasonLabel(seasons[i], true) + '…';
    try {
      var results = await ghFetchSeason(seasons[i]);
      ghAddSeason(seasons[i], results);
      ghRender();
    } catch (err) {
      console.error('Goalie history: ' + seasons[i] + ' failed', err);
      failed.push(tlSeasonLabel(seasons[i], true));
    }
  }

  var count = ghSortedGoalies().length;
  if (count === 0) {
    status.textContent = 'Couldn\'t load any goalie data. Try reloading.';
    return;
  }
  var withGames = Object.keys(_ghMonthSeason).map(function (m) { return _ghMonthSeason[m]; }).sort();
  status.textContent = count + ' goalies, ' +
    tlSeasonLabel(withGames[0], true) + ' to ' + tlSeasonLabel(withGames[withGames.length - 1], true) + '.' +
    (failed.length ? ' Couldn\'t load ' + failed.join(', ') + ' — reload to try again.' : '');
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('gh-hide-minor').addEventListener('change', ghRender);
  document.getElementById('gh-color').addEventListener('change', function () {
    ghRenderKey();
    ghRender();
  });
  ghRenderDefs();
  ghRenderKey();
  tlSetupTooltip('gh-graph', 'gh-tt', ['gh-tt-name', 'gh-tt-month', 'gh-tt-games', 'gh-tt-stats', 'gh-tt-vs']);
  ghLoadAll();
});
