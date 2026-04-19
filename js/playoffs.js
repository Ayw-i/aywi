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
  var awayGoalie  = code[0] === '1';
  var awaySkaters = parseInt(code[1]) || 5;
  var homeSkaters = parseInt(code[2]) || 5;
  var homeGoalie  = code[3] === '1';
  var scoringHome = (play.details || {}).eventOwnerTeamId === homeTeamId;

  if (scoringHome  && !awayGoalie) return 'EN';
  if (!scoringHome && !homeGoalie) return 'EN';
  if (scoringHome) {
    if (homeSkaters > awaySkaters) return 'PPG';
    if (homeSkaters < awaySkaters) return 'SHG';
  } else {
    if (awaySkaters > homeSkaters) return 'PPG';
    if (awaySkaters < homeSkaters) return 'SHG';
  }
  return '5v5';
}

function formatGoalLine(g, rosterMap, homeTeamId) {
  var d      = g.details || {};
  var time   = (g.timeInPeriod || '?').replace(/^0/, '');
  var scorer = rosterMap[d.scoringPlayerId] || '?';
  var a1     = rosterMap[d.assist1PlayerId];
  var a2     = rosterMap[d.assist2PlayerId];

  var assists;
  if (a1 && a2) assists = ' from ' + a1 + ' and ' + a2;
  else if (a1)  assists = ' from ' + a1;
  else          assists = ' (unassisted)';

  var sit    = playoffsGetSituationLabel(g, homeTeamId);
  var sitTag = (sit && sit !== '5v5') ? ' (' + sit + ')' : '';

  return time + ': ' + scorer + assists + sitTag;
}

// --- Series card (used in bracket) ---

function buildSeriesCard(series) {
  var top    = series.topSeedTeam    || {};
  var bottom = series.bottomSeedTeam || {};

  var topAbbrev    = top.abbrev    || 'TBD';
  var bottomAbbrev = bottom.abbrev || 'TBD';
  var topWins      = series.topSeedWins    || 0;
  var bottomWins   = series.bottomSeedWins || 0;

  var isNYI     = topAbbrev === 'NYI' || bottomAbbrev === 'NYI';
  var seriesWon = topWins === 4 || bottomWins === 4;
  var status    = seriesStatusText(topAbbrev, topWins, bottomAbbrev, bottomWins);

  var tableStyle = 'border-collapse:collapse;margin-bottom:8px;width:100%;' +
    (isNYI     ? 'outline:1px solid white;' : '') +
    (seriesWon ? 'opacity:0.55;'            : '');

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

  var ss = game.seriesStatus || {};
  var seriesLine = '';
  if (ss.seriesTitle) {
    var tA = ss.topSeedTeamAbbrev || '', bA = ss.bottomSeedTeamAbbrev || '';
    var tW = ss.topSeedWins || 0,     bW = ss.bottomSeedWins || 0;
    seriesLine = ss.seriesTitle + (tA ? ' \u2014 ' + seriesStatusText(tA, tW, bA, bW) : '');
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

    var todayGames = (scoreData.games || []).filter(function (g) { return g.gameType === 3; });

    // Fetch play-by-play for each today's game in parallel
    var pbpResults = await Promise.all(
      todayGames.map(function (g) {
        return fetch(WORKER + '/v1/gamecenter/' + g.id + '/play-by-play')
          .then(function (r) { return r.json(); })
          .catch(function () { return null; });
      })
    );

    // Today's games
    var todayEl = document.getElementById('today-games');
    if (todayGames.length) {
      todayEl.innerHTML = todayGames.map(function (game, i) {
        return buildTodayGameCard(game, pbpResults[i]);
      }).join('');
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

    var eastHTML    = buildConferenceColumn(allSeries, ['A','B','C','D'], ['I','J'], 'M', 'Eastern Conference');
    var westHTML    = buildConferenceColumn(allSeries, ['E','F','G','H'], ['K','L'], 'N', 'Western Conference');
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
