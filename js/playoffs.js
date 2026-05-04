// Playoffs page — today's games + series bracket by conference and round.

function playoffsLogoURL(abbrev) {
  return 'https://assets.nhle.com/logos/nhl/svg/' + abbrev + '_light.svg';
}

function playoffsPeriodLabel(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (n === 4) return 'OT';
  return (n - 3) + 'OT';
}

function formatGameStartTime(utcStr) {
  if (!utcStr) return '';
  return new Date(utcStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
}

function seriesStatusText(topAbbrev, topWins, bottomAbbrev, bottomWins) {
  if (topWins === 4)    return topAbbrev    + ' wins 4–' + bottomWins;
  if (bottomWins === 4) return bottomAbbrev + ' wins 4–' + topWins;
  if (topWins === 0 && bottomWins === 0) return 'Series not yet begun';
  if (topWins > bottomWins)  return topAbbrev    + ' leads ' + topWins    + '–' + bottomWins;
  if (bottomWins > topWins)  return bottomAbbrev + ' leads ' + bottomWins + '–' + topWins;
  return 'Series tied ' + topWins + '–' + bottomWins;
}

// Replace any appearance of John Tavares with snake emoji
function jafares(name) {
  return name ? name.replace(/John Tavares/gi, Math.random() < 0.5 ? '🐍' : 'Jafares') : name;
}

// --- Reverse-sweep detection ---

var _bracketYear = null; // set by loadPlayoffsPage

// Hard-coded historical reverse sweeps (bracket API lacks per-game data for past seasons).
var HISTORICAL_REVERSE_SWEEPS = [
  { year: 2014, loser: 'SJS' }, // LAK came back from 0-3 vs SJS
];

// Returns the abbrev of the team that led 3-0 but is now tied 3-3 (reverse sweep watch), or null.
function detectReverseSweptWatch(series) {
  var games = series.computedGames;
  if (!games || games.length < 6) return null;
  var first3TopSweep = games[0].topWon && games[1].topWon && games[2].topWon;
  var first3BotSweep = !games[0].topWon && !games[1].topWon && !games[2].topWon;
  if (!first3TopSweep && !first3BotSweep) return null;
  var topWinsIn6 = games.slice(0, 6).filter(function (g) { return g.topWon; }).length;
  if (first3TopSweep && topWinsIn6 === 3) return (series.topSeedTeam    || {}).abbrev;
  if (first3BotSweep && topWinsIn6 === 3) return (series.bottomSeedTeam || {}).abbrev;
  return null;
}

// Returns the abbrev of the team that was gentleman's swept (led 3-0, lost game 4, won 4-1), or null.
// Requires the loser's only win to be specifically game 4 (went 3-0 → 3-1 → 4-1).
var HISTORICAL_GENT_SWEEPS = [
  // Add historical instances here as needed.
];

function detectGentlemanSwept(series) {
  var games = series.computedGames;
  if (!games || games.length < 5) {
    if (!_bracketYear) return null;
    var tAbbrev = (series.topSeedTeam    || {}).abbrev;
    var bAbbrev = (series.bottomSeedTeam || {}).abbrev;
    for (var i = 0; i < HISTORICAL_GENT_SWEEPS.length; i++) {
      var h = HISTORICAL_GENT_SWEEPS[i];
      if (h.year === _bracketYear && (h.loser === tAbbrev || h.loser === bAbbrev)) {
        return h.loser;
      }
    }
    return null;
  }
  if (games.length !== 5) return null;
  var topWins = games.filter(function(g) { return g.topWon; }).length;
  // Top lost 4-1, and their only win was game 4 (index 3)
  if (topWins === 1 && games[3].topWon)  return (series.topSeedTeam    || {}).abbrev;
  // Bottom lost 4-1, and their only win was game 4 (index 3)
  if (topWins === 4 && !games[3].topWon) return (series.bottomSeedTeam || {}).abbrev;
  return null;
}

// Returns the abbrev of the team that was backdoor swept (lost game 1, lost 4-1), or null.
// Pattern: L W W W W — the loser won only game 1.
var HISTORICAL_BACKDOOR_SWEEPS = [
  // Add historical instances here as needed.
];

function detectBackdoorSwept(series) {
  var games = series.computedGames;
  if (!games || games.length < 5) {
    if (!_bracketYear) return null;
    var tAbbrev = (series.topSeedTeam    || {}).abbrev;
    var bAbbrev = (series.bottomSeedTeam || {}).abbrev;
    for (var i = 0; i < HISTORICAL_BACKDOOR_SWEEPS.length; i++) {
      var h = HISTORICAL_BACKDOOR_SWEEPS[i];
      if (h.year === _bracketYear && (h.loser === tAbbrev || h.loser === bAbbrev)) {
        return h.loser;
      }
    }
    return null;
  }
  if (games.length !== 5) return null;
  var topWins = games.filter(function(g) { return g.topWon; }).length;
  // Top lost 4-1, and their only win was game 1 (index 0)
  if (topWins === 1 && games[0].topWon)  return (series.topSeedTeam    || {}).abbrev;
  // Bottom lost 4-1, and their only win was game 1 (index 0)
  if (topWins === 4 && !games[0].topWon) return (series.bottomSeedTeam || {}).abbrev;
  return null;
}

// Returns the abbrev of the team that led 3-1 then lost 4-3 (gentleman's reverse sweep), or null.
var HISTORICAL_GENT_REVERSE_SWEEPS = [
  // Add historical instances here as needed.
];

function detectGentlemanReverseSwept(series) {
  var games = series.computedGames;
  if (!games || games.length < 7) {
    if (!_bracketYear) return null;
    var tAbbrev = (series.topSeedTeam    || {}).abbrev;
    var bAbbrev = (series.bottomSeedTeam || {}).abbrev;
    for (var i = 0; i < HISTORICAL_GENT_REVERSE_SWEEPS.length; i++) {
      var h = HISTORICAL_GENT_REVERSE_SWEEPS[i];
      if (h.year === _bracketYear && (h.loser === tAbbrev || h.loser === bAbbrev)) {
        return h.loser;
      }
    }
    return null;
  }
  var topWinsFirst4 = games.slice(0, 4).filter(function(g) { return g.topWon; }).length;
  var topWinsLast3  = games.slice(4).filter(function(g) { return g.topWon; }).length;
  var topWins = topWinsFirst4 + topWinsLast3;
  // Top led 3-1 after 4 games then lost 3 straight
  if (topWins === 3 && topWinsFirst4 === 3 && topWinsLast3 === 0) return (series.topSeedTeam    || {}).abbrev;
  // Bottom led 3-1 after 4 games then lost 3 straight
  if (topWins === 4 && topWinsFirst4 === 1 && topWinsLast3 === 3) return (series.bottomSeedTeam || {}).abbrev;
  return null;
}

// Returns the abbrev of the team that was reverse-swept (led 3-0 then lost 4-3), or null.
function detectReverseSwept(series) {
  var games = series.computedGames;
  if (!games || games.length < 7) {
    // Fall back to hard-coded list for historical seasons where per-game data may be unavailable
    if (!_bracketYear) return null;
    var tAbbrev = (series.topSeedTeam    || {}).abbrev;
    var bAbbrev = (series.bottomSeedTeam || {}).abbrev;
    for (var i = 0; i < HISTORICAL_REVERSE_SWEEPS.length; i++) {
      var h = HISTORICAL_REVERSE_SWEEPS[i];
      if (h.year === _bracketYear && (h.loser === tAbbrev || h.loser === bAbbrev)) {
        return h.loser;
      }
    }
    return null;
  }
  var first3TopSweep = games[0].topWon && games[1].topWon && games[2].topWon;
  var first3BotSweep = !games[0].topWon && !games[1].topWon && !games[2].topWon;
  var topWins = games.filter(function (g) { return g.topWon; }).length;
  if (first3TopSweep && topWins === 3) return (series.topSeedTeam    || {}).abbrev;
  if (first3BotSweep && topWins === 4) return (series.bottomSeedTeam || {}).abbrev;
  return null;
}

// --- Fraud image hover (potential-fraud.jpg) ---

var _fraudImgEl = null;
function getFraudImgEl() {
  if (!_fraudImgEl) {
    _fraudImgEl = document.createElement('img');
    _fraudImgEl.src = 'assets/potential-fraud.jpg';
    _fraudImgEl.style.cssText = 'position:fixed;z-index:999;pointer-events:none;display:none;width:200px;';
    document.body.appendChild(_fraudImgEl);
  }
  return _fraudImgEl;
}
function showFraudImg(el, e) {
  var img = getFraudImgEl();
  img.style.left = (e.clientX + 14) + 'px';
  img.style.top  = (e.clientY + 14) + 'px';
  img.style.display = 'block';
}
function moveFraudImg(e) {
  var img = getFraudImgEl();
  img.style.left = (e.clientX + 14) + 'px';
  img.style.top  = (e.clientY + 14) + 'px';
}
function hideFraudImg() {
  getFraudImgEl().style.display = 'none';
}

// --- Reverse-sweep watch hover (potential-fraud.jpg flipped upside down) ---

var _revSwWatchEl = null;
function getRevSwWatchEl() {
  if (!_revSwWatchEl) {
    _revSwWatchEl = document.createElement('div');
    _revSwWatchEl.style.cssText = 'position:fixed;z-index:999;pointer-events:none;display:none;width:200px;';
    _revSwWatchEl.innerHTML = '<img src="assets/potential-fraud.jpg" ' +
      'style="width:100%;display:block;transform:rotate(180deg);">';
    document.body.appendChild(_revSwWatchEl);
  }
  return _revSwWatchEl;
}
function showRevSwWatchImg(el, e) {
  var el2 = getRevSwWatchEl();
  el2.style.left = (e.clientX + 14) + 'px';
  el2.style.top  = (e.clientY + 14) + 'px';
  el2.style.display = 'block';
}
function moveRevSwWatchImg(e) {
  var el2 = getRevSwWatchEl();
  el2.style.left = (e.clientX + 14) + 'px';
  el2.style.top  = (e.clientY + 14) + 'px';
}
function hideRevSwWatchImg() {
  getRevSwWatchEl().style.display = 'none';
}

// --- Reverse-sweep hover (eddie-westfall-sends-his-regards.jpg) ---

var _revSwEl = null;
function getRevSwEl() {
  if (!_revSwEl) {
    _revSwEl = document.createElement('div');
    _revSwEl.style.cssText = 'position:fixed;z-index:999;pointer-events:none;display:none;' +
      'background:#000;border:1px solid #fff;padding:6px;text-align:center;width:180px;';
    _revSwEl.innerHTML = '<img src="assets/eddie-westfall-sends-his-regards.jpg" ' +
      'style="width:100%;display:block;margin-bottom:5px;">' +
      '<span style="color:#fff;font-size:8pt;font-family:Helvetica,Arial,sans-serif;' +
      'letter-spacing:1px;">ED WESTFALL SENDS HIS REGARDS</span>';
    document.body.appendChild(_revSwEl);
  }
  return _revSwEl;
}
function showRevSwHover(el, e) {
  var el2 = getRevSwEl();
  el2.style.left = (e.clientX + 14) + 'px';
  el2.style.top  = (e.clientY + 14) + 'px';
  el2.style.display = 'block';
}
function moveRevSwHover(e) {
  var el2 = getRevSwEl();
  el2.style.left = (e.clientX + 14) + 'px';
  el2.style.top  = (e.clientY + 14) + 'px';
}
function hideRevSwHover() {
  getRevSwEl().style.display = 'none';
}

// --- Game cell tooltip (bracket) ---

var _playoffExpandedCell = null;
var _playoffBsCache      = {};
var _playoffPbpCache     = {};

// Shared: update tooltip score line from a fetched boxscore.
function _applyBsScore(bs) {
  var bsAway = bs.awayTeam || {}, bsHome = bs.homeTeam || {};
  var bsGo   = bs.gameOutcome || {}, bsPd = bs.periodDescriptor || {};
  var otLbl  = '';
  if (bsGo.lastPeriodType === 'OT') {
    var n = bsPd.number || 4;
    otLbl = ' (' + (n === 4 ? 'OT' : (n - 3) + 'OT') + ')';
  }
  document.getElementById('playoff-tt-score').textContent =
    (bsAway.abbrev || '') + ' ' + (bsAway.score || 0) + ' – ' +
    (bsHome.score  || 0) + ' ' + (bsHome.abbrev || '') + otLbl;
}

function showPlayoffTooltip(el, event) {
  if (_playoffExpandedCell && _playoffExpandedCell !== el) return;
  var tt   = document.getElementById('playoff-tt');
  var away = el.dataset.away, home = el.dataset.home;
  var as_  = el.dataset.ascore, hs = el.dataset.hscore;
  var ot   = el.dataset.ot,  date  = el.dataset.date;

  var score = away + ' ' + as_ + ' – ' + hs + ' ' + home + (ot ? ' (' + ot + ')' : '');
  document.getElementById('playoff-tt-score').textContent = score;
  document.getElementById('playoff-tt-date').textContent  = date ? date.slice(0, 10) : '';
  tt.style.display = 'block';
  if (!_playoffExpandedCell) movePlayoffTooltip(event);
}

function movePlayoffTooltip(event) {
  if (_playoffExpandedCell) return;
  var tt = document.getElementById('playoff-tt');
  tt.style.left = '-9999px';
  tt.style.top  = '-9999px';
  tt.style.display = 'block';
  var ttW = tt.offsetWidth, ttH = tt.offsetHeight;
  var vw  = window.innerWidth,  vh  = window.innerHeight;
  var x = (event.clientX + 14 + ttW > vw) ? event.clientX - 14 - ttW : event.clientX + 14;
  var y = (event.clientY + 14 + ttH > vh) ? event.clientY - 14 - ttH : event.clientY + 14;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}

function hidePlayoffTooltip() {
  if (_playoffExpandedCell) return;
  document.getElementById('playoff-tt').style.display = 'none';
}

function clampPlayoffTooltip() {
  var tt   = document.getElementById('playoff-tt');
  var top  = parseInt(tt.style.top,  10) || 0;
  var left = parseInt(tt.style.left, 10) || 0;
  var vh   = window.innerHeight, vw = window.innerWidth;
  if (top  + tt.offsetHeight > vh) tt.style.top  = Math.max(0, vh - tt.offsetHeight - 4) + 'px';
  if (left + tt.offsetWidth  > vw) tt.style.left = Math.max(0, vw - tt.offsetWidth  - 4) + 'px';
}

async function togglePlayoffExpand(el, event) {
  event.stopPropagation();
  var expandEl = document.getElementById('playoff-tt-expand');

  if (_playoffExpandedCell === el) {
    el.style.outline      = '';
    _playoffExpandedCell  = null;
    expandEl.style.display = 'none';
    expandEl.innerHTML    = '';
    document.getElementById('playoff-tt').style.display = 'none';
    return;
  }

  if (_playoffExpandedCell) {
    _playoffExpandedCell.style.outline = '';
    expandEl.style.display = 'none';
    expandEl.innerHTML = '';
  }

  _playoffExpandedCell = null;
  showPlayoffTooltip(el, event);
  _playoffExpandedCell  = el;
  el.style.outline = '2px solid #FFD700';

  var gameId = el.dataset.gameid;
  if (!gameId) return;

  expandEl.innerHTML     = '<div style="color:#888;font-size:9pt;margin-top:6px;">Loading...</div>';
  expandEl.style.display = 'block';

  try {
    var fetches = [];
    if (!_playoffBsCache[gameId]) {
      fetches.push(
        fetch(WORKER + '/v1/gamecenter/' + gameId + '/boxscore')
          .then(function (r) { return r.json(); })
          .then(function (d) { _playoffBsCache[gameId] = d; })
      );
    }
    if (!_playoffPbpCache[gameId]) {
      fetches.push(
        fetch(WORKER + '/v1/gamecenter/' + gameId + '/play-by-play')
          .then(function (r) { return r.json(); })
          .then(function (d) { _playoffPbpCache[gameId] = d; })
          .catch(function ()  { _playoffPbpCache[gameId] = null; })
      );
    }
    await Promise.all(fetches);
    var bs = _playoffBsCache[gameId];
    _applyBsScore(bs);
    expandEl.innerHTML     = buildPlayoffExpandHTML(bs, _playoffPbpCache[gameId]);
    expandEl.style.display = 'block';
    clampPlayoffTooltip();
  } catch (err) {
    expandEl.innerHTML = '<div style="color:#f66;font-size:9pt;margin-top:6px;">Could not load stats.</div>';
  }
}

function buildPlayoffExpandHTML(bs, pbp) {
  var gameStats = (bs || {}).playerByGameStats || {};
  var homeStats = gameStats.homeTeam || {};
  var awayStats = gameStats.awayTeam || {};

  var rosterMap = {};
  ((pbp || {}).rosterSpots || []).forEach(function (p) {
    var first = (p.firstName && p.firstName.default) || '';
    var last  = (p.lastName  && p.lastName.default)  || '';
    rosterMap[p.playerId] = (first + ' ' + last).trim();
  });

  var otWinnerId = null;
  if (pbp && pbp.plays) {
    var otGoals = pbp.plays.filter(function (p) {
      var pd = p.periodDescriptor || {};
      return p.typeDescKey === 'goal' && (pd.periodType === 'OT' || (pd.number || 0) > 3);
    });
    if (otGoals.length) otWinnerId = (otGoals[otGoals.length - 1].details || {}).scoringPlayerId;
  }

  function teamCol(stats) {
    var skaters = (stats.forwards || []).concat(stats.defense || []);
    var scorers = skaters.filter(function (p) {
      return (p.goals || 0) + (p.assists || 0) > 0;
    }).sort(function (a, b) {
      if ((b.goals || 0) !== (a.goals || 0)) return (b.goals || 0) - (a.goals || 0);
      return ((b.goals||0)+(b.assists||0)) - ((a.goals||0)+(a.assists||0));
    });
    var goalies = (stats.goalies || []).filter(function (g) { return (g.shotsAgainst || 0) > 0; });

    var html = '';
    if (!scorers.length) {
      html += '<div style="color:#888;font-style:italic;font-size:9pt;">No points</div>';
    } else {
      html += scorers.map(function (p) {
        var name  = (p.name && p.name.default) || '?';
        var g = p.goals || 0, a = p.assists || 0;
        var isOTW = otWinnerId !== null && p.playerId === otWinnerId;
        var parts = [];
        if (isOTW) parts.push('OTW');
        parts.push(g + 'G'); parts.push(a + 'A');
        var ns = (isOTW || g >= 3) ? 'color:#FFD700;font-weight:bold;' : '';
        return '<div style="font-size:9pt;"><span style="' + ns + '">' + name + '</span>' +
          ' <span style="color:#aaa;">(' + parts.join(', ') + ')</span></div>';
      }).join('');
    }
    if (goalies.length) {
      html += '<div style="margin-top:4px;border-top:1px solid #222;padding-top:3px;">';
      html += goalies.map(function (g) {
        var name = (g.name && g.name.default) || '?';
        var ga = g.goalsAgainst !== undefined ? g.goalsAgainst : '?';
        var sa = g.shotsAgainst !== undefined ? g.shotsAgainst : '?';
        return '<div style="font-size:9pt;">' + name +
          ' <span style="color:#aaa;">(' + ga + 'GA/' + sa + 'SA)</span></div>';
      }).join('');
      html += '</div>';
    }
    return html;
  }

  return '<table width="100%" style="border:none;margin-top:8px;border-top:1px solid #333;padding-top:6px;">' +
    '<tr>' +
    '<td style="font-size:8pt;font-weight:bold;color:#aaa;border:none;padding-bottom:3px;">' +
      ((bs && bs.awayTeam && bs.awayTeam.abbrev) || 'Away') + '</td>' +
    '<td style="font-size:8pt;font-weight:bold;color:#aaa;border:none;padding-bottom:3px;border-left:1px solid #333;padding-left:6px;">' +
      ((bs && bs.homeTeam && bs.homeTeam.abbrev) || 'Home') + '</td>' +
    '</tr><tr>' +
    '<td valign="top" style="border:none;padding-right:6px;">'                              + teamCol(awayStats) + '</td>' +
    '<td valign="top" style="border:none;border-left:1px solid #333;padding-left:6px;">' + teamCol(homeStats) + '</td>' +
    '</tr></table>';
}

document.addEventListener('click', function () {
  if (_playoffExpandedCell) {
    _playoffExpandedCell.style.outline = '';
    _playoffExpandedCell = null;
    var expandEl = document.getElementById('playoff-tt-expand');
    expandEl.style.display = 'none';
    expandEl.innerHTML = '';
    document.getElementById('playoff-tt').style.display = 'none';
  }
});

// --- Goal helpers ---

function playoffsBuildRosterMap(rosterSpots) {
  var map = {};
  (rosterSpots || []).forEach(function (p) {
    var first = (p.firstName && p.firstName.default) || '';
    var last  = (p.lastName  && p.lastName.default)  || '';
    map[p.playerId] = (first + ' ' + last).trim();
  });
  return map;
}

function playoffsGetSituationLabel(play, homeTeamId) {
  var code = play.situationCode || '1551';
  // Format: {awayGoalie}{awaySkaters}{homeSkaters}{homeGoalie}
  var awayGoalieIn = code[0] === '1';
  var awaySkaters  = parseInt(code[1]) || 5;
  var homeSkaters  = parseInt(code[2]) || 5;
  var homeGoalieIn = code[3] === '1';
  var scoringHome  = (play.details || {}).eventOwnerTeamId === homeTeamId;

  var scoringGoalieIn = scoringHome ? homeGoalieIn : awayGoalieIn;
  var defendGoalieIn  = scoringHome ? awayGoalieIn : homeGoalieIn;
  var scoringSkaters  = scoringHome ? homeSkaters  : awaySkaters;
  var defendSkaters   = scoringHome ? awaySkaters  : homeSkaters;

  if (!defendGoalieIn) return 'EN';

  if (!scoringGoalieIn) {
    var netSkaters = scoringSkaters - 1;
    if (netSkaters > defendSkaters) return 'PPG (EA)';
    if (netSkaters < defendSkaters) return 'SHG (EA)';
    return 'EA';
  }

  if (scoringSkaters > defendSkaters) return 'PPG';
  if (scoringSkaters < defendSkaters) return 'SHG';
  return '5v5';
}

function formatGoalLine(g, rosterMap, homeTeamId) {
  var d      = g.details || {};
  var time   = (g.timeInPeriod || '?').replace(/^0/, '');
  var scorer = jafares(rosterMap[d.scoringPlayerId] || '?');
  var a1raw  = rosterMap[d.assist1PlayerId];
  var a2raw  = rosterMap[d.assist2PlayerId];
  var a1     = a1raw ? jafares(a1raw) : null;
  var a2     = a2raw ? jafares(a2raw) : null;

  var assists;
  if (a1 && a2) assists = ' from ' + a1 + ' and ' + a2;
  else if (a1)  assists = ' from ' + a1;
  else          assists = ' (unassisted)';

  var sit    = playoffsGetSituationLabel(g, homeTeamId);
  var sitTag = (sit && sit !== '5v5') ? ' (' + sit + ')' : '';

  return time + ': ' + scorer + assists + sitTag;
}

var TEAM_PRIMARY_COLORS = {
  ANA: '#F47A38', ARI: '#8C2633', ATL: '#4B82C3',
  BOS: '#FFB81C', BUF: '#003087', CAR: '#CE1126',
  CBJ: '#002654', CGY: '#C8102E', CHI: '#CF0A2C',
  COL: '#6F263D', DAL: '#006847', DET: '#CE1126',
  EDM: '#FF4C00', FLA: '#C8102E', LAK: '#A2AAAD',
  MIN: '#154734', MTL: '#AF1E2D', NSH: '#FFB81C',
  NJD: '#CE1126', NYI: '#003087', NYR: '#0038A8',
  OTT: '#C52032', PHI: '#F74902', PHX: '#8C2633',
  PIT: '#FCB514', SEA: '#99D9D9', SJS: '#006D75',
  STL: '#002F87', TBL: '#002868', TOR: '#00205B',
  UTA: '#6CACE4', VAN: '#00843D', VGK: '#B4975A',
  WPG: '#041E42', WSH: '#C8102E',
};

// Used as the gradient target when two same-group teams meet, or always for NYI.
var TEAM_SECONDARY_COLORS = {
  ANA: '#B9975B', BOS: '#000000', BUF: '#FCB514', CAR: '#000000',
  CBJ: '#CE1126', CGY: '#F4BC43', CHI: '#FFFFFF', COL: '#236192',
  DAL: '#C8102E', DET: '#FFFFFF', EDM: '#003DA5', FLA: '#C4903A',
  LAK: '#000000', MIN: '#DDCBA4', MTL: '#003DA5', NJD: '#FFFFFF',
  NSH: '#002654', NYI: '#FC4C02', NYR: '#CE1126', OTT: '#C69214',
  PHI: '#000000', PIT: '#000000', SEA: '#355464', SJS: '#EA7200',
  STL: '#FCB514', TBL: '#000000', TOR: '#FFFFFF', UTA: '#010101',
  VAN: '#008852', VGK: '#333F42', WPG: '#004C97', WSH: '#041E42',
};

// Teams grouped by primary color family. When both teams in a series share a group,
// each team's game cells use a primary→secondary gradient instead of a solid color.
// NYI always gets a gradient regardless.
var COLOR_GROUPS = {
  // Bright red (#C8–CF range)
  CAR: 'red',    CGY: 'red',    CHI: 'red',    DET: 'red',
  FLA: 'red',    MTL: 'red',    NJD: 'red',    OTT: 'red',   WSH: 'red',
  // Dark maroon/burgundy
  ARI: 'maroon', COL: 'maroon', PHX: 'maroon',
  // Royal/medium blue
  BUF: 'blue',   NYI: 'blue',   NYR: 'blue',   STL: 'blue',
  // Dark navy
  CBJ: 'navy',   TBL: 'navy',   TOR: 'navy',   WPG: 'navy',
  // Light/medium blue
  ATL: 'blue-light', UTA: 'blue-light',
  // Gold/yellow
  BOS: 'gold',   NSH: 'gold',   PIT: 'gold',
  // Dark green
  DAL: 'green',  MIN: 'green',  SJS: 'green',  VAN: 'green',
  // Bright orange
  EDM: 'orange', PHI: 'orange',
  // Burnt orange (distinct from bright — won't match EDM/PHI)
  ANA: 'orange-dark',
};

// Chronological game cells — one cell per completed game, colored by winning team.
// OT win: bright-yellow→amber gradient stripe across the top (layered above team color).
// Away win: small white diagonal triangle notched into the bottom-right corner.
// Both can appear on the same cell via stacked CSS background layers.
function buildSeriesGameCells(series) {
  var games = series.computedGames;
  if (!games || !games.length) return '';

  var topAbbrev = (series.topSeedTeam    || {}).abbrev;
  var botAbbrev = (series.bottomSeedTeam || {}).abbrev;
  var sameGroup = COLOR_GROUPS[topAbbrev] && COLOR_GROUPS[topAbbrev] === COLOR_GROUPS[botAbbrev];

  var cells = games.map(function (g) {
    var primary     = TEAM_PRIMARY_COLORS[g.winnerAbbrev] || '#555';
    var useGradient = g.winnerAbbrev === 'NYI' || sameGroup;
    var accent      = useGradient ? TEAM_SECONDARY_COLORS[g.winnerAbbrev] : null;
    var fill    = accent
      ? 'linear-gradient(to right,' + primary + ',' + accent + ')'
      : primary;
    var baseBg = g.awayWon
      ? (accent
          ? 'linear-gradient(135deg,transparent 78%,rgba(255,255,255,0.9) 78%),' + fill
          : 'linear-gradient(135deg,' + primary + ' 78%,rgba(255,255,255,0.9) 78%)')
      : fill;
    var background = g.isOT
      ? 'linear-gradient(to bottom,#FFFF44 0px,#FFA500 3px,transparent 3px),' + baseBg
      : baseBg;
    return '<td' +
      ' data-gameid="' + g.id + '"' +
      ' data-home="'   + g.homeAbbrev + '"' +
      ' data-away="'   + g.awayAbbrev + '"' +
      ' data-hscore="' + g.homeScore  + '"' +
      ' data-ascore="' + g.awayScore  + '"' +
      ' data-date="'   + g.gameDate   + '"' +
      ' data-ot="'     + g.otLabel    + '"' +
      ' onmouseover="showPlayoffTooltip(this,event)"' +
      ' onmousemove="movePlayoffTooltip(event)"' +
      ' onmouseout="hidePlayoffTooltip()"' +
      ' onclick="togglePlayoffExpand(this,event)"' +
      ' style="cursor:pointer;width:22px;height:16px;border:none;background:' + background + ';"></td>';
  });
  // Remaining possible games as dark placeholders
  for (var i = games.length; i < 7; i++) {
    cells.push('<td style="width:22px;height:16px;border:none;background:#1a1a1a;"></td>');
  }

  return '<tr><td colspan="5" align="center" ' +
    'style="border-top:1px solid rgba(255,255,255,0.15);border-left:none;border-right:none;border-bottom:none;padding:4px 4px 5px;">' +
    '<table style="border-collapse:separate;border-spacing:2px;display:inline-table;"><tr>' +
    cells.join('') +
    '</tr></table></td></tr>';
}

// --- Series card (used in bracket) ---

function buildSeriesCard(series, seedLabels) {
  seedLabels = seedLabels || {};

  var top    = series.topSeedTeam    || {};
  var bottom = series.bottomSeedTeam || {};

  var topAbbrev    = top.abbrev    || 'TBD';
  var bottomAbbrev = bottom.abbrev || 'TBD';
  var topWins      = series.topSeedWins    || 0;
  var bottomWins   = series.bottomSeedWins || 0;

  var isNYI      = topAbbrev === 'NYI' || bottomAbbrev === 'NYI';
  var seriesOver = topWins === 4 || bottomWins === 4;
  var status     = seriesStatusText(topAbbrev, topWins, bottomAbbrev, bottomWins);

  var winner = seriesOver ? (topWins === 4 ? topAbbrev : bottomAbbrev) : null;
  var loser  = seriesOver ? (topWins === 4 ? bottomAbbrev : topAbbrev) : null;

  // 6a: higher seed (top) down 2+ in an active series → fraud
  var topFraud = !seriesOver && (bottomWins - topWins) >= 2;

  // 6b: down 3-0 in an active series
  var topDown3    = !seriesOver && topWins === 0    && bottomWins === 3;
  var bottomDown3 = !seriesOver && bottomWins === 0 && topWins === 3;

  // 6c: swept (4-0)
  var topSwept    = seriesOver && loser === topAbbrev    && topWins === 0;
  var bottomSwept = seriesOver && loser === bottomAbbrev && bottomWins === 0;

  // 6d: gentleman's swept (4-1, loser's only win was specifically game 4)
  var topGentSwept = false, bottomGentSwept = false;
  if (seriesOver && topWins + bottomWins === 5) {
    var gsLoser = detectGentlemanSwept(series);
    if (gsLoser === topAbbrev)    topGentSwept    = true;
    if (gsLoser === bottomAbbrev) bottomGentSwept = true;
  }

  // 6d2: backdoor swept (4-1, loser's only win was specifically game 1)
  var topBackdoorSwept = false, bottomBackdoorSwept = false;
  if (seriesOver && topWins + bottomWins === 5 && !topGentSwept && !bottomGentSwept) {
    var bdsLoser = detectBackdoorSwept(series);
    if (bdsLoser === topAbbrev)    topBackdoorSwept    = true;
    if (bdsLoser === bottomAbbrev) bottomBackdoorSwept = true;
  }

  // 6e: reverse swept (won first 3, lost next 4)
  var topRevSwept = false, bottomRevSwept = false;
  if (seriesOver && topWins + bottomWins === 7) {
    var rsLoser = detectReverseSwept(series);
    if (rsLoser === topAbbrev)    topRevSwept    = true;
    if (rsLoser === bottomAbbrev) bottomRevSwept = true;
  }

  // 6e2: gentleman's reverse swept (led 3-1, lost 4-3)
  var topGentRevSwept = false, bottomGentRevSwept = false;
  if (seriesOver && topWins + bottomWins === 7 && !topRevSwept && !bottomRevSwept) {
    var grsLoser = detectGentlemanReverseSwept(series);
    if (grsLoser === topAbbrev)    topGentRevSwept    = true;
    if (grsLoser === bottomAbbrev) bottomGentRevSwept = true;
  }

  // 6f: reverse sweep watch (led 3-0, now tied 3-3)
  var topRevSwWatch = false, bottomRevSwWatch = false;
  if (!seriesOver && topWins === 3 && bottomWins === 3) {
    var rswLoser = detectReverseSweptWatch(series);
    if (rswLoser === topAbbrev)    topRevSwWatch    = true;
    if (rswLoser === bottomAbbrev) bottomRevSwWatch = true;
  }

  var tableStyle = 'border-collapse:collapse;margin-bottom:8px;width:100%;' +
    (isNYI ? 'outline:1px solid white;' : '');

  function teamCell(abbrev, isTop) {
    var isFaded = seriesOver && abbrev === loser;
    var isNYITeam = abbrev === 'NYI';
    // Only the higher seed (top seed) gets the fraud treatment; never applied to NYI
    var isFraud = isTop && topFraud && !isNYITeam;
    var isDown3   = (isTop ? topDown3      : bottomDown3)     && !isNYITeam;
    var isSwept   = (isTop ? topSwept      : bottomSwept)     && !isNYITeam;
    var isGent         = (isTop ? topGentSwept      : bottomGentSwept)      && !isNYITeam;
    var isBackdoorSw   = (isTop ? topBackdoorSwept  : bottomBackdoorSwept)  && !isNYITeam;
    var isRevSw      = (isTop ? topRevSwept      : bottomRevSwept)      && !isNYITeam;
    var isGentRevSw  = (isTop ? topGentRevSwept  : bottomGentRevSwept)  && !isNYITeam;
    var isRevSwW  = (isTop ? topRevSwWatch : bottomRevSwWatch) && !isNYITeam;

    var textColor = isFraud   ? '#FF69B4'
                  : isRevSwW ? '#FF69B4'
                  : isSwept  ? '#880000'
                  : isRevSw      ? '#660066'
                  : isGentRevSw  ? '#664400'
                  : isBackdoorSw ? '#1A4D1A'
                  : isDown3  ? '#CC2222'
                  : '';
    // For swept/reverse-swept teams: fade logo+name individually so emojis stay at full opacity.
    // For all other eliminated teams: fade the whole cell.
    var cellOpacity  = (isFaded && !isSwept && !isGent && !isRevSw && !isGentRevSw && !isBackdoorSw) ? 'opacity:0.4;' : '';
    var innerOpacity = (isSwept || isGent || isRevSw || isGentRevSw || isBackdoorSw) ? 'opacity:0.4;' : '';

    var leftEmoji = '', rightEmoji = '';
    if (isRevSw) {
      leftEmoji  = '<span style="opacity:0.4;display:inline-block;transform:rotate(180deg);line-height:1;">🧹</span>';
      rightEmoji = '<span style="opacity:0.4;display:inline-block;transform:rotate(180deg);line-height:1;">🧹</span>';
    } else if (isSwept) {
      leftEmoji  = '<span style="opacity:0.4;">🧹</span>';
      rightEmoji = '<span style="opacity:0.4;">🧹</span>';
    } else if (isGent) {
      // isTop = higher seed was the loser → lower seed won W W W L W → non-gentleman's, invert hat
      // !isTop = lower seed was the loser → higher seed won W W W L W → proper gentleman's sweep
      leftEmoji  = isTop
        ? '<span style="opacity:0.4;display:inline-block;transform:rotate(180deg);line-height:1;">🎩</span>'
        : '<span style="opacity:0.4;">🎩</span>';
      rightEmoji = '<span style="opacity:0.4;">🧹</span>';
    } else if (isGentRevSw) {
      leftEmoji  = '<span style="opacity:0.4;">😱</span>';
      rightEmoji = '<span style="opacity:0.4;">😵</span>';
    } else if (isBackdoorSw) {
      leftEmoji  = '<span style="opacity:0.4;">🚪</span>';
      rightEmoji = '<span style="opacity:0.4;">🧹</span>';
    } else if (isRevSwW) {
      leftEmoji  = '<span style="opacity:0.3;">👀</span>';
      rightEmoji = '<span style="opacity:0.3;display:inline-block;transform:rotate(180deg);line-height:1;">🧹</span>';
    } else if (isDown3) {
      leftEmoji  = '<span style="opacity:0.3;">👀</span>';
      rightEmoji = '<span style="opacity:0.3;">🧹</span>';
    }

    var innerStyle = isRevSw ? 'display:inline-block;transform:rotate(180deg);' : '';

    var fraudAttr = isFraud
      ? ' onmouseover="showFraudImg(this,event)" onmousemove="moveFraudImg(event)" onmouseout="hideFraudImg()"'
      : '';
    var revSwWAttr = isRevSwW
      ? ' onmouseover="showRevSwWatchImg(this,event)" onmousemove="moveRevSwWatchImg(event)" onmouseout="hideRevSwWatchImg()"'
      : '';
    var revSwAttr = isRevSw
      ? ' onmouseover="showRevSwHover(this,event)" onmousemove="moveRevSwHover(event)" onmouseout="hideRevSwHover()"'
      : '';

    var seed = seedLabels[abbrev] || '';
    var nameColor = textColor ? 'color:' + textColor + ';' : '';

    var EC = 'border:none;vertical-align:middle;padding:0 2px;font-size:14pt;';
    var textHTML = (leftEmoji || rightEmoji)
      ? '<table style="margin:0 auto;border-collapse:collapse;border:none;"><tr>' +
          '<td style="' + EC + '">' + (leftEmoji  || '') + '</td>' +
          '<td style="border:none;vertical-align:middle;padding:0;' + innerOpacity + '">' +
            '<div style="font-size:8pt;' + nameColor + '">' + abbrev + '</div>' +
            (seed ? '<div style="font-size:7pt;color:#888;">' + seed + '</div>' : '') +
          '</td>' +
          '<td style="' + EC + '">' + (rightEmoji || '') + '</td>' +
        '</tr></table>'
      : '<div style="font-size:8pt;' + nameColor + '">' + abbrev + '</div>' +
        (seed ? '<div style="font-size:7pt;color:#888;">' + seed + '</div>' : '');

    var teamObj  = isTop ? top : bottom;
    var logoUrl  = teamObj.logo || playoffsLogoURL(abbrev);
    var imgStyle = 'display:block;margin:0 auto 3px;' + innerOpacity;
    var content = '<span style="' + innerStyle + '">' +
      '<img src="' + logoUrl + '" width="36" alt="' + abbrev + '" ' +
      'onerror="this.style.display=\'none\'" style="' + imgStyle + '">' +
      textHTML +
      '</span>';

    return '<td align="center" width="30%" style="border:none;padding:4px 2px;' + cellOpacity + '"' + fraudAttr + revSwAttr + revSwWAttr + '>' +
      content + '</td>';
  }

  function winsCell(abbrev, wins, isTop) {
    var isFaded = seriesOver && abbrev === loser;
    var isNYITeam = abbrev === 'NYI';
    var isFraud = isTop && topFraud && !isNYITeam;
    var isDown3 = (isTop ? topDown3 : bottomDown3) && !isNYITeam;
    var isSwept = (isTop ? topSwept : bottomSwept) && !isNYITeam;
    var isRevSw  = (isTop ? topRevSwept   : bottomRevSwept)  && !isNYITeam;
    var isRevSwW = (isTop ? topRevSwWatch : bottomRevSwWatch) && !isNYITeam;

    var textColor = isFraud  ? 'color:#FF69B4;'
                  : isRevSwW ? 'color:#FF69B4;'
                  : isSwept  ? 'color:#880000;'
                  : isRevSw  ? 'color:#660066;'
                  : isDown3  ? 'color:#CC2222;'
                  : '';
    var cellOpacity = isFaded ? 'opacity:0.4;' : '';

    return '<td align="center" width="10%" style="border:none;font-size:18pt;font-weight:bold;padding:0 2px;' + textColor + cellOpacity + '">' + wins + '</td>';
  }

  // Higher seed (top) on the LEFT; lower seed (bottom) on the RIGHT
  return '<table style="' + tableStyle + '">' +
    '<tr>' +
    teamCell(topAbbrev, true) +
    winsCell(topAbbrev, topWins, true) +
    '<td align="center" width="20%" style="border:none;font-size:8pt;opacity:0.6;">vs</td>' +
    winsCell(bottomAbbrev, bottomWins, false) +
    teamCell(bottomAbbrev, false) +
    '</tr>' +
    '<tr>' +
    '<td colspan="5" align="center" style="border-top:1px solid rgba(255,255,255,0.25);border-left:none;border-right:none;border-bottom:none;font-size:8pt;opacity:0.7;padding:3px 4px;">' +
    status + '</td>' +
    '</tr>' +
    buildSeriesGameCells(series) +
    '</table>';
}

// --- Today's game card ---

function buildTodayGameCard(game, pbp) {
  var away  = game.awayTeam || {};
  var home  = game.homeTeam || {};
  var state = game.gameState;

  var isFinal = state === 'OFF'  || state === 'FINAL';
  var isLive  = state === 'LIVE' || state === 'CRIT';
  var isFut   = state === 'FUT'  || state === 'PRE';
  var isNYI   = away.abbrev === 'NYI' || home.abbrev === 'NYI';

  var centerScore, centerSub;
  if (isFinal) {
    centerScore = (away.score || 0) + ' – ' + (home.score || 0);
    centerSub   = 'Final';
    if (game.gameOutcome) {
      if (game.gameOutcome.lastPeriodType === 'OT') {
        var otPd  = (game.periodDescriptor || {}).number || 4;
        var otLbl = otPd === 4 ? 'OT' : (otPd - 3) + 'OT';
        centerSub = 'Final/' + otLbl;
      }
      if (game.gameOutcome.lastPeriodType === 'SO') centerSub = 'Final/SO';
    }
  } else if (isLive) {
    var pd    = game.periodDescriptor || {};
    var clock = game.clock || {};
    centerScore = (away.score || 0) + ' – ' + (home.score || 0);
    var period = pd.number || 0;
    if (clock.inIntermission) {
      var intLabel = period === 1 ? '1st INT'
                   : period === 2 ? '2nd INT'
                   : period === 3 ? 'OT INT'
                   : playoffsPeriodLabel(period + 1) + ' INT';
      centerSub = clock.timeRemaining ? intLabel + ' · ' + clock.timeRemaining : intLabel;
    } else {
      centerSub = playoffsPeriodLabel(period) + ' · ' + (clock.timeRemaining || '');
    }
  } else {
    centerScore = formatGameStartTime(game.startTimeUTC);
    centerSub   = '';
  }

  var ss = game.seriesStatus || {};
  var seriesLine = '';
  if (ss.seriesTitle) {
    var tA = ss.topSeedTeamAbbrev || '', bA = ss.bottomSeedTeamAbbrev || '';
    var tW = ss.topSeedWins || 0,     bW = ss.bottomSeedWins || 0;
    var statusPart = (tW === 3 && bW === 3) ? '🚨 Game 7 🚨' : seriesStatusText(tA, tW, bA, bW);
    seriesLine = ss.seriesTitle + (tA ? ' — ' + statusPart : '');
  }

  var borderStyle = isNYI
    ? 'border:1px solid white;'
    : 'border:1px solid rgba(255,255,255,0.4);';

  function teamCell(team) {
    return '<td align="center" width="35%" style="border:none;padding:10px 6px;">' +
      '<img src="' + (team.logo || playoffsLogoURL(team.abbrev || '')) + '" width="64" alt="' + (team.abbrev || '') + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 6px;">' +
      '<div style="font-size:10pt;">' + (team.abbrev || '') + '</div>' +
      '</td>';
  }

  // Build goals section grouped by period
  var goalsHTML = '';
  if (pbp && !isFut) {
    var rosterMap = playoffsBuildRosterMap(pbp.rosterSpots);
    var plays     = pbp.plays || [];
    var homeId    = home.id;
    var goals     = plays.filter(function (p) { return p.typeDescKey === 'goal'; });

    // Collect unique periods in order
    var periods = [];
    goals.forEach(function (g) {
      var p = (g.periodDescriptor || {}).number || 0;
      if (periods.indexOf(p) === -1) periods.push(p);
    });

    var GOAL_STYLE   = 'font-size:8pt;color:#bbb;font-style:italic;';
    var PERIOD_STYLE = 'font-size:7pt;color:#777;text-transform:uppercase;letter-spacing:0.05em;padding:5px 8px 1px 8px;border:none;text-align:center;';

    var innerRows = '';
    periods.forEach(function (period) {
      var pg   = goals.filter(function (g) { return ((g.periodDescriptor || {}).number || 0) === period; });
      var away = pg.filter(function (g) { return (g.details || {}).eventOwnerTeamId !== homeId; });
      var hm   = pg.filter(function (g) { return (g.details || {}).eventOwnerTeamId === homeId; });

      innerRows +=
        '<tr>' +
          '<td colspan="2" style="' + PERIOD_STYLE + '">' + playoffsPeriodLabel(period) + '</td>' +
        '</tr>' +
        '<tr>' +
          '<td width="50%" valign="top" style="border:none;padding:1px 8px 5px 8px;' + GOAL_STYLE + '">' +
            away.map(function (g) { return '<div>' + formatGoalLine(g, rosterMap, homeId) + '</div>'; }).join('') +
          '</td>' +
          '<td width="50%" valign="top" style="border:none;padding:1px 8px 5px 8px;' + GOAL_STYLE + '">' +
            hm.map(function (g) { return '<div>' + formatGoalLine(g, rosterMap, homeId) + '</div>'; }).join('') +
          '</td>' +
        '</tr>';
    });

    if (innerRows) {
      goalsHTML =
        '<tr><td colspan="3" style="border-top:1px solid rgba(255,255,255,0.2);border-left:none;border-right:none;border-bottom:none;padding:0;">' +
          '<table width="100%" style="border:none;">' + innerRows + '</table>' +
        '</td></tr>';
    }
  }

  return '<table width="100%" style="' + borderStyle + 'border-collapse:collapse;margin-bottom:14px;">' +
    '<tr>' +
    teamCell(away) +
    '<td align="center" width="30%" style="border:none;padding:10px 4px;">' +
      '<div style="font-size:' + (isFut ? '13pt' : '26pt') + ';font-weight:bold;">' + centerScore + '</div>' +
      (centerSub ? '<div style="font-size:9pt;margin-top:4px;opacity:0.8;">' + centerSub + '</div>' : '') +
    '</td>' +
    teamCell(home) +
    '</tr>' +
    (seriesLine
      ? '<tr><td colspan="3" align="center" style="border-top:1px solid rgba(255,255,255,0.25);border-left:none;border-right:none;border-bottom:none;font-size:9pt;opacity:0.7;padding:5px 8px;">' + seriesLine + '</td></tr>'
      : '') +
    goalsHTML +
    '</table>';
}

// --- Bracket helpers ---

var ROUND_LABEL_STYLE = 'font-size:9pt;font-weight:normal;opacity:0.7;text-transform:uppercase;margin:10px 0 6px 0;';

function roundStarted(seriesList) {
  return seriesList.some(function (s) {
    return (s.topSeedWins || 0) + (s.bottomSeedWins || 0) > 0;
  });
}

function roundWrap(started, inner) {
  return started ? inner : '<div style="opacity:0.5;">' + inner + '</div>';
}

// Returns { header, r1, r2, cf } HTML strings for aligned row-per-round rendering.
function buildConferenceRounds(allSeries, r1Letters, r2Letters, cfLetter, confName, seedLabels) {
  function getSeries(letters) {
    return letters.map(function (l) {
      return allSeries.find(function (s) { return s.seriesLetter === l; });
    }).filter(Boolean);
  }
  function roundHTML(seriesList, label) {
    if (!seriesList.length) return '';
    return roundWrap(roundStarted(seriesList),
      '<h4 style="' + ROUND_LABEL_STYLE + '">' + label + '</h4>' +
      seriesList.map(function (s) { return buildSeriesCard(s, seedLabels); }).join(''));
  }
  var cfSeries  = getSeries([cfLetter]);
  var cfLabel   = (cfSeries[0] && cfSeries[0].seriesTitle) || 'Conference Final';
  return {
    header: '<h3 style="text-align:center;font-size:12pt;margin:0 0 10px 0;">' + confName + '</h3>',
    r1: roundHTML(getSeries(r1Letters), '1st Round'),
    r2: roundHTML(getSeries(r2Letters), '2nd Round'),
    cf: roundHTML(cfSeries, cfLabel),
  };
}

// --- Per-game series data ---
// Fetches club-schedule-season for one team per started series, cross-references
// the two opponents to extract completed playoff games in chronological order,
// and attaches them as series.computedGames for detection and cell rendering.

async function fetchSeriesGames(allSeries, season) {
  var started = allSeries.filter(function (s) {
    return (s.topSeedWins || 0) + (s.bottomSeedWins || 0) > 0;
  });
  if (!started.length) return;

  // One schedule fetch per unique top-seed abbrev
  var abbrevs = [], seen = {};
  started.forEach(function (s) {
    var a = (s.topSeedTeam || {}).abbrev;
    if (a && !seen[a]) { abbrevs.push(a); seen[a] = true; }
  });

  var scheduleMap = {};
  await Promise.all(abbrevs.map(function (abbrev) {
    return fetch(WORKER + '/v1/club-schedule-season/' + abbrev + '/' + season)
      .then(function (r) { return r.json(); })
      .then(function (d) { scheduleMap[abbrev] = d.games || []; })
      .catch(function ()  { scheduleMap[abbrev] = []; });
  }));

  started.forEach(function (s) {
    var topAbbrev    = (s.topSeedTeam    || {}).abbrev || '';
    var bottomAbbrev = (s.bottomSeedTeam || {}).abbrev || '';
    var allGames     = scheduleMap[topAbbrev] || [];

    s.computedGames = allGames.filter(function (g) {
      if (g.gameType !== 3) return false;
      if (g.gameState !== 'OFF' && g.gameState !== 'FINAL') return false;
      var ha = (g.homeTeam || {}).abbrev;
      var aa = (g.awayTeam || {}).abbrev;
      return (ha === topAbbrev && aa === bottomAbbrev) ||
             (ha === bottomAbbrev && aa === topAbbrev);
    }).sort(function (a, b) {
      return (a.id || 0) - (b.id || 0);
    }).map(function (g) {
      var ha  = (g.homeTeam || {}).abbrev;
      var aa  = (g.awayTeam || {}).abbrev;
      var hs  = (g.homeTeam || {}).score || 0;
      var as_ = (g.awayTeam || {}).score || 0;
      var winnerAbbrev = hs > as_ ? ha : aa;
      var outc      = g.gameOutcome || {};
      var isOT      = outc.lastPeriodType === 'OT';
      // lastPeriodNumber (gameOutcome) is more reliable than periodDescriptor.number for past games
      var pdNum     = outc.lastPeriodNumber || (g.periodDescriptor || {}).number || 4;
      var otLabel   = isOT ? (pdNum === 4 ? 'OT' : (pdNum - 3) + 'OT') : '';
      return {
        id:          g.id || '',
        gameDate:    g.gameDate || '',
        homeAbbrev:  ha,
        awayAbbrev:  aa,
        homeScore:   hs,
        awayScore:   as_,
        otLabel:     otLabel,
        winnerAbbrev: winnerAbbrev,
        topWon:  winnerAbbrev === topAbbrev,
        isOT:    isOT,
        awayWon: winnerAbbrev === aa,
      };
    });
  });
}

// --- Main ---

async function loadPlayoffsPage() {
  var season  = getSelectedSeason();
  var year    = parseInt(season.slice(4), 10);
  var nowYear = (function () {
    var now = new Date();
    return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  }());
  var isCurrent = (year === nowYear);

  _bracketYear = year;
  document.getElementById('season-picker').innerHTML = renderSeasonPicker();

  // Hide today's games section for historical seasons
  var todaySection = document.getElementById('today-games-section');
  if (!isCurrent) todaySection.style.display = 'none';

  try {
    var bracketData, seedLabels = {}, todayGames = [], pbpResults = [];

    if (isCurrent) {
      var results = await Promise.all([
        fetch(WORKER + '/v1/score/now'),
        fetch(WORKER + '/v1/playoff-bracket/' + year),
        fetch(WORKER + '/v1/standings/now'),
      ]);
      var scoreData = await results[0].json();
      bracketData   = await results[1].json();
      var standData = await results[2].json();

      // Build seed label map: A1, M2, WC1, etc.
      (standData.standings || []).forEach(function (t) {
        var abbrev = t.teamAbbrev && (t.teamAbbrev.default || t.teamAbbrev);
        if (!abbrev) return;
        if (t.divisionSequence && t.divisionSequence <= 3) {
          seedLabels[abbrev] = (t.divisionAbbrev || '') + t.divisionSequence;
        } else if (t.wildcardSequence && t.wildcardSequence <= 2) {
          seedLabels[abbrev] = 'WC' + t.wildcardSequence;
        }
      });

      todayGames = (scoreData.games || []).filter(function (g) { return g.gameType === 3; });
      pbpResults = await Promise.all(
        todayGames.map(function (g) {
          return fetch(WORKER + '/v1/gamecenter/' + g.id + '/play-by-play')
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });
        })
      );
    } else {
      bracketData = await fetch(WORKER + '/v1/playoff-bracket/' + year).then(function (r) { return r.json(); });
    }

    // Today's games (current season only)
    if (isCurrent) {
      var todayEl = document.getElementById('today-games');
      if (todayGames.length) {
        todayEl.innerHTML = todayGames.map(function (game, i) {
          return buildTodayGameCard(game, pbpResults[i]);
        }).join('');
      } else {
        todayEl.innerHTML = '<p style="opacity:0.5;font-size:10pt;">No playoff games today.</p>';
      }
    }

    // Bracket
    var bracketEl = document.getElementById('bracket');
    var allSeries = bracketData.series || [];

    if (!allSeries.length) {
      bracketEl.innerHTML = '<p style="opacity:0.5;font-size:10pt;">Bracket not yet available.</p>';
      return;
    }

    await fetchSeriesGames(allSeries, season);

    var isCovid21   = (year === 2021);
    var east        = buildConferenceRounds(allSeries, ['A','B','C','D'], ['I','J'], 'M', isCovid21 ? 'East / Central' : 'Eastern Conference', seedLabels);
    var west        = buildConferenceRounds(allSeries, ['E','F','G','H'], ['K','L'], 'N', isCovid21 ? 'West / North'   : 'Western Conference', seedLabels);
    var finalSeries = allSeries.find(function (s) { return s.seriesLetter === 'O'; });

    function confRow(eastCell, westCell) {
      if (!eastCell && !westCell) return '';
      return '<tr>' +
        '<td width="50%" valign="top" style="border:none;padding-right:14px;">' + (eastCell || '') + '</td>' +
        '<td width="50%" valign="top" style="border:none;padding-left:14px;">'  + (westCell || '') + '</td>' +
        '</tr>';
    }

    bracketEl.innerHTML =
      '<table width="100%" style="border:none;">' +
      confRow(east.header, west.header) +
      confRow(east.r1, west.r1) +
      confRow(east.r2, west.r2) +
      confRow(east.cf, west.cf) +
      '</table>' +
      (finalSeries
        ? roundWrap(roundStarted([finalSeries]),
            '<h3 style="text-align:center;font-size:12pt;margin:24px 0 10px 0;">Stanley Cup Final</h3>' +
            '<div style="max-width:300px;margin:0 auto;">' + buildSeriesCard(finalSeries, seedLabels) + '</div>')
        : '');

    document.getElementById('footer').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

  } catch (err) {
    console.error('Playoffs page load failed:', err);
    document.getElementById('bracket').innerHTML =
      '<p style="opacity:0.5;font-size:10pt;">Failed to load data.</p>';
  }
}

loadPlayoffsPage();
