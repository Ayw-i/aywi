'use strict';

const WORKER = 'https://nhl-proxy.aywi.workers.dev';

// Switch between 'E' (stripe OTL/SOL), 'E3' (olive/brown stripe OTL/SOL), 'F' (dark reg L / light LP / stripe inc)
const COLOR_SCHEME = 'F';

const SCHEMES = {
  E: {
    homeWinReg: '#0047AB', homeWinOT: '#4D90E0', homeWinSO: '#99C4F0',
    awayWinReg: '#CC5500', awayWinOT: '#FF8C00', awayWinSO: '#FFBB66',
    homeLossReg: '#DADADA', homeLossStripe: '#888888',
    awayLossReg: '#B0B0B0', awayLossStripe: '#555555',
    incHome: '#606060', incAway: '#404040'
  },
  E3: {
    homeWinReg: '#0047AB', homeWinOT: '#4D90E0', homeWinSO: '#99C4F0',
    awayWinReg: '#CC5500', awayWinOT: '#FF8C00', awayWinSO: '#FFBB66',
    homeLossReg: '#5C4A1E', homeLossStripe: '#9A8040',
    awayLossReg: '#7A7040', awayLossStripe: '#C0B870',
    incHome: '#606060', incAway: '#404040'
  },
  // F: dark reg losses / light loser-point losses / striped unplayed
  F: {
    homeWinReg: '#0047AB', homeWinOT: '#4D90E0', homeWinSO: '#99C4F0',
    awayWinReg: '#CC5500', awayWinOT: '#FF8C00', awayWinSO: '#FFBB66',
    homeLossReg: '#333333', homeLossOTL: '#F2F2F2', homeLossSOL: '#CCCCCC',
    awayLossReg: '#191919', awayLossOTL: '#D8D8D8', awayLossSOL: '#BBBBBB',
    incHome: '#AAAAAA', incHomeStripe: '#3A3A3A',
    incAway: '#888888', incAwayStripe: '#282828'
  }
};

const DIVISIONS = [
  { name: 'METROPOLITAN', teams: ['CAR','CBJ','NJD','NYR','PHI','PIT','WSH'] },
  { name: 'ATLANTIC',     teams: ['BOS','BUF','DET','FLA','MTL','OTT','TBL','TOR'] },
  { name: 'CENTRAL',      teams: ['CHI','COL','DAL','MIN','NSH','STL','UTA','WPG'] },
  { name: 'PACIFIC',      teams: ['ANA','CGY','EDM','LAK','SJS','SEA','VAN','VGK'] }
];

const TEAM_NAMES = {
  CAR: 'Carolina',      CBJ: 'Columbus',      NJD: 'New Jersey',   NYR: 'NY Rangers',
  PHI: 'Philadelphia',  PIT: 'Pittsburgh',    WSH: 'Washington',
  BOS: 'Boston',        BUF: 'Buffalo',       DET: 'Detroit',      FLA: 'Florida',
  MTL: 'Montreal',      OTT: 'Ottawa',        TBL: 'Tampa Bay',    TOR: 'Toronto',
  CHI: 'Chicago',       COL: 'Colorado',      DAL: 'Dallas',       MIN: 'Minnesota',
  NSH: 'Nashville',     STL: 'St. Louis',     UTA: 'Utah',         WPG: 'Winnipeg',
  ANA: 'Anaheim',       CGY: 'Calgary',       EDM: 'Edmonton',     LAK: 'Los Angeles',
  SJS: 'San Jose',      SEA: 'Seattle',       VAN: 'Vancouver',    VGK: 'Vegas'
};

// Result grouping order: all W, all reg L, all OTL/SOL, unplayed
const RESULT_ORDER = [
  g => g.result === 'W',
  g => g.result === 'L' && g.type === 'REG',
  g => g.result === 'L' && (g.type === 'OT' || g.type === 'SO'),
  g => g.result === null
];

// --- Helpers ---

function fmtSeriesDate(dateStr) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(dateStr + 'T12:00:00');
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function labelTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#000' : '#fff';
}

function stripeGrad(c1, c2) {
  return 'repeating-linear-gradient(45deg,' + c1 + ',' + c1 + ' 4px,' + c2 + ' 4px,' + c2 + ' 8px)';
}

// Returns a CSS background value: hex color or gradient depending on active scheme.
function gameBg(game) {
  const s = SCHEMES[COLOR_SCHEME];
  if (game.result === null) {
    // Scheme F: unplayed cells are striped
    if (s.incHomeStripe) return stripeGrad(game.isHome ? s.incHome : s.incAway, game.isHome ? s.incHomeStripe : s.incAwayStripe);
    return game.isHome ? s.incHome : s.incAway;
  }
  const t = game.type;
  if (game.result === 'W') {
    if (game.isHome) return t === 'REG' ? s.homeWinReg : t === 'OT' ? s.homeWinOT : s.homeWinSO;
    return t === 'REG' ? s.awayWinReg : t === 'OT' ? s.awayWinOT : s.awayWinSO;
  }
  // Regulation loss: always solid
  if (t === 'REG') return game.isHome ? s.homeLossReg : s.awayLossReg;
  // OT/SO loss (loser point): split OTL/SOL if scheme supports it, else solid or stripe
  if (s.homeLossOTL) return game.isHome ? (t === 'SO' ? s.homeLossSOL : s.homeLossOTL) : (t === 'SO' ? s.awayLossSOL : s.awayLossOTL);
  if (s.homeLossLP) return game.isHome ? s.homeLossLP : s.awayLossLP;
  return stripeGrad(game.isHome ? s.homeLossReg : s.awayLossReg, game.isHome ? s.homeLossStripe : s.awayLossStripe);
}

// --- Data processing ---

function processGames(rawGames) {
  const byOpp = {};
  rawGames.forEach(function (g) {
    if (g.gameType !== 2) return;

    const isHome   = g.homeTeam.abbrev === 'NYI';
    const oppAbbrev = isHome ? g.awayTeam.abbrev : g.homeTeam.abbrev;
    if (!byOpp[oppAbbrev]) byOpp[oppAbbrev] = [];

    const isLive      = g.gameState === 'LIVE' || g.gameState === 'CRIT';
    const hasScore    = g.homeTeam.score !== undefined && g.awayTeam.score !== undefined;
    const isDone      = hasScore && !isLive;

    const game = { opponent: oppAbbrev, date: g.gameDate, isHome, result: null, type: null, nyiScore: null, oppScore: null, gameId: g.id };

    if (isDone) {
      const nyiScore = isHome ? g.homeTeam.score : g.awayTeam.score;
      const oppScore = isHome ? g.awayTeam.score : g.homeTeam.score;
      game.result    = nyiScore > oppScore ? 'W' : 'L';
      game.type      = (g.gameOutcome && g.gameOutcome.lastPeriodType) || 'REG';
      game.nyiScore  = nyiScore;
      game.oppScore  = oppScore;
      // SO loss from a 0-0 game also earns a shutout (NHL credits both goalies)
      game.isShutout = (game.result === 'W' && oppScore === 0) ||
                       (game.result === 'L' && game.type === 'SO' && nyiScore === 0);
    }

    byOpp[oppAbbrev].push(game);
  });
  return byOpp;
}

// --- Bar rendering ---

function renderGameCell(g) {
  const bg      = gameBg(g);
  const opp     = g.opponent;
  const nyi     = g.nyiScore !== null ? g.nyiScore : '';
  const osc     = g.oppScore !== null ? g.oppScore : '';
  const shutout = g.isShutout ? '1' : '0';
  const extra   = g.isShutout ? 'box-shadow:inset 0 -3px 0 0 #FFD700;' : '';
  return '<td' +
    ' data-opp="'      + opp                      + '"' +
    ' data-home="'     + (g.isHome ? '1' : '0')   + '"' +
    ' data-result="'   + (g.result || '')          + '"' +
    ' data-type="'     + (g.type   || '')          + '"' +
    ' data-nyi="'      + nyi                       + '"' +
    ' data-oppscore="' + osc                       + '"' +
    ' data-date="'     + g.date                    + '"' +
    ' data-shutout="'  + shutout                   + '"' +
    ' data-gameid="'   + (g.gameId || '')          + '"' +
    ' style="background:' + bg + ';width:26px;height:15px;cursor:pointer;' + extra + '"' +
    ' onmouseover="showSeriesTooltip(this,event)"' +
    ' onmousemove="moveSeriesTooltip(event)"' +
    ' onmouseout="hideSeriesTooltip()"' +
    ' onclick="toggleSeriesExpand(this,event)"' +
    '></td>';
}

function renderBar(games, groupBy) {
  if (!games || games.length === 0) return '';

  const s = SCHEMES[COLOR_SCHEME];
  let sorted;

  if (groupBy === 'result') {
    sorted = [];
    RESULT_ORDER.forEach(fn => games.filter(fn).forEach(g => sorted.push(g)));
  } else {
    sorted = games.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  }

  const gameCells = sorted.map(renderGameCell).join('');

  let labelRow = '';
  if (groupBy === 'result') {
    // 3 label groups: W (blue/orange stripe), reg L (dark), OTL/SOL (lightest loser-point)
    const wBg   = 'linear-gradient(to right,' + s.homeWinReg + ',' + s.awayWinReg + ')';
    const rlBg  = s.homeLossReg;
    const lpBg  = s.awayLossSOL || s.awayLossLP || s.awayLossReg;
    const incBg = s.incHomeStripe ? stripeGrad(s.incHome, s.incHomeStripe) : s.incHome;

    const groups = [
      { list: games.filter(g => g.result === 'W'),                                           bg: wBg,   tc: '#fff'               },
      { list: games.filter(g => g.result === 'L' && g.type === 'REG'),                       bg: rlBg,  tc: labelTextColor(rlBg) },
      { list: games.filter(g => g.result === 'L' && (g.type === 'OT' || g.type === 'SO')),  bg: lpBg,  tc: labelTextColor(lpBg) },
      { list: games.filter(g => g.result === null),                                           bg: incBg, tc: '#fff'               },
    ].filter(gr => gr.list.length > 0);

    const labelCells = groups.map(function (gr) {
      return '<td colspan="' + gr.list.length + '"' +
        ' style="background:' + gr.bg + ';color:' + gr.tc + ';text-align:center;' +
        'font-weight:bold;font-size:11px;height:20px;vertical-align:middle;">' +
        gr.list.length + '</td>';
    }).join('');

    labelRow = '<tr>' + labelCells + '</tr>';
  }

  return '<table style="border-collapse:separate;border-spacing:2px;display:inline-table;">' +
    labelRow + '<tr>' + gameCells + '</tr></table>';
}

// --- Division + total rendering ---

function renderDivisionSection(div, byOpp, groupBy, teamStandings, sortBy, padToRows) {
  const isMetro = div.name === 'METROPOLITAN';

  // Build the ordered list of entries, inserting NYI when sorting by standing
  let entries = div.teams.map(function (abbrev) {
    const st  = teamStandings[abbrev];
    return { abbrev, seq: st ? st.divisionSequence : 999, isSelf: false };
  });

  if (sortBy === 'standing' && isMetro) {
    const nyiSt = teamStandings['NYI'];
    entries.push({ abbrev: 'NYI', seq: nyiSt ? nyiSt.divisionSequence : 999, isSelf: true });
  }

  if (sortBy === 'standing') {
    entries.sort((a, b) => a.seq - b.seq);
  }

  let rows = '';
  entries.forEach(function (entry) {
    const { abbrev, isSelf } = entry;
    const st   = teamStandings[abbrev];
    const name = isSelf ? 'NY Islanders' : (TEAM_NAMES[abbrev] || abbrev);

    const seasonRecord = st
      ? '<br><span style="color:#555;font-size:8pt;">' + st.wins + '&#8209;' + st.losses + '&#8209;' + st.otLosses + '</span>'
      : '';

    if (isSelf) {
      rows += '<tr>' +
        '<td style="width:130px;text-align:right;padding-right:10px;font-size:10pt;vertical-align:middle;white-space:nowrap;color:#aaa;">' +
          name + seasonRecord +
        '</td>' +
        '<td style="vertical-align:middle;color:#444;font-size:9pt;padding-left:4px;height:' + (groupBy === 'result' ? 44 : 22) + 'px;padding-bottom:3px;">—</td>' +
      '</tr>';
      return;
    }

    const games  = byOpp[abbrev] || [];
    const w      = games.filter(g => g.result === 'W').length;
    const l      = games.filter(g => g.result === 'L' && g.type === 'REG').length;
    const otl    = games.filter(g => g.result === 'L' && (g.type === 'OT' || g.type === 'SO')).length;

    rows += '<tr>' +
      '<td style="width:130px;text-align:right;padding-right:10px;font-size:10pt;vertical-align:middle;white-space:nowrap;">' +
        name + ' <span style="color:#888;font-size:9pt;">(' + w + '&#8209;' + l + '&#8209;' + otl + ')</span>' +
        seasonRecord +
      '</td>' +
      '<td style="vertical-align:middle;padding-bottom:3px;">' + renderBar(games, groupBy) + '</td>' +
    '</tr>';
  });

  const effectiveCount = entries.length;
  const pad = (padToRows || 0) - effectiveCount;
  const padH = groupBy === 'result' ? 40 : 20;
  for (let i = 0; i < pad; i++) {
    rows += '<tr><td colspan="2" style="height:' + padH + 'px;"></td></tr>';
  }

  return '<p style="font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin:18px 0 4px 0;">' +
    div.name + '</p>' +
    '<table style="border-collapse:collapse;">' + rows + '</table>';
}

function renderRecordSummary(byOpp) {
  let rw = 0, otw = 0, sow = 0, rl = 0, otl = 0, sol = 0;
  Object.values(byOpp).forEach(function (games) {
    games.forEach(function (g) {
      if (g.result === 'W') {
        if (g.type === 'REG') rw++;
        else if (g.type === 'OT') otw++;
        else if (g.type === 'SO') sow++;
      } else if (g.result === 'L') {
        if (g.type === 'REG') rl++;
        else if (g.type === 'OT') otl++;
        else if (g.type === 'SO') sol++;
      }
    });
  });

  const totalW  = rw + otw + sow;
  const totalLP = otl + sol;
  const overall = totalW + '–' + rl + '–' + totalLP;

  function cell(label, big, sub) {
    return '<td style="padding:8px 20px;text-align:center;border:1px solid #444;">' +
      '<div style="font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:18pt;font-weight:bold;line-height:1;">' + big + '</div>' +
      (sub ? '<div style="font-size:8pt;color:#666;margin-top:5px;">' + sub + '</div>' : '') +
    '</td>';
  }

  return '<table style="border-collapse:collapse;margin:0 auto 20px;border:1px solid #444;">' +
    '<tr><td colspan="3" style="text-align:center;padding:6px 20px;font-size:13pt;font-weight:bold;border-bottom:1px solid #444;letter-spacing:1px;">' +
      overall +
    '</td></tr>' +
    '<tr>' +
      cell('Wins',          totalW, 'RW ' + rw + ' · OTW ' + otw + ' · SOW ' + sow) +
      cell('Reg. Losses',   rl,     ' ') +
      cell('Loser Points',  totalLP, 'OTL ' + otl + ' · SOL ' + sol) +
    '</tr>' +
  '</table>';
}

function renderTotalBar(byOpp) {
  let homeW = 0, awayW = 0, homeL = 0, awayL = 0, homeLP = 0, awayLP = 0, incHome = 0, incAway = 0;
  Object.values(byOpp).forEach(function (games) {
    games.forEach(function (g) {
      if      (g.result === 'W' && g.isHome)                          homeW++;
      else if (g.result === 'W' && !g.isHome)                         awayW++;
      else if (g.result === 'L' && g.isHome  && g.type === 'REG')     homeL++;
      else if (g.result === 'L' && !g.isHome && g.type === 'REG')     awayL++;
      else if (g.result === 'L' && g.isHome)                          homeLP++;
      else if (g.result === 'L' && !g.isHome)                         awayLP++;
      else if (g.result === null && g.isHome)                         incHome++;
      else if (g.result === null && !g.isHome)                        incAway++;
    });
  });

  const s = SCHEMES[COLOR_SCHEME];
  const homeLPbg = s.homeLossOTL || s.homeLossLP || s.homeLossReg;
  const awayLPbg = s.awayLossOTL || s.awayLossLP || s.awayLossReg;
  const groups = [
    { count: homeW,   bg: s.homeWinReg  },
    { count: awayW,   bg: s.awayWinReg  },
    { count: homeL,   bg: s.homeLossReg },
    { count: awayL,   bg: s.awayLossReg },
    { count: homeLP,  bg: homeLPbg      },
    { count: awayLP,  bg: awayLPbg      },
    { count: incHome, bg: s.incHome     },
    { count: incAway, bg: s.incAway     },
  ].filter(gr => gr.count > 0);

  const cells = groups.map(function (gr) {
    const tc = labelTextColor(gr.bg);
    return '<td colspan="' + gr.count + '"' +
      ' style="background:' + gr.bg + ';color:' + tc + ';text-align:center;' +
      'font-weight:bold;font-size:12px;height:26px;vertical-align:middle;">' +
      gr.count + '</td>';
  }).join('');

  return '<table style="width:100%;border-collapse:separate;border-spacing:2px;margin:10px 0 20px;">' +
    '<tr>' + cells + '</tr></table>';
}

function renderLegend() {
  const s = SCHEMES[COLOR_SCHEME];

  function swatchBorder(bg) {
    if (bg.includes('gradient')) return '';
    const r = parseInt(bg.slice(1,3),16), g = parseInt(bg.slice(3,5),16), b = parseInt(bg.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) > 190 ? ' border:1px solid #555;' : '';
  }
  function swatch(bg, label, extra) {
    return '<td style="padding:2px 6px 2px 0;white-space:nowrap;font-size:9pt;vertical-align:middle;">' +
      '<span style="display:inline-block;width:14px;height:14px;background:' + bg + ';' + swatchBorder(bg) + (extra || '') + 'vertical-align:middle;margin-right:4px;"></span>' +
      label + '</td>';
  }

  // OTL/SOL swatches: split if scheme supports it, else combined
  const homeOTLbg = s.homeLossOTL || s.homeLossLP || stripeGrad(s.homeLossReg, s.homeLossStripe);
  const homeSOLbg = s.homeLossSOL || homeOTLbg;
  const awayOTLbg = s.awayLossOTL || s.awayLossLP || stripeGrad(s.awayLossReg, s.awayLossStripe);
  const awaySOLbg = s.awayLossSOL || awayOTLbg;
  // Incomplete swatch: stripe (scheme F) or solid (E/E3)
  const incHomeBg = s.incHomeStripe ? stripeGrad(s.incHome, s.incHomeStripe) : s.incHome;
  const incAwayBg = s.incAwayStripe ? stripeGrad(s.incAway, s.incAwayStripe) : s.incAway;

  return '<table style="margin-bottom:14px;border-collapse:collapse;"><tr>' +
    swatch(s.homeWinReg,  'Home W')    +
    swatch(s.homeWinOT,   'Home W-OT') +
    swatch(s.homeWinSO,   'Home W-SO') +
    swatch(s.awayWinReg,  'Away W')    +
    swatch(s.awayWinOT,   'Away W-OT') +
    swatch(s.awayWinSO,   'Away W-SO') +
    swatch(s.homeWinReg,  'Shutout', 'box-shadow:inset 0 -3px 0 0 #FFD700;') +
    '</tr><tr>' +
    swatch(s.homeLossReg, 'Home L')  +
    swatch(homeOTLbg,     'Home OTL') +
    swatch(homeSOLbg,     'Home SOL') +
    swatch(s.awayLossReg, 'Away L')  +
    swatch(awayOTLbg,     'Away OTL') +
    swatch(awaySOLbg,     'Away SOL') +
    swatch(incHomeBg,     'Inc. home')    +
    swatch(incAwayBg,     'Inc. away')    +
    '</tr></table>';
}

function hatTrickSuffix(goals) {
  if (goals < 3)   return '';
  if (goals === 3) return ' 🧢';
  if (goals === 4) return ' 🧢++';
  if (goals === 5) return ' (🧢++)++';
  if (goals === 6) return ' 🧢🧢';
  return ' 🧢🧢++!?!?!? (how are you seeing this!?)';
}


// --- Tooltip ---

var _seriesExpandedCell = null;
var _seriesBsCache      = {};
var _seriesPbpCache     = {};

function showSeriesTooltip(el, e) {
  if (_seriesExpandedCell && _seriesExpandedCell !== el) return;
  const tt     = document.getElementById('series-tt');
  const opp    = el.dataset.opp;
  const isHome = el.dataset.home === '1';
  const result = el.dataset.result;
  const type   = el.dataset.type;
  const nyi    = el.dataset.nyi;
  const osc    = el.dataset.oppscore;
  const date   = el.dataset.date;

  document.getElementById('series-tt-match').textContent = (isHome ? 'NYI vs ' : 'NYI @ ') + (TEAM_NAMES[opp] || opp);
  document.getElementById('series-tt-date').textContent  = fmtSeriesDate(date);

  let scoreText = '';
  if (result) {
    scoreText = 'NYI ' + nyi + ' – ' + opp + ' ' + osc;
    if (type && type !== 'REG') scoreText += ' (' + type + ')';
  }
  document.getElementById('series-tt-score').textContent = scoreText;

  const shutoutEl = document.getElementById('series-tt-shutout');
  shutoutEl.style.display = el.dataset.shutout === '1' ? 'block' : 'none';

  tt.style.display = 'block';
  if (!_seriesExpandedCell) moveSeriesTooltip(e);
}

function moveSeriesTooltip(e) {
  if (_seriesExpandedCell) return;
  const tt = document.getElementById('series-tt');
  tt.style.left = '-9999px';
  tt.style.top  = '-9999px';
  tt.style.display = 'block';
  const ttW = tt.offsetWidth;
  const ttH = tt.offsetHeight;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const x = (e.clientX + 14 + ttW > vw)  ? e.clientX - 14 - ttW : e.clientX + 14;
  const y = (e.clientY + 14 + ttH > vh)  ? e.clientY - 14 - ttH : e.clientY + 14;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}

function clampSeriesTooltip() {
  const tt  = document.getElementById('series-tt');
  const vh  = window.innerHeight;
  const vw  = window.innerWidth;
  const top  = parseInt(tt.style.top,  10) || 0;
  const left = parseInt(tt.style.left, 10) || 0;
  const h   = tt.offsetHeight;
  const w   = tt.offsetWidth;
  if (top  + h > vh) tt.style.top  = Math.max(0, vh - h - 4) + 'px';
  if (left + w > vw) tt.style.left = Math.max(0, vw - w - 4) + 'px';
}

function hideSeriesTooltip() {
  if (_seriesExpandedCell) return;
  document.getElementById('series-tt').style.display = 'none';
}

// --- Click-to-expand tooltip ---

function jafares(name) {
  return name ? name.replace(/John Tavares/gi, Math.random() < 0.5 ? '🐍' : 'Jafares') : name;
}

async function toggleSeriesExpand(el, event) {
  event.stopPropagation();
  const expandEl = document.getElementById('series-tt-expand');

  if (_seriesExpandedCell === el) {
    // Collapse
    el.style.outline = '';
    _seriesExpandedCell = null;
    expandEl.style.display = 'none';
    expandEl.innerHTML = '';
    document.getElementById('series-tt').style.display = 'none';
    return;
  }

  // Collapse any previous pinned cell
  if (_seriesExpandedCell) {
    _seriesExpandedCell.style.outline = '';
    expandEl.style.display = 'none';
    expandEl.innerHTML = '';
  }

  // Show base tooltip (temporarily unpin so showSeriesTooltip proceeds)
  _seriesExpandedCell = null;
  showSeriesTooltip(el, event);
  _seriesExpandedCell = el;
  el.style.outline = '2px solid #FFD700';

  if (!el.dataset.result) {
    expandEl.innerHTML = '<div style="color:#666;font-style:italic;font-size:9pt;margin-top:6px;">Game not yet played.</div>';
    expandEl.style.display = 'block';
    clampSeriesTooltip();
    return;
  }

  const gameId = el.dataset.gameid;
  if (!gameId) { expandEl.style.display = 'none'; return; }

  expandEl.innerHTML = '<div style="color:#888;font-size:9pt;margin-top:6px;">Loading stats...</div>';
  expandEl.style.display = 'block';

  try {
    const fetches = [];
    if (!_seriesBsCache[gameId]) {
      fetches.push(
        fetch(WORKER + '/v1/gamecenter/' + gameId + '/boxscore').then(function (r) { return r.json(); }).then(function (d) { _seriesBsCache[gameId] = d; })
      );
    }
    if (!_seriesPbpCache[gameId]) {
      fetches.push(
        fetch(WORKER + '/v1/gamecenter/' + gameId + '/play-by-play').then(function (r) { return r.json(); }).then(function (d) { _seriesPbpCache[gameId] = d; }).catch(function () { _seriesPbpCache[gameId] = null; })
      );
    }
    await Promise.all(fetches);

    const gameType   = el.dataset.type;
    const nyiShutout = el.dataset.shutout === '1' && el.dataset.result === 'W';
    expandEl.innerHTML = buildSeriesExpandHTML(
      _seriesBsCache[gameId],
      _seriesPbpCache[gameId] || null,
      el.dataset.home === '1',
      gameType,
      nyiShutout
    );
    expandEl.style.display = 'block';
    clampSeriesTooltip();
  } catch (err) {
    expandEl.innerHTML = '<div style="color:#f66;font-size:9pt;margin-top:6px;">Could not load stats.</div>';
  }
}

function buildSeriesExpandHTML(bs, pbp, isNYIHome, gameType, nyiShutout) {
  const nyiStats = isNYIHome
    ? (bs.playerByGameStats || {}).homeTeam
    : (bs.playerByGameStats || {}).awayTeam;
  if (!nyiStats) return '<div style="color:#666;font-size:9pt;margin-top:6px;">No stats available.</div>';

  // Build roster map from play-by-play for OT/SO player name lookups
  var rosterMap = {};
  ((pbp || {}).rosterSpots || []).forEach(function (p) {
    var first = (p.firstName && p.firstName.default) || '';
    var last  = (p.lastName  && p.lastName.default)  || '';
    rosterMap[p.playerId] = (first + ' ' + last).trim();
  });

  // Find OT winner player ID
  var otWinnerPlayerId = null;
  if (gameType === 'OT' && pbp && pbp.plays) {
    var otGoals = pbp.plays.filter(function (p) {
      var pd = p.periodDescriptor || {};
      return p.typeDescKey === 'goal' && (pd.periodType === 'OT' || (pd.number || 0) > 3);
    });
    if (otGoals.length > 0) {
      otWinnerPlayerId = (otGoals[otGoals.length - 1].details || {}).scoringPlayerId;
    }
  }

  // Find NYI shootout scorers
  var nyiSOScorers = [];
  if (gameType === 'SO' && pbp && pbp.plays) {
    var homeId = (bs.homeTeam || {}).id;
    pbp.plays.forEach(function (p) {
      var pd = p.periodDescriptor || {};
      if (p.typeDescKey !== 'goal' || pd.periodType !== 'SO') return;
      var d = p.details || {};
      var nyiScored = isNYIHome ? (d.eventOwnerTeamId === homeId) : (d.eventOwnerTeamId !== homeId);
      if (nyiScored) nyiSOScorers.push(rosterMap[d.scoringPlayerId] || '?');
    });
  }

  const skaters = (nyiStats.forwards || []).concat(nyiStats.defense || []);
  const scorers = skaters
    .filter(function (p) { return ((p.goals || 0) + (p.assists || 0)) > 0; })
    .sort(function (a, b) {
      if ((b.goals || 0) !== (a.goals || 0)) return (b.goals || 0) - (a.goals || 0);
      return ((b.goals || 0) + (b.assists || 0)) - ((a.goals || 0) + (a.assists || 0));
    });

  const goalies = (nyiStats.goalies || []).filter(function (g) { return (g.shotsAgainst || 0) > 0; });

  // Primary goalie = most shots against (for shutout gold highlight)
  var primaryGoalieId = null;
  if (goalies.length > 0) {
    var topG = goalies.slice().sort(function (a, b) { return (b.shotsAgainst || 0) - (a.shotsAgainst || 0); });
    primaryGoalieId = topG[0].playerId;
  }

  let html = '<div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;">';

  if (scorers.length === 0) {
    html += '<div style="font-size:9pt;color:#888;font-style:italic;">No NYI points</div>';
  } else {
    html += scorers.map(function (p) {
      const name  = jafares((p.name && p.name.default) || '?');
      const g     = p.goals   || 0;
      const a     = p.assists || 0;
      const isOTW = otWinnerPlayerId !== null && p.playerId === otWinnerPlayerId;
      const parts = [];
      if (isOTW) parts.push('OTW');
      parts.push(g + 'G');
      parts.push(a + 'A');
      const nameStyle = isOTW || g >= 3 ? 'color:#FFD700;font-weight:bold;' : '';
      return '<div style="font-size:9pt;">' +
        '<span style="' + nameStyle + '">' + name + hatTrickSuffix(g) + '</span>' +
        ' <span style="color:#aaa;">(' + parts.join(', ') + ')</span></div>';
    }).join('');
  }

  if (goalies.length > 0) {
    html += '<div style="margin-top:6px;border-top:1px solid #222;padding-top:4px;">';
    html += goalies.map(function (g) {
      const name            = jafares((g.name && g.name.default) || '?');
      const ga              = g.goalsAgainst !== undefined ? g.goalsAgainst : '?';
      const sa              = g.shotsAgainst !== undefined ? g.shotsAgainst : '?';
      const isShutoutGoalie = nyiShutout && g.playerId === primaryGoalieId;
      const nameStyle       = isShutoutGoalie ? 'color:#FFD700;font-weight:bold;' : '';
      return '<div style="font-size:9pt;">' +
        '<span style="' + nameStyle + '">' + name + '</span>' +
        ' <span style="color:#aaa;">(' + ga + 'GA / ' + sa + 'SA)</span></div>';
    }).join('');
    html += '</div>';
  }

  if (nyiSOScorers.length > 0) {
    html += '<div style="margin-top:6px;border-top:1px solid #222;padding-top:4px;">';
    html += '<div style="font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px;">Shootout</div>';
    html += nyiSOScorers.map(function (name) {
      return '<div style="font-size:9pt;">' + jafares(name) + ' &#10004;</div>';
    }).join('');
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// Collapse pinned tooltip when clicking anywhere outside a game cell
document.addEventListener('click', function () {
  if (_seriesExpandedCell) {
    _seriesExpandedCell.style.outline = '';
    _seriesExpandedCell = null;
    const expandEl = document.getElementById('series-tt-expand');
    expandEl.style.display = 'none';
    expandEl.innerHTML = '';
    document.getElementById('series-tt').style.display = 'none';
  }
});

// --- Init ---

async function loadSeriesData() {
  try {
    const [schedRes, standRes] = await Promise.all([
      fetch(WORKER + '/v1/club-schedule-season/NYI/20252026'),
      fetch(WORKER + '/v1/standings/now')
    ]);
    const schedData = await schedRes.json();
    const standData = await standRes.json();

    const byOpp = processGames(schedData.games || []);

    const teamStandings = {};
    (standData.standings || []).forEach(function (t) {
      teamStandings[t.teamAbbrev.default] = {
        wins:              t.wins,
        losses:            t.losses,
        otLosses:          t.otLosses,
        divisionSequence:  t.divisionSequence
      };
    });

    const groupBy = () => document.querySelector('input[name="groupby"]:checked').value;
    const sortBy  = () => document.querySelector('input[name="sortby"]:checked').value;

    document.getElementById('record-summary').innerHTML = renderRecordSummary(byOpp);
    document.getElementById('legend').innerHTML = renderLegend();

    function refresh() {
      document.getElementById('total-bar').innerHTML = renderTotalBar(byOpp);
      document.getElementById('col-left').innerHTML  =
        renderDivisionSection(DIVISIONS[0], byOpp, groupBy(), teamStandings, sortBy(), DIVISIONS[2].teams.length) +
        renderDivisionSection(DIVISIONS[1], byOpp, groupBy(), teamStandings, sortBy());
      document.getElementById('col-right').innerHTML =
        renderDivisionSection(DIVISIONS[2], byOpp, groupBy(), teamStandings, sortBy()) +
        renderDivisionSection(DIVISIONS[3], byOpp, groupBy(), teamStandings, sortBy());
    }

    refresh();

    document.querySelectorAll('input[name="groupby"], input[name="sortby"]').forEach(function (radio) {
      radio.addEventListener('change', refresh);
    });

  } catch (err) {
    console.error('Failed to load series data:', err);
    document.getElementById('col-left').innerHTML = '<p>Could not load schedule data.</p>';
  }
}

loadSeriesData();
