// goals.html — "Hall of Isles Goals": the Islanders' goal scorers since 2010-11
// on the same timeline as the goalie page (layout in timeline.js). One row per
// player: a thin line for every month they played for NYI, thickened by the
// goals they scored that month (regular season + playoffs; no preseason).
//
// Who's in (forwards and defensemen alike): 50+ goals for NYI in total, or a
// 10-goal regular season in one of the two most recent seasons with games, so
// new scorers show up without waiting years to reach 50. "In total" only counts
// from 2010-11, where the NHL API's data starts.
//
// Loading happens in two steps:
//  1. Every season's club-stats (32 small calls, a few seasons at a time). They
//     have each player's season goal totals — enough to settle who's in and
//     fix the row order before any bar is drawn, so rows never move.
//  2. The qualifying players' game logs, one season at a time, newest first,
//     redrawing after each. About 270 calls in all, but never more than one
//     season's worth (~15-25) at once.

var HG_PX_PER_GOAL     = 1.6;  // bar thickness per goal (the most in a month so far: see the key)
var HG_CAREER_GOALS    = 50;   // in with this many NYI goals in total...
var HG_RECENT_GOALS    = 10;   // ...or this many in one recent regular season
var HG_RECENT_SEASONS  = 2;    // how many of the latest seasons count as recent
var HG_ROSTER_BATCH    = 4;    // seasons of club-stats fetched at once in step 1
var HG_PLAYED_COLOR    = '#888'; // the thin line for months played without a goal

// playerId -> { id, first, last, total,
//               seasons: { '20252026': { reg, po, regGoals } },   (reg/po = games played)
//               months:  { 'YYYY-MM': { games, po, g, a } } }
var _hgPlayers = {};
// 'YYYY-MM' -> season id for every month a qualifying player played in
var _hgMonthSeason = {};
var _hgQualified = [];   // the rows, top to bottom, once step 1 is done

// --- Step 1: season totals ---

function hgAddSeasonTotals(season, type, skaters) {
  skaters.forEach(function (p) {
    var entry = _hgPlayers[p.playerId];
    if (!entry) {
      entry = _hgPlayers[p.playerId] = {
        id: p.playerId,
        first: p.firstName.default,
        last:  p.lastName.default,
        total: 0,
        seasons: {},
        months: {},
      };
    }
    var s = entry.seasons[season] || (entry.seasons[season] = { reg: 0, po: 0, regGoals: 0 });
    if (type === 3) {
      s.po = p.gamesPlayed;
    } else {
      s.reg = p.gamesPlayed;
      s.regGoals = p.goals;
    }
    entry.total += p.goals;
  });
}

async function hgLoadSeasonTotals(seasons, failed) {
  for (var i = 0; i < seasons.length; i += HG_ROSTER_BATCH) {
    var batch = seasons.slice(i, i + HG_ROSTER_BATCH);
    await Promise.all(batch.map(function (season) {
      return Promise.all([2, 3].map(function (type) {
        return tlFetchJson('/v1/club-stats/NYI/' + season + '/' + type).then(function (d) {
          hgAddSeasonTotals(season, type, d.skaters || []);
        });
      })).catch(function (err) {
        console.error('Hall of goals: ' + season + ' totals failed', err);
        failed.push(tlSeasonLabel(season, true));
      });
    }));
  }
}

// Who gets a row, most recent first: by the last season they played for NYI,
// then by NYI goals
function hgPickPlayers(seasons) {
  var recent = seasons.filter(function (season) {
    for (var id in _hgPlayers) {
      if ((_hgPlayers[id].seasons[season] || {}).reg) return true;
    }
    return false;
  }).slice(0, HG_RECENT_SEASONS);

  var list = [];
  for (var id in _hgPlayers) {
    var p = _hgPlayers[id];
    var recentBig = recent.some(function (season) {
      return (p.seasons[season] || {}).regGoals >= HG_RECENT_GOALS;
    });
    if (p.total >= HG_CAREER_GOALS || recentBig) {
      p.lastSeason = Object.keys(p.seasons).sort().pop();
      list.push(p);
    }
  }
  list.sort(function (a, b) {
    if (a.lastSeason !== b.lastSeason) return a.lastSeason < b.lastSeason ? 1 : -1;
    if (a.total !== b.total) return b.total - a.total;
    return a.last < b.last ? -1 : 1;
  });
  return list;
}

// --- Step 2: game logs ---

function hgLoadSeasonGames(season) {
  var jobs = [];
  _hgQualified.forEach(function (p) {
    var s = p.seasons[season];
    if (!s) return;
    [[2, s.reg], [3, s.po]].forEach(function (pair) {
      var type = pair[0], gamesPlayed = pair[1];
      if (!gamesPlayed) return;
      jobs.push(tlFetchJson('/v1/player/' + p.id + '/game-log/' + season + '/' + type)
        .then(function (log) { hgAddGames(p, season, type, log.gameLog || []); }));
    });
  });
  return Promise.all(jobs);
}

function hgAddGames(p, season, type, games) {
  games.forEach(function (game) {
    // A player traded mid-season has their other team's games in the same log
    if (game.teamAbbrev !== 'NYI') return;
    var month = game.gameDate.slice(0, 7);
    var c = p.months[month] || (p.months[month] = { games: 0, po: 0, g: 0, a: 0 });
    c.games++;
    if (type === 3) c.po++;
    c.g += game.goals || 0;
    c.a += game.assists || 0;
    _hgMonthSeason[month] = season;
  });
}

// --- Drawing ---

// This page's Tavares filter (the others have jafares()): his full name —
// "John Tavares", or "J. Tavares" if a second Tavares ever shows up — becomes
// "2009 NHL Entry Draft, 1st Overall Pick" (NYI took him 1st overall), and a
// bare "Tavares" (the names column) becomes "2009 1OA".
function hgFirstOverall(text) {
  return text
    .replace(/J(?:ohn)?\.?\s+Tavares/gi, '2009 NHL Entry Draft, 1st Overall Pick')
    .replace(/Tavares/gi, '2009 1OA');
}

function hgRender() {
  tlRender({
    graphId: 'hg-graph',
    namesId: 'hg-names',
    players: _hgQualified,
    monthSeason: _hgMonthSeason,
    rename: hgFirstOverall,
    drawRow: function (p, row, colX) {
      var out = [];
      var cy  = row * TL_ROW_H + TL_ROW_H / 2;
      for (var m in p.months) {
        var c = p.months[m];
        // Thin line for every month played, so the whole tenure shows...
        out.push('<rect x="' + colX[m] + '" y="' + (cy - 0.5) + '" width="' + TL_COL_W +
          '" height="1" fill="' + HG_PLAYED_COLOR + '"/>');
        // ...and a white bar on top, as thick as the month's goals
        if (c.g) {
          var h = c.g * HG_PX_PER_GOAL;
          out.push('<rect x="' + colX[m] + '" y="' + (cy - h / 2) + '" width="' + TL_COL_W +
            '" height="' + h + '" fill="white"/>');
        }
        var gamesText = c.games + (c.games === 1 ? ' game' : ' games') +
          (c.po ? ' (' + c.po + ' playoff)' : '');
        var statText = c.g + ' G · ' + c.a + ' A · ' + (c.g + c.a) + ' PTS';
        out.push(tlHoverTarget(colX[m], row,
          [hgFirstOverall(p.first + ' ' + p.last), tlMonthName(m), gamesText, statText]));
      }
      return out;
    },
  });
}

// Key under the graph: a few thicknesses, the played-no-goals line, and who's in
function hgRenderKey() {
  function swatch(inner) {
    return '<svg width="' + TL_COL_W * 3 + '" height="' + TL_ROW_H + '" style="vertical-align:middle;">' +
      inner + '</svg>';
  }
  var html = '<div>Goals in a month: ';
  [1, 3, 6, 10].forEach(function (n) {
    var h = n * HG_PX_PER_GOAL;
    html += swatch('<rect x="0" y="' + (TL_ROW_H - h) / 2 + '" width="' + TL_COL_W * 3 +
      '" height="' + h + '" fill="white"/>') + ' ' + n + '&nbsp;&nbsp; ';
  });
  html += '<span style="white-space:nowrap;">' +
    swatch('<rect x="0" y="' + (TL_ROW_H / 2 - 0.5) + '" width="' + TL_COL_W * 3 +
      '" height="1" fill="' + HG_PLAYED_COLOR + '"/>') + ' played, no goals</span></div>';
  html += '<div style="color:#666;margin-top:4px;">Everyone with ' + HG_CAREER_GOALS +
    '+ goals for the Isles since 2010&ndash;11, plus anyone with a ' + HG_RECENT_GOALS +
    '-goal season in the last two seasons.</div>';
  document.getElementById('hg-key').innerHTML = html;
}

async function hgLoadAll() {
  var status  = document.getElementById('hg-status');
  var seasons = tlSeasonList();
  var failed  = [];

  status.textContent = 'Loading rosters…';
  await hgLoadSeasonTotals(seasons, failed);
  _hgQualified = hgPickPlayers(seasons);
  if (_hgQualified.length === 0) {
    status.textContent = 'Couldn\'t load any player data. Try reloading.';
    return;
  }
  hgRender();   // names up front; bars fill in season by season

  for (var i = 0; i < seasons.length; i++) {
    status.textContent = 'Loading ' + tlSeasonLabel(seasons[i], true) + '…';
    try {
      await hgLoadSeasonGames(seasons[i]);
      hgRender();
    } catch (err) {
      console.error('Hall of goals: ' + seasons[i] + ' games failed', err);
      failed.push(tlSeasonLabel(seasons[i], true));
    }
  }

  // A season can fail in both steps; name it once
  failed = failed.filter(function (label, i) { return failed.indexOf(label) === i; });
  var withGames = Object.keys(_hgMonthSeason).map(function (m) { return _hgMonthSeason[m]; }).sort();
  status.textContent = _hgQualified.length + ' players' +
    (withGames.length ? ', ' + tlSeasonLabel(withGames[0], true) + ' to ' +
      tlSeasonLabel(withGames[withGames.length - 1], true) : '') + '.' +
    (failed.length ? ' Couldn\'t load ' + failed.join(', ') + ' — reload to try again.' : '');
}

document.addEventListener('DOMContentLoaded', function () {
  hgRenderKey();
  tlSetupTooltip('hg-graph', 'hg-tt', ['hg-tt-name', 'hg-tt-month', 'hg-tt-games', 'hg-tt-stats']);
  hgLoadAll();
});
