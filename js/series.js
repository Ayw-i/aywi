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
    homeLossReg: '#333333', homeLossLP: '#F2F2F2',
    awayLossReg: '#191919', awayLossLP: '#D8D8D8',
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

// Order of segments within the bar in "result" group mode
const RESULT_ORDER = [
  g => g.result === 'W' && g.isHome  && g.type === 'REG',
  g => g.result === 'W' && g.isHome  && g.type === 'OT',
  g => g.result === 'W' && g.isHome  && g.type === 'SO',
  g => g.result === 'W' && !g.isHome && g.type === 'REG',
  g => g.result === 'W' && !g.isHome && g.type === 'OT',
  g => g.result === 'W' && !g.isHome && g.type === 'SO',
  g => g.result === 'L' && g.isHome  && g.type === 'REG',
  g => g.result === 'L' && g.isHome  && g.type === 'OT',
  g => g.result === 'L' && g.isHome  && g.type === 'SO',
  g => g.result === 'L' && !g.isHome && g.type === 'REG',
  g => g.result === 'L' && !g.isHome && g.type === 'OT',
  g => g.result === 'L' && !g.isHome && g.type === 'SO',
  g => g.result === null && g.isHome,
  g => g.result === null && !g.isHome
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
  // OT/SO loss (loser point): solid light (scheme F) or diagonal stripe (schemes E/E3)
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

    const game = { opponent: oppAbbrev, date: g.gameDate, isHome, result: null, type: null, nyiScore: null, oppScore: null };

    if (isDone) {
      const nyiScore = isHome ? g.homeTeam.score : g.awayTeam.score;
      const oppScore = isHome ? g.awayTeam.score : g.homeTeam.score;
      game.result    = nyiScore > oppScore ? 'W' : 'L';
      game.type      = (g.gameOutcome && g.gameOutcome.lastPeriodType) || 'REG';
      game.nyiScore  = nyiScore;
      game.oppScore  = oppScore;
      game.isShutout = game.result === 'W' && oppScore === 0;
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
  const extra   = g.isShutout ? 'box-shadow:inset 0 0 0 2px #FFD700;' : '';
  return '<td' +
    ' data-opp="'      + opp                      + '"' +
    ' data-home="'     + (g.isHome ? '1' : '0')   + '"' +
    ' data-result="'   + (g.result || '')          + '"' +
    ' data-type="'     + (g.type   || '')          + '"' +
    ' data-nyi="'      + nyi                       + '"' +
    ' data-oppscore="' + osc                       + '"' +
    ' data-date="'     + g.date                    + '"' +
    ' data-shutout="'  + shutout                   + '"' +
    ' style="background:' + bg + ';width:26px;height:15px;cursor:pointer;' + extra + '"' +
    ' onmouseover="showSeriesTooltip(this,event)"' +
    ' onmousemove="moveSeriesTooltip(event)"' +
    ' onmouseout="hideSeriesTooltip()"' +
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
    const groups = [
      { list: games.filter(g => g.result === 'W' && g.isHome),   bg: s.homeWinReg  },
      { list: games.filter(g => g.result === 'W' && !g.isHome),  bg: s.awayWinReg  },
      { list: games.filter(g => g.result === 'L' && g.isHome),   bg: s.homeLossReg },
      { list: games.filter(g => g.result === 'L' && !g.isHome),  bg: s.awayLossReg },
      { list: games.filter(g => g.result === null && g.isHome),  bg: s.incHome     },
      { list: games.filter(g => g.result === null && !g.isHome), bg: s.incAway     },
    ].filter(gr => gr.list.length > 0);

    const labelCells = groups.map(function (gr) {
      const tc = labelTextColor(gr.bg);
      return '<td colspan="' + gr.list.length + '"' +
        ' style="background:' + gr.bg + ';color:' + tc + ';text-align:center;' +
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
  const overall = totalW + '\u2013' + rl + '\u2013' + totalLP;

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
      cell('Wins',          totalW, 'RW\u00a0' + rw + '\u00a0\u00b7\u00a0OTW\u00a0' + otw + '\u00a0\u00b7\u00a0SOW\u00a0' + sow) +
      cell('Reg. Losses',   rl,     '\u00a0') +
      cell('Loser Points',  totalLP, 'OTL\u00a0' + otl + '\u00a0\u00b7\u00a0SOL\u00a0' + sol) +
    '</tr>' +
  '</table>';
}

function renderTotalBar(byOpp) {
  let homeW = 0, awayW = 0, homeL = 0, awayL = 0, incHome = 0, incAway = 0;
  Object.values(byOpp).forEach(function (games) {
    games.forEach(function (g) {
      if      (g.result === 'W' && g.isHome)   homeW++;
      else if (g.result === 'W' && !g.isHome)  awayW++;
      else if (g.result === 'L' && g.isHome)   homeL++;
      else if (g.result === 'L' && !g.isHome)  awayL++;
      else if (g.result === null && g.isHome)  incHome++;
      else if (g.result === null && !g.isHome) incAway++;
    });
  });

  const s = SCHEMES[COLOR_SCHEME];
  const groups = [
    { count: homeW,   bg: s.homeWinReg  },
    { count: awayW,   bg: s.awayWinReg  },
    { count: homeL,   bg: s.homeLossReg },
    { count: awayL,   bg: s.awayLossReg },
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

  // OTL/SOL swatch: solid light (scheme F) or stripe (E/E3)
  const homeLPbg = s.homeLossLP || stripeGrad(s.homeLossReg, s.homeLossStripe);
  const awayLPbg = s.awayLossLP || stripeGrad(s.awayLossReg, s.awayLossStripe);
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
    swatch(s.homeWinReg,  'Shutout', 'box-shadow:inset 0 0 0 2px #FFD700;') +
    '</tr><tr>' +
    swatch(s.homeLossReg, 'Home L (reg)')  +
    swatch(homeLPbg,      'Home OTL/SOL') +
    swatch(s.awayLossReg, 'Away L (reg)')  +
    swatch(awayLPbg,      'Away OTL/SOL') +
    swatch(incHomeBg,     'Inc. home')    +
    swatch(incAwayBg,     'Inc. away')    +
    '</tr></table>';
}

// --- Tooltip ---

function showSeriesTooltip(el, e) {
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
    scoreText = 'NYI ' + nyi + ' \u2013 ' + opp + ' ' + osc;
    if (type && type !== 'REG') scoreText += ' (' + type + ')';
  }
  document.getElementById('series-tt-score').textContent = scoreText;

  const shutoutEl = document.getElementById('series-tt-shutout');
  if (el.dataset.shutout === '1') {
    shutoutEl.style.display = 'block';
  } else {
    shutoutEl.style.display = 'none';
  }

  tt.style.display = 'block';
  moveSeriesTooltip(e);
}

function moveSeriesTooltip(e) {
  const tt = document.getElementById('series-tt');
  tt.style.left = (e.clientX + 14) + 'px';
  tt.style.top  = (e.clientY + 14) + 'px';
}

function hideSeriesTooltip() {
  document.getElementById('series-tt').style.display = 'none';
}

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
