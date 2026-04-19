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
  if (topWins === 4)    return topAbbrev    + ' wins 4\u2013' + bottomWins;
  if (bottomWins === 4) return bottomAbbrev + ' wins 4\u2013' + topWins;
  if (topWins === 0 && bottomWins === 0) return 'Series not yet begun';
  if (topWins > bottomWins)  return topAbbrev    + ' leads ' + topWins    + '\u2013' + bottomWins;
  if (bottomWins > topWins)  return bottomAbbrev + ' leads ' + bottomWins + '\u2013' + topWins;
  return 'Series tied ' + topWins + '\u2013' + bottomWins;
}

// --- Series card (used in bracket) ---

function buildSeriesCard(series) {
  var top    = series.topSeedTeam    || {};
  var bottom = series.bottomSeedTeam || {};

  var topAbbrev    = top.abbrev    || 'TBD';
  var bottomAbbrev = bottom.abbrev || 'TBD';
  var topWins      = series.topSeedWins    || 0;
  var bottomWins   = series.bottomSeedWins || 0;

  var isNYI    = topAbbrev === 'NYI' || bottomAbbrev === 'NYI';
  var seriesWon = topWins === 4 || bottomWins === 4;
  var status   = seriesStatusText(topAbbrev, topWins, bottomAbbrev, bottomWins);

  var tableStyle = 'border-collapse:collapse;margin-bottom:8px;width:100%;' +
    (isNYI    ? 'outline:1px solid white;'                      : '') +
    (seriesWon ? 'opacity:0.55;'                                 : '');

  function logoCell(abbrev) {
    return '<td align="center" width="30%" style="border:none;padding:4px 2px;">' +
      '<img src="' + playoffsLogoURL(abbrev) + '" width="36" alt="' + abbrev + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 3px;">' +
      '<div style="font-size:8pt;">' + abbrev + '</div>' +
      '</td>';
  }

  return '<table style="' + tableStyle + '">' +
    '<tr>' +
    logoCell(topAbbrev) +
    '<td align="center" width="10%" style="border:none;font-size:18pt;font-weight:bold;padding:0 2px;">' + topWins + '</td>' +
    '<td align="center" width="20%" style="border:none;font-size:8pt;opacity:0.6;">vs</td>' +
    '<td align="center" width="10%" style="border:none;font-size:18pt;font-weight:bold;padding:0 2px;">' + bottomWins + '</td>' +
    logoCell(bottomAbbrev) +
    '</tr>' +
    '<tr>' +
    '<td colspan="5" align="center" style="border-top:1px solid rgba(255,255,255,0.25);border-left:none;border-right:none;border-bottom:none;font-size:8pt;opacity:0.7;padding:3px 4px;">' +
    status + '</td>' +
    '</tr>' +
    '</table>';
}

// --- Today's game card ---

function buildTodayGameCard(game) {
  var away  = game.awayTeam || {};
  var home  = game.homeTeam || {};
  var state = game.gameState;

  var isFinal = state === 'OFF'  || state === 'FINAL';
  var isLive  = state === 'LIVE' || state === 'CRIT';
  var isFut   = state === 'FUT'  || state === 'PRE';

  var isNYI = away.abbrev === 'NYI' || home.abbrev === 'NYI';

  var centerScore, centerSub;

  if (isFinal) {
    centerScore = (away.score || 0) + ' \u2013 ' + (home.score || 0);
    centerSub   = 'Final';
    if (game.gameOutcome) {
      if (game.gameOutcome.lastPeriodType === 'OT') centerSub = 'Final/OT';
      if (game.gameOutcome.lastPeriodType === 'SO') centerSub = 'Final/SO';
    }
  } else if (isLive) {
    var pd    = game.periodDescriptor || {};
    var clock = game.clock || {};
    centerScore = (away.score || 0) + ' \u2013 ' + (home.score || 0);
    centerSub   = clock.inIntermission
      ? 'Intermission'
      : playoffsPeriodLabel(pd.number || 0) + ' \u00b7 ' + (clock.timeRemaining || '');
  } else {
    centerScore = formatGameStartTime(game.startTimeUTC);
    centerSub   = '';
  }

  // Series status line
  var ss = game.seriesStatus || {};
  var seriesLine = '';
  if (ss.seriesTitle) {
    var tAbbrev = ss.topSeedTeamAbbrev    || '';
    var bAbbrev = ss.bottomSeedTeamAbbrev || '';
    var tWins   = ss.topSeedWins    || 0;
    var bWins   = ss.bottomSeedWins || 0;
    seriesLine  = ss.seriesTitle + (tAbbrev
      ? ' \u2014 ' + seriesStatusText(tAbbrev, tWins, bAbbrev, bWins)
      : '');
  }

  var borderStyle = isNYI
    ? 'border:1px solid white;'
    : 'border:1px solid rgba(255,255,255,0.4);';

  function teamCell(team) {
    return '<td align="center" width="35%" style="border:none;padding:10px 6px;">' +
      '<img src="' + playoffsLogoURL(team.abbrev || '') + '" width="64" alt="' + (team.abbrev || '') + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 6px;">' +
      '<div style="font-size:10pt;">' + (team.abbrev || '') + '</div>' +
      '</td>';
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
    '</table>';
}

// --- Bracket helpers ---

var ROUND_LABEL_STYLE = 'font-size:9pt;font-weight:normal;opacity:0.7;text-transform:uppercase;margin:10px 0 6px 0;';

function buildConferenceColumn(allSeries, r1, r2, cf, confName) {
  function getSeries(letters) {
    return letters.map(function (l) {
      return allSeries.find(function (s) { return s.seriesLetter === l; });
    }).filter(Boolean);
  }

  var html = '<h3 style="text-align:center;font-size:12pt;margin:0 0 10px 0;">' + confName + '</h3>';

  var r1Series = getSeries(r1);
  if (r1Series.length) {
    html += '<h4 style="' + ROUND_LABEL_STYLE + '">1st Round</h4>';
    html += r1Series.map(buildSeriesCard).join('');
  }

  var r2Series = getSeries(r2);
  if (r2Series.length) {
    html += '<h4 style="' + ROUND_LABEL_STYLE + '">2nd Round</h4>';
    html += r2Series.map(buildSeriesCard).join('');
  }

  var cfSeries = getSeries([cf]);
  if (cfSeries.length) {
    html += '<h4 style="' + ROUND_LABEL_STYLE + '">Conference Final</h4>';
    html += cfSeries.map(buildSeriesCard).join('');
  }

  return html;
}

// --- Main ---

async function loadPlayoffsPage() {
  var year = new Date().getFullYear();

  try {
    var results = await Promise.all([
      fetch(WORKER + '/v1/score/now'),
      fetch(WORKER + '/v1/playoff-bracket/' + year),
    ]);

    var scoreData   = await results[0].json();
    var bracketData = await results[1].json();

    // Today's games
    var todayEl    = document.getElementById('today-games');
    var todayGames = (scoreData.games || []).filter(function (g) { return g.gameType === 3; });

    if (todayGames.length) {
      todayEl.innerHTML = todayGames.map(buildTodayGameCard).join('');
    } else {
      todayEl.innerHTML = '<p style="opacity:0.5;font-size:10pt;">No playoff games today.</p>';
    }

    // Bracket
    var bracketEl = document.getElementById('bracket');
    var allSeries = bracketData.series || [];

    if (!allSeries.length) {
      bracketEl.innerHTML = '<p style="opacity:0.5;font-size:10pt;">Bracket not yet available.</p>';
      return;
    }

    var eastHTML = buildConferenceColumn(allSeries, ['A','B','C','D'], ['I','J'], 'M', 'Eastern Conference');
    var westHTML = buildConferenceColumn(allSeries, ['E','F','G','H'], ['K','L'], 'N', 'Western Conference');
    var finalSeries = allSeries.find(function (s) { return s.seriesLetter === 'O'; });

    bracketEl.innerHTML =
      '<table width="100%" style="border:none;">' +
      '<tr>' +
      '<td width="50%" valign="top" style="border:none;padding-right:14px;">' + eastHTML + '</td>' +
      '<td width="50%" valign="top" style="border:none;padding-left:14px;">'  + westHTML + '</td>' +
      '</tr>' +
      '</table>' +
      (finalSeries
        ? '<h3 style="text-align:center;font-size:12pt;margin:24px 0 10px 0;">Stanley Cup Final</h3>' +
          '<div style="max-width:300px;margin:0 auto;">' + buildSeriesCard(finalSeries) + '</div>'
        : '');

    document.getElementById('footer').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

  } catch (err) {
    console.error('Playoffs page load failed:', err);
    document.getElementById('today-games').innerHTML =
      '<p style="opacity:0.5;font-size:10pt;">Failed to load data.</p>';
  }
}

loadPlayoffsPage();
