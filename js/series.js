'use strict';

const WORKER = 'https://nhl-proxy.aywi.workers.dev';

// Switch between 'E' (grey losses) and 'E3' (olive/brown losses)
const COLOR_SCHEME = 'E';

const SCHEMES = {
  E: {
    homeWinReg: '#0047AB', homeWinOT: '#4D90E0', homeWinSO: '#99C4F0',
    awayWinReg: '#CC5500', awayWinOT: '#FF8C00', awayWinSO: '#FFBB66',
    homeLossReg: '#DADADA', homeLossOT: '#CACACA', homeLossSO: '#BBBBBB',
    awayLossReg: '#B0B0B0', awayLossOT: '#A4A4A4', awayLossSO: '#989898',
    incHome: '#606060', incAway: '#404040'
  },
  E3: {
    homeWinReg: '#0047AB', homeWinOT: '#4D90E0', homeWinSO: '#99C4F0',
    awayWinReg: '#CC5500', awayWinOT: '#FF8C00', awayWinSO: '#FFBB66',
    homeLossReg: '#5C4A1E', homeLossOT: '#7A6430', homeLossSO: '#9E8450',
    awayLossReg: '#7A7040', awayLossOT: '#9A9058', awayLossSO: '#BAB078',
    incHome: '#606060', incAway: '#404040'
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

function gameColor(game) {
  const s = SCHEMES[COLOR_SCHEME];
  if (game.result === null) return game.isHome ? s.incHome : s.incAway;
  const t = game.type;
  if (game.result === 'W') {
    if (game.isHome) return t === 'REG' ? s.homeWinReg : t === 'OT' ? s.homeWinOT : s.homeWinSO;
    return t === 'REG' ? s.awayWinReg : t === 'OT' ? s.awayWinOT : s.awayWinSO;
  } else {
    if (game.isHome) return t === 'REG' ? s.homeLossReg : t === 'OT' ? s.homeLossOT : s.homeLossSO;
    return t === 'REG' ? s.awayLossReg : t === 'OT' ? s.awayLossOT : s.awayLossSO;
  }
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
      game.result   = nyiScore > oppScore ? 'W' : 'L';
      game.type     = (g.gameOutcome && g.gameOutcome.lastPeriodType) || 'REG';
      game.nyiScore = nyiScore;
      game.oppScore = oppScore;
    }

    byOpp[oppAbbrev].push(game);
  });
  return byOpp;
}

// --- Bar rendering ---

function renderGameCell(g) {
  const bg   = gameColor(g);
  const opp  = g.opponent;
  const nyi  = g.nyiScore !== null ? g.nyiScore : '';
  const osc  = g.oppScore !== null ? g.oppScore : '';
  return '<td' +
    ' data-opp="'      + opp                      + '"' +
    ' data-home="'     + (g.isHome ? '1' : '0')   + '"' +
    ' data-result="'   + (g.result || '')          + '"' +
    ' data-type="'     + (g.type   || '')          + '"' +
    ' data-nyi="'      + nyi                       + '"' +
    ' data-oppscore="' + osc                       + '"' +
    ' data-date="'     + g.date                    + '"' +
    ' style="background:' + bg + ';width:26px;height:15px;cursor:pointer;"' +
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
        '<td style="vertical-align:middle;color:#444;font-size:9pt;padding-left:4px;height:44px;padding-bottom:3px;">—</td>' +
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
  for (let i = 0; i < pad; i++) {
    rows += '<tr><td colspan="2" style="height:40px;"></td></tr>';
  }

  return '<p style="font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin:18px 0 4px 0;">' +
    div.name + '</p>' +
    '<table style="border-collapse:collapse;">' + rows + '</table>';
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
  function swatch(bg, label) {
    const border = bg === '#DADADA' || bg === '#CACACA' || bg === '#BBBBBB' ? ' border:1px solid #555;' : '';
    return '<td style="padding:2px 6px 2px 0;white-space:nowrap;font-size:9pt;vertical-align:middle;">' +
      '<span style="display:inline-block;width:14px;height:14px;background:' + bg + ';' + border + 'vertical-align:middle;margin-right:4px;"></span>' +
      label + '</td>';
  }

  return '<table style="margin-bottom:14px;border-collapse:collapse;"><tr>' +
    swatch(s.homeWinReg,  'Home W')    +
    swatch(s.homeWinOT,   'Home W-OT') +
    swatch(s.homeWinSO,   'Home W-SO') +
    swatch(s.awayWinReg,  'Away W')    +
    swatch(s.awayWinOT,   'Away W-OT') +
    swatch(s.awayWinSO,   'Away W-SO') +
    '</tr><tr>' +
    swatch(s.homeLossReg, 'Home L')    +
    swatch(s.homeLossOT,  'Home L-OT') +
    swatch(s.homeLossSO,  'Home L-SO') +
    swatch(s.awayLossReg, 'Away L')    +
    swatch(s.awayLossOT,  'Away L-OT') +
    swatch(s.awayLossSO,  'Away L-SO') +
    '</tr><tr>' +
    swatch(s.incHome, 'Inc. home') +
    swatch(s.incAway, 'Inc. away') +
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
