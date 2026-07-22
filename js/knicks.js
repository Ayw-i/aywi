// Knicks page — fully hardcoded 2025-26 NBA playoffs bracket.
// Exception page: no API calls, no live data, structured to mirror playoffs.js's
// bracket rendering (series cards, game-result cell strips) but with static data.

var KNICKS_SEEDS = {
  DET: 1, BOS: 2, NYK: 3, CLE: 4, TOR: 5, ATL: 6, PHI: 7, ORL: 8,
  OKC: 1, SAS: 2, DEN: 3, LAL: 4, HOU: 5, MIN: 6, POR: 7, PHX: 8,
};

var KNICKS_NAMES = {
  DET: 'Pistons', BOS: 'Celtics', NYK: 'Knicks', CLE: 'Cavaliers',
  TOR: 'Raptors', ATL: 'Hawks', PHI: '76ers', ORL: 'Magic',
  OKC: 'Thunder', SAS: 'Spurs', DEN: 'Nuggets', LAL: 'Lakers',
  HOU: 'Rockets', MIN: 'Timberwolves', POR: 'Trail Blazers', PHX: 'Suns',
};

var KNICKS_COLORS = {
  DET: { primary: '#C8102E', secondary: '#1D42BA' },
  ORL: { primary: '#0077C0', secondary: '#C4CED4' },
  BOS: { primary: '#007A33', secondary: '#BA9653' },
  PHI: { primary: '#006BB6', secondary: '#ED174C' },
  NYK: { primary: '#006BB6', secondary: '#F58426' },
  ATL: { primary: '#E03A3E', secondary: '#C1D32F' },
  CLE: { primary: '#860038', secondary: '#FDBB30' },
  TOR: { primary: '#CE1141', secondary: '#000000' },
  OKC: { primary: '#007AC1', secondary: '#EF3B24' },
  PHX: { primary: '#1D1160', secondary: '#E56020' },
  SAS: { primary: '#C4CED4', secondary: '#000000' },
  POR: { primary: '#E03A3E', secondary: '#000000' },
  DEN: { primary: '#0E2240', secondary: '#FEC524' },
  MIN: { primary: '#0C2340', secondary: '#78BE20' },
  LAL: { primary: '#552583', secondary: '#FDB927' },
  HOU: { primary: '#CE1141', secondary: '#000000' },
};

var KNICKS_ESPN_ABBR = {
  DET: 'det', ORL: 'orl', BOS: 'bos', PHI: 'phi', NYK: 'nyk', ATL: 'atl',
  CLE: 'cle', TOR: 'tor', OKC: 'okc', PHX: 'phx', SAS: 'sa', POR: 'por',
  DEN: 'den', MIN: 'min', LAL: 'lal', HOU: 'hou',
};

function knicksLogoURL(abbrev) {
  return 'https://a.espncdn.com/i/teamlogos/nba/500/' + KNICKS_ESPN_ABBR[abbrev] + '.png';
}

// Each series: top = higher (lower-numbered) seed. Games listed chronologically.
var KNICKS_SERIES = [
  // --- Eastern Conference, First Round ---
  { conf: 'east', round: 'r1', top: 'DET', bottom: 'ORL', topWins: 4, bottomWins: 3, games: [
    { date: 'Apr 19', home: 'DET', away: 'ORL', homeScore: 101, awayScore: 112 },
    { date: 'Apr 22', home: 'DET', away: 'ORL', homeScore: 98,  awayScore: 83  },
    { date: 'Apr 25', home: 'ORL', away: 'DET', homeScore: 113, awayScore: 105 },
    { date: 'Apr 27', home: 'ORL', away: 'DET', homeScore: 94,  awayScore: 88  },
    { date: 'Apr 29', home: 'DET', away: 'ORL', homeScore: 116, awayScore: 109 },
    { date: 'May 1',  home: 'ORL', away: 'DET', homeScore: 79,  awayScore: 93  },
    { date: 'May 3',  home: 'DET', away: 'ORL', homeScore: 116, awayScore: 94  },
  ]},
  { conf: 'east', round: 'r1', top: 'BOS', bottom: 'PHI', topWins: 3, bottomWins: 4, games: [
    { date: 'Apr 19', home: 'BOS', away: 'PHI', homeScore: 123, awayScore: 91  },
    { date: 'Apr 21', home: 'BOS', away: 'PHI', homeScore: 97,  awayScore: 111 },
    { date: 'Apr 24', home: 'PHI', away: 'BOS', homeScore: 100, awayScore: 108 },
    { date: 'Apr 26', home: 'PHI', away: 'BOS', homeScore: 96,  awayScore: 128 },
    { date: 'Apr 28', home: 'BOS', away: 'PHI', homeScore: 97,  awayScore: 113 },
    { date: 'Apr 30', home: 'PHI', away: 'BOS', homeScore: 106, awayScore: 93  },
    { date: 'May 2',  home: 'BOS', away: 'PHI', homeScore: 100, awayScore: 109 },
  ]},
  { conf: 'east', round: 'r1', top: 'NYK', bottom: 'ATL', topWins: 4, bottomWins: 2, games: [
    { date: 'Apr 18', home: 'NYK', away: 'ATL', homeScore: 113, awayScore: 102 },
    { date: 'Apr 20', home: 'NYK', away: 'ATL', homeScore: 106, awayScore: 107 },
    { date: 'Apr 23', home: 'ATL', away: 'NYK', homeScore: 109, awayScore: 108 },
    { date: 'Apr 25', home: 'ATL', away: 'NYK', homeScore: 98,  awayScore: 114 },
    { date: 'Apr 28', home: 'NYK', away: 'ATL', homeScore: 126, awayScore: 97  },
    { date: 'Apr 30', home: 'ATL', away: 'NYK', homeScore: 89,  awayScore: 140 },
  ]},
  { conf: 'east', round: 'r1', top: 'CLE', bottom: 'TOR', topWins: 4, bottomWins: 3, games: [
    { date: 'Apr 18', home: 'CLE', away: 'TOR', homeScore: 126, awayScore: 113 },
    { date: 'Apr 20', home: 'CLE', away: 'TOR', homeScore: 115, awayScore: 105 },
    { date: 'Apr 23', home: 'TOR', away: 'CLE', homeScore: 126, awayScore: 104 },
    { date: 'Apr 26', home: 'TOR', away: 'CLE', homeScore: 93,  awayScore: 89  },
    { date: 'Apr 29', home: 'CLE', away: 'TOR', homeScore: 125, awayScore: 120 },
    { date: 'May 1',  home: 'TOR', away: 'CLE', homeScore: 112, awayScore: 110, ot: true },
    { date: 'May 3',  home: 'CLE', away: 'TOR', homeScore: 114, awayScore: 102 },
  ]},

  // --- Eastern Conference, Semifinals ---
  { conf: 'east', round: 'r2', top: 'DET', bottom: 'CLE', topWins: 3, bottomWins: 4, games: [
    { date: 'May 5',  home: 'DET', away: 'CLE', homeScore: 111, awayScore: 101 },
    { date: 'May 7',  home: 'DET', away: 'CLE', homeScore: 107, awayScore: 97  },
    { date: 'May 9',  home: 'CLE', away: 'DET', homeScore: 116, awayScore: 109 },
    { date: 'May 11', home: 'CLE', away: 'DET', homeScore: 112, awayScore: 103 },
    { date: 'May 13', home: 'DET', away: 'CLE', homeScore: 113, awayScore: 117, ot: true },
    { date: 'May 15', home: 'CLE', away: 'DET', homeScore: 94,  awayScore: 115 },
    { date: 'May 17', home: 'DET', away: 'CLE', homeScore: 94,  awayScore: 125 },
  ]},
  { conf: 'east', round: 'r2', top: 'NYK', bottom: 'PHI', topWins: 4, bottomWins: 0, games: [
    { date: 'May 4',  home: 'NYK', away: 'PHI', homeScore: 137, awayScore: 98  },
    { date: 'May 6',  home: 'NYK', away: 'PHI', homeScore: 108, awayScore: 102 },
    { date: 'May 8',  home: 'PHI', away: 'NYK', homeScore: 94,  awayScore: 108 },
    { date: 'May 10', home: 'PHI', away: 'NYK', homeScore: 114, awayScore: 144 },
  ]},

  // --- Eastern Conference Finals ---
  { conf: 'east', round: 'cf', top: 'NYK', bottom: 'CLE', topWins: 4, bottomWins: 0, games: [
    { date: 'May 19', home: 'NYK', away: 'CLE', homeScore: 115, awayScore: 104, ot: true },
    { date: 'May 21', home: 'NYK', away: 'CLE', homeScore: 109, awayScore: 93  },
    { date: 'May 23', home: 'CLE', away: 'NYK', homeScore: 108, awayScore: 121 },
    { date: 'May 25', home: 'CLE', away: 'NYK', homeScore: 93,  awayScore: 130 },
  ]},

  // --- Western Conference, First Round ---
  { conf: 'west', round: 'r1', top: 'OKC', bottom: 'PHX', topWins: 4, bottomWins: 0, games: [
    { date: 'Apr 19', home: 'OKC', away: 'PHX', homeScore: 119, awayScore: 84  },
    { date: 'Apr 22', home: 'OKC', away: 'PHX', homeScore: 120, awayScore: 107 },
    { date: 'Apr 25', home: 'PHX', away: 'OKC', homeScore: 109, awayScore: 121 },
    { date: 'Apr 27', home: 'PHX', away: 'OKC', homeScore: 122, awayScore: 131 },
  ]},
  { conf: 'west', round: 'r1', top: 'SAS', bottom: 'POR', topWins: 4, bottomWins: 1, games: [
    { date: 'Apr 19', home: 'SAS', away: 'POR', homeScore: 111, awayScore: 98  },
    { date: 'Apr 21', home: 'SAS', away: 'POR', homeScore: 103, awayScore: 106 },
    { date: 'Apr 24', home: 'POR', away: 'SAS', homeScore: 108, awayScore: 120 },
    { date: 'Apr 26', home: 'POR', away: 'SAS', homeScore: 93,  awayScore: 114 },
    { date: 'Apr 28', home: 'SAS', away: 'POR', homeScore: 114, awayScore: 95  },
  ]},
  { conf: 'west', round: 'r1', top: 'DEN', bottom: 'MIN', topWins: 2, bottomWins: 4, games: [
    { date: 'Apr 18', home: 'DEN', away: 'MIN', homeScore: 116, awayScore: 105 },
    { date: 'Apr 20', home: 'DEN', away: 'MIN', homeScore: 114, awayScore: 119 },
    { date: 'Apr 23', home: 'MIN', away: 'DEN', homeScore: 113, awayScore: 96  },
    { date: 'Apr 25', home: 'MIN', away: 'DEN', homeScore: 112, awayScore: 96  },
    { date: 'Apr 27', home: 'DEN', away: 'MIN', homeScore: 125, awayScore: 113 },
    { date: 'Apr 30', home: 'MIN', away: 'DEN', homeScore: 110, awayScore: 98  },
  ]},
  { conf: 'west', round: 'r1', top: 'LAL', bottom: 'HOU', topWins: 4, bottomWins: 2, games: [
    { date: 'Apr 18', home: 'LAL', away: 'HOU', homeScore: 107, awayScore: 98  },
    { date: 'Apr 21', home: 'LAL', away: 'HOU', homeScore: 101, awayScore: 94  },
    { date: 'Apr 24', home: 'HOU', away: 'LAL', homeScore: 108, awayScore: 112, ot: true },
    { date: 'Apr 26', home: 'HOU', away: 'LAL', homeScore: 115, awayScore: 96  },
    { date: 'Apr 29', home: 'LAL', away: 'HOU', homeScore: 93,  awayScore: 99  },
    { date: 'May 1',  home: 'HOU', away: 'LAL', homeScore: 78,  awayScore: 98  },
  ]},

  // --- Western Conference, Semifinals ---
  { conf: 'west', round: 'r2', top: 'OKC', bottom: 'LAL', topWins: 4, bottomWins: 0, games: [
    { date: 'May 5',  home: 'OKC', away: 'LAL', homeScore: 108, awayScore: 90  },
    { date: 'May 7',  home: 'OKC', away: 'LAL', homeScore: 125, awayScore: 107 },
    { date: 'May 9',  home: 'LAL', away: 'OKC', homeScore: 108, awayScore: 131 },
    { date: 'May 11', home: 'LAL', away: 'OKC', homeScore: 110, awayScore: 115 },
  ]},
  { conf: 'west', round: 'r2', top: 'SAS', bottom: 'MIN', topWins: 4, bottomWins: 2, games: [
    { date: 'May 4',  home: 'SAS', away: 'MIN', homeScore: 102, awayScore: 104 },
    { date: 'May 6',  home: 'SAS', away: 'MIN', homeScore: 133, awayScore: 95  },
    { date: 'May 8',  home: 'MIN', away: 'SAS', homeScore: 108, awayScore: 115 },
    { date: 'May 10', home: 'MIN', away: 'SAS', homeScore: 114, awayScore: 109 },
    { date: 'May 12', home: 'SAS', away: 'MIN', homeScore: 126, awayScore: 97  },
    { date: 'May 15', home: 'MIN', away: 'SAS', homeScore: 109, awayScore: 139 },
  ]},

  // --- Western Conference Finals ---
  { conf: 'west', round: 'cf', top: 'OKC', bottom: 'SAS', topWins: 3, bottomWins: 4, games: [
    { date: 'May 18', home: 'OKC', away: 'SAS', homeScore: 115, awayScore: 122, ot: true },
    { date: 'May 20', home: 'OKC', away: 'SAS', homeScore: 122, awayScore: 113 },
    { date: 'May 22', home: 'SAS', away: 'OKC', homeScore: 108, awayScore: 123 },
    { date: 'May 24', home: 'SAS', away: 'OKC', homeScore: 103, awayScore: 82  },
    { date: 'May 26', home: 'OKC', away: 'SAS', homeScore: 127, awayScore: 114 },
    { date: 'May 28', home: 'SAS', away: 'OKC', homeScore: 118, awayScore: 91  },
    { date: 'May 30', home: 'OKC', away: 'SAS', homeScore: 103, awayScore: 111 },
  ]},
];

// NBA Finals kept separate — rendered in its own section, like the Stanley Cup Final.
var KNICKS_FINALS = {
  top: 'NYK', bottom: 'SAS', topWins: 4, bottomWins: 1, games: [
    { date: 'Jun 3',  home: 'SAS', away: 'NYK', homeScore: 95,  awayScore: 105 },
    { date: 'Jun 5',  home: 'SAS', away: 'NYK', homeScore: 104, awayScore: 105 },
    { date: 'Jun 8',  home: 'NYK', away: 'SAS', homeScore: 111, awayScore: 115 },
    { date: 'Jun 10', home: 'NYK', away: 'SAS', homeScore: 107, awayScore: 106 },
    { date: 'Jun 13', home: 'SAS', away: 'NYK', homeScore: 90,  awayScore: 94  },
  ],
};

// Full-postseason scoring splits for the Knicks' own roster (only data available for this
// exception page — not fetched per-game, per-series; same averages shown once).
var KNICKS_SCORING_SPLITS = [
  { name: 'Jalen Brunson',       gp: 19, pts: 28.4, reb: 3.2,  ast: 6.1 },
  { name: 'OG Anunoby',          gp: 17, pts: 20.1, reb: 6.3,  ast: 1.6 },
  { name: 'Karl-Anthony Towns',  gp: 19, pts: 15.9, reb: 10.6, ast: 4.9 },
  { name: 'Mikal Bridges',       gp: 19, pts: 13.5, reb: 3.2,  ast: 2.7 },
  { name: 'Josh Hart',           gp: 19, pts: 10.4, reb: 8.9,  ast: 4.6 },
];

// --- Game cell tooltip (hover only — score + date; no click-expand, no boxscore fetch) ---

var _knicksTooltip = makeGameTooltip('knicks-tt', function () { return null; });

function showKnicksTooltip(el) {
  var tt = document.getElementById('knicks-tt');
  document.getElementById('knicks-tt-score').textContent =
    el.dataset.away + ' ' + el.dataset.ascore + ' – ' + el.dataset.hscore + ' ' + el.dataset.home +
    (el.dataset.ot ? ' (OT)' : '');
  document.getElementById('knicks-tt-date').textContent = el.dataset.date;
  tt.style.display = 'block';
}

// --- Game-result cell strip (mirrors playoffs.js buildSeriesGameCells) ---

function knicksGameCells(series) {
  var topAbbrev = series.top, bottomAbbrev = series.bottom;

  var cells = series.games.map(function (g) {
    var winnerAbbrev = g.homeScore > g.awayScore ? g.home : g.away;
    var awayWon = winnerAbbrev === g.away;
    var colors  = KNICKS_COLORS[winnerAbbrev] || { primary: '#555', secondary: '#555' };
    var fill    = 'linear-gradient(to right,' + colors.primary + ',' + colors.secondary + ')';
    var baseBg  = awayWon
      ? 'linear-gradient(135deg,transparent 78%,rgba(255,255,255,0.9) 78%),' + fill
      : fill;
    var background = g.ot
      ? 'linear-gradient(to bottom,#FFFF44 0px,#FFA500 3px,transparent 3px),' + baseBg
      : baseBg;
    return '<td' +
      ' data-home="'   + g.home      + '"' +
      ' data-away="'   + g.away      + '"' +
      ' data-hscore="' + g.homeScore + '"' +
      ' data-ascore="' + g.awayScore + '"' +
      ' data-date="'   + g.date      + '"' +
      ' data-ot="'     + (g.ot ? '1' : '') + '"' +
      ' onmouseover="showKnicksTooltip(this)"' +
      ' onmousemove="_knicksTooltip.move(event)"' +
      ' onmouseout="_knicksTooltip.hide()"' +
      ' style="cursor:default;width:22px;height:16px;border:none;background:' + background + ';"></td>';
  });
  for (var i = series.games.length; i < 7; i++) {
    cells.push('<td style="width:22px;height:16px;border:none;background:#1a1a1a;"></td>');
  }

  return '<tr><td colspan="5" align="center" ' +
    'style="border-top:1px solid rgba(255,255,255,0.15);border-left:none;border-right:none;border-bottom:none;padding:4px 4px 5px;">' +
    '<table style="border-collapse:separate;border-spacing:2px;display:inline-table;"><tr>' +
    cells.join('') +
    '</tr></table></td></tr>';
}

// --- Series card (mirrors playoffs.js buildSeriesCard) ---

function knicksSeriesStatus(topAbbrev, topWins, bottomAbbrev, bottomWins) {
  if (topWins === 4)    return topAbbrev    + ' wins 4–' + bottomWins;
  if (bottomWins === 4) return bottomAbbrev + ' wins 4–' + topWins;
  return topAbbrev + ' ' + topWins + '–' + bottomWins + ' ' + bottomAbbrev;
}

function knicksSeriesCard(series) {
  var topAbbrev = series.top, bottomAbbrev = series.bottom;
  var isNYK = topAbbrev === 'NYK' || bottomAbbrev === 'NYK';
  var status = knicksSeriesStatus(topAbbrev, series.topWins, bottomAbbrev, series.bottomWins);

  function teamCell(abbrev) {
    var seed = KNICKS_SEEDS[abbrev] || '';
    return '<td align="center" width="30%" style="border:none;padding:4px 2px;">' +
      '<img src="' + knicksLogoURL(abbrev) + '" width="36" alt="' + abbrev + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 3px;">' +
      '<div style="font-size:8pt;">' + abbrev + '</div>' +
      (seed ? '<div style="font-size:7pt;color:#888;">' + seed + '</div>' : '') +
      '</td>';
  }

  function winsCell(wins) {
    return '<td align="center" width="10%" style="border:none;font-size:18pt;font-weight:bold;padding:0 2px;">' + wins + '</td>';
  }

  var tableStyle = 'border-collapse:collapse;margin-bottom:8px;width:100%;' +
    (isNYK ? 'outline:1px solid white;' : '');

  return '<table style="' + tableStyle + '">' +
    '<tr>' +
    teamCell(topAbbrev) +
    winsCell(series.topWins) +
    '<td align="center" width="20%" style="border:none;font-size:8pt;opacity:0.6;">vs</td>' +
    winsCell(series.bottomWins) +
    teamCell(bottomAbbrev) +
    '</tr>' +
    '<tr>' +
    '<td colspan="5" align="center" style="border-top:1px solid rgba(255,255,255,0.25);border-left:none;border-right:none;border-bottom:none;font-size:8pt;opacity:0.7;padding:3px 4px;">' +
    status + '</td>' +
    '</tr>' +
    knicksGameCells(series) +
    '</table>';
}

// --- Bracket assembly (mirrors playoffs.js buildConferenceRounds) ---

var KNICKS_ROUND_LABEL_STYLE = 'font-size:9pt;font-weight:normal;opacity:0.7;text-transform:uppercase;margin:10px 0 6px 0;';

function knicksRoundHTML(seriesList, label) {
  if (!seriesList.length) return '';
  return '<h4 style="' + KNICKS_ROUND_LABEL_STYLE + '">' + label + '</h4>' +
    seriesList.map(knicksSeriesCard).join('');
}

function knicksConference(confKey, confName) {
  var all = KNICKS_SERIES.filter(function (s) { return s.conf === confKey; });
  var r1  = all.filter(function (s) { return s.round === 'r1'; });
  var r2  = all.filter(function (s) { return s.round === 'r2'; });
  var cf  = all.filter(function (s) { return s.round === 'cf'; });
  return {
    header: '<h3 style="text-align:center;font-size:12pt;margin:0 0 10px 0;">' + confName + '</h3>',
    r1: knicksRoundHTML(r1, '1st Round'),
    r2: knicksRoundHTML(r2, '2nd Round'),
    cf: knicksRoundHTML(cf, 'Conference Finals'),
  };
}

function knicksScoringSplitsHTML() {
  var rows = KNICKS_SCORING_SPLITS.map(function (p, i) {
    var hi = i === 0 ? 'background:rgba(255,215,0,0.12);' : '';
    return '<tr style="' + hi + '">' +
      '<td>' + p.name + '</td>' +
      '<td>' + p.gp + '</td>' +
      '<td>' + p.pts.toFixed(1) + '</td>' +
      '<td>' + p.reb.toFixed(1) + '</td>' +
      '<td>' + p.ast.toFixed(1) + '</td>' +
      '</tr>';
  }).join('');
  return '<table><tr><th>Player</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th></tr>' + rows + '</table>';
}

function loadKnicksPage() {
  var east = knicksConference('east', 'Eastern Conference');
  var west = knicksConference('west', 'Western Conference');

  function confRow(eastCell, westCell) {
    if (!eastCell && !westCell) return '';
    return '<tr>' +
      '<td width="50%" valign="top" style="border:none;padding-right:14px;">' + (eastCell || '') + '</td>' +
      '<td width="50%" valign="top" style="border:none;padding-left:14px;">'  + (westCell || '') + '</td>' +
      '</tr>';
  }

  var finalsCard = knicksSeriesCard({
    top: KNICKS_FINALS.top, bottom: KNICKS_FINALS.bottom,
    topWins: KNICKS_FINALS.topWins, bottomWins: KNICKS_FINALS.bottomWins,
    games: KNICKS_FINALS.games,
  });

  document.getElementById('bracket').innerHTML =
    '<table width="100%" style="border:none;">' +
    confRow(east.header, west.header) +
    confRow(east.r1, west.r1) +
    confRow(east.r2, west.r2) +
    confRow(east.cf, west.cf) +
    '</table>' +
    '<h3 style="text-align:center;font-size:12pt;margin:24px 0 10px 0;">NBA Finals</h3>' +
    '<div style="max-width:300px;margin:0 auto;">' + finalsCard + '</div>';

  document.getElementById('knicks-splits').innerHTML = knicksScoringSplitsHTML();
}

loadKnicksPage();
