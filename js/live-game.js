// Live and post-game scoreboard renderer.
// Populates #live-scoreboard with data from:
//   /v1/gamecenter/{gameId}/boxscore
//   /v1/gamecenter/{gameId}/play-by-play

function getNHLLogoURL(abbrev) {
  return 'https://assets.nhle.com/logos/nhl/svg/' + abbrev + '_light.svg';
}

function liveGamePeriodLabel(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (n === 4) return 'OT';
  return (n - 3) + 'OT';
}

function parseTOISecs(toi) {
  if (!toi) return 0;
  var parts = String(toi).split(':');
  return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
}

function formatGameDate(dateStr) {
  if (!dateStr) return '';
  var months = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var d = new Date(dateStr + 'T12:00:00');
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function buildRosterMap(rosterSpots) {
  var map = {};
  (rosterSpots || []).forEach(function (p) {
    var first = (p.firstName && p.firstName.default) || '';
    var last  = (p.lastName  && p.lastName.default)  || '';
    map[p.playerId] = (first + ' ' + last).trim();
  });
  return map;
}

function getSituationLabel(play, homeTeamId) {
  var code = play.situationCode || '1551';
  var homeGoalie  = code[0] === '1';
  var homeSkaters = parseInt(code[1]) || 5;
  var awaySkaters = parseInt(code[2]) || 5;
  var awayGoalie  = code[3] === '1';
  var d = play.details || {};
  var scoringHome = d.eventOwnerTeamId === homeTeamId;

  if (scoringHome  && !awayGoalie)  return 'EN';
  if (!scoringHome && !homeGoalie)  return 'EN';

  if (scoringHome) {
    if (homeSkaters > awaySkaters) return 'PPG';
    if (homeSkaters < awaySkaters) return 'SHG';
  } else {
    if (awaySkaters > homeSkaters) return 'PPG';
    if (awaySkaters < homeSkaters) return 'SHG';
  }
  return '5v5';
}

// --- Section builders ---

function buildLiveHeader(boxscore) {
  var home  = boxscore.homeTeam || {};
  var away  = boxscore.awayTeam || {};
  var pd    = boxscore.periodDescriptor || {};
  var clock = boxscore.clock || {};
  var isFinal = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
  var period  = pd.number || 0;

  var clockStr;
  if (isFinal) {
    clockStr = 'Final';
  } else if (clock.inIntermission) {
    clockStr = 'End of ' + liveGamePeriodLabel(period);
  } else if (period > 0) {
    clockStr = liveGamePeriodLabel(period) + ' &middot; ' + (clock.timeRemaining || '&mdash;');
  } else {
    clockStr = '&mdash;';
  }

  var homeSOG = home.sog != null ? home.sog : '&mdash;';
  var awaySOG = away.sog != null ? away.sog : '&mdash;';

  function teamCell(team, sog) {
    return '<td width="35%" align="center" style="border:none;">' +
      '<img src="' + getNHLLogoURL(team.abbrev || '') + '" width="80" alt="' + (team.abbrev || '') + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 6px;">' +
      '<div style="font-size:11pt;">' + (team.abbrev || '') + '</div>' +
      '<div style="font-size:9pt;opacity:0.7;margin-top:6px;">SOG: ' + sog + '</div>' +
      '</td>';
  }

  return '<table width="100%" style="border:none;margin-bottom:16px;">' +
    '<tr>' +
    teamCell(away, awaySOG) +
    '<td width="30%" align="center" style="border:none;vertical-align:middle;">' +
      '<div style="font-size:42pt;font-weight:bold;line-height:1;">' +
        (away.score || 0) + ' &ndash; ' + (home.score || 0) +
      '</div>' +
      '<div style="font-size:12pt;margin-top:6px;">' + clockStr + '</div>' +
      (boxscore.gameDate
        ? '<div style="font-size:9pt;opacity:0.7;margin-top:4px;">' + formatGameDate(boxscore.gameDate) + '</div>'
        : '') +
    '</td>' +
    teamCell(home, homeSOG) +
    '</tr>' +
    '</table>';
}

function buildLiveGoals(plays, rosterMap, homeTeamId, homeAbbrev, awayAbbrev) {
  var goals     = plays.filter(function (p) { return p.typeDescKey === 'goal'; });
  var homeGoals = goals.filter(function (g) { return (g.details || {}).eventOwnerTeamId === homeTeamId; });
  var awayGoals = goals.filter(function (g) { return (g.details || {}).eventOwnerTeamId !== homeTeamId; });

  function goalRow(g) {
    var d       = g.details || {};
    var scorer  = rosterMap[d.scoringPlayerId] || '?';
    var a1      = rosterMap[d.assist1PlayerId];
    var a2      = rosterMap[d.assist2PlayerId];
    var assists = [a1, a2].filter(Boolean).join(', ') || 'Unassisted';
    var period  = (g.periodDescriptor || {}).number || '?';
    var time    = g.timeInPeriod || '?';
    var sit     = getSituationLabel(g, homeTeamId);
    return '<tr>' +
      '<td style="white-space:nowrap;font-size:9pt;">' + liveGamePeriodLabel(period) + ' ' + time + '</td>' +
      '<td>' + scorer + '</td>' +
      '<td style="font-size:9pt;opacity:0.8;">' + assists + '</td>' +
      '<td style="font-size:9pt;">' + sit + '</td>' +
      '</tr>';
  }

  function goalTable(goals, label) {
    var rows = goals.length
      ? goals.map(goalRow).join('')
      : '<tr><td colspan="4" style="opacity:0.5;font-size:9pt;padding:4px 8px;">No goals</td></tr>';
    return '<table width="100%">' +
      '<thead>' +
        '<tr><th colspan="4">' + label + '</th></tr>' +
        '<tr>' +
          '<th style="font-size:8pt;">Time</th>' +
          '<th style="font-size:8pt;">Scorer</th>' +
          '<th style="font-size:8pt;">Assists</th>' +
          '<th style="font-size:8pt;">Sit.</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  return '<h3 style="margin-top:20px;margin-bottom:4px;">GOALS</h3>' +
    '<table width="100%" style="border:none;">' +
    '<tr>' +
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + goalTable(awayGoals, awayAbbrev) + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">' + goalTable(homeGoals, homeAbbrev) + '</td>' +
    '</tr></table>';
}

function buildLivePenalties(plays, rosterMap) {
  var penalties = plays.filter(function (p) { return p.typeDescKey === 'penalty'; });
  if (penalties.length === 0) return '';

  var rows = penalties.map(function (p) {
    var d          = p.details || {};
    var period     = (p.periodDescriptor || {}).number || '?';
    var time       = p.timeInPeriod || '?';
    var player     = rosterMap[d.committedByPlayerId] || '?';
    var infraction = d.descKey ? d.descKey.replace(/-/g, ' ') : '?';
    var duration   = d.duration ? d.duration + '\'' : '';
    return '<tr>' +
      '<td>' + liveGamePeriodLabel(period) + ' ' + time + '</td>' +
      '<td>' + player + '</td>' +
      '<td>' + infraction + '</td>' +
      '<td>' + duration + '</td>' +
      '</tr>';
  }).join('');

  return '<div style="margin-top:12px;">' +
    '<table width="100%" style="font-size:9pt;">' +
    '<thead>' +
      '<tr><th colspan="4" style="font-size:9pt;opacity:0.7;font-weight:normal;">PENALTIES</th></tr>' +
      '<tr><th>Time</th><th>Player</th><th>Infraction</th><th>Dur.</th></tr>' +
    '</thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

function buildLiveGoalies(homeGoalies, awayGoalies, homeAbbrev, awayAbbrev) {
  function goalieRows(goalies) {
    if (!goalies || goalies.length === 0) {
      return '<tr><td colspan="5" style="opacity:0.5;font-size:9pt;">No data</td></tr>';
    }
    var sorted = goalies.slice().sort(function (a, b) {
      return parseTOISecs(b.toi) - parseTOISecs(a.toi);
    });
    return sorted.map(function (g, i) {
      var pulled   = sorted.length > 1 && i === sorted.length - 1;
      var name     = (g.name && g.name.default) || 'Unknown';
      var sa       = g.shotsAgainst != null ? g.shotsAgainst : '&mdash;';
      var sv       = g.saves        != null ? g.saves        : '&mdash;';
      var svp      = g.savePctg     != null ? formatSVP(g.savePctg) : '&mdash;';
      var toi      = g.toi || '&mdash;';
      var rowStyle = pulled ? ' style="color:#ff4444;"' : '';
      var tag      = pulled ? ' (pulled)' : '';
      return '<tr' + rowStyle + '>' +
        '<td>' + name + tag + '</td>' +
        '<td>' + sa + '</td><td>' + sv + '</td>' +
        '<td>' + svp + '</td><td>' + toi + '</td>' +
        '</tr>';
    }).join('');
  }

  var thead = '<tr>' +
    '<th style="font-size:8pt;">Name</th>' +
    '<th style="font-size:8pt;">SA</th>' +
    '<th style="font-size:8pt;">SV</th>' +
    '<th style="font-size:8pt;">SV%</th>' +
    '<th style="font-size:8pt;">TOI</th>' +
    '</tr>';

  function goalieTable(goalies, label) {
    return '<table width="100%">' +
      '<thead><tr><th colspan="5">' + label + '</th></tr>' + thead + '</thead>' +
      '<tbody>' + goalieRows(goalies) + '</tbody>' +
      '</table>';
  }

  return '<h3 style="margin-top:20px;margin-bottom:4px;">GOALIES</h3>' +
    '<table width="100%" style="border:none;">' +
    '<tr>' +
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + goalieTable(homeGoalies, homeAbbrev) + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">' + goalieTable(awayGoalies, awayAbbrev) + '</td>' +
    '</tr></table>';
}

function buildLiveSkaters(homeStats, awayStats, homeAbbrev, awayAbbrev) {
  function getPlayers(stats) {
    return ((stats.forwards || []).concat(stats.defense || []))
      .filter(function (p) { return parseTOISecs(p.toi) > 0; })
      .sort(function (a, b) { return parseTOISecs(b.toi) - parseTOISecs(a.toi); });
  }

  function skaterRow(p) {
    return '<tr>' +
      '<td>' + ((p.name && p.name.default) || '?') + '</td>' +
      '<td style="white-space:nowrap;">' + (p.goals || 0) + 'G ' + (p.assists || 0) + 'A</td>' +
      '<td>' + (p.toi || '&mdash;') + '</td>' +
      '</tr>';
  }

  function skaterPanel(players, label) {
    if (!players.length) return '';
    var top    = players.slice(0, 3);
    var bottom = players.length >= 6 ? players.slice(-3).reverse() : [];
    var thead  = '<tr>' +
      '<th style="font-size:8pt;">Name</th>' +
      '<th style="font-size:8pt;">G/A</th>' +
      '<th style="font-size:8pt;">TOI</th>' +
      '</tr>';

    var html = '<table width="100%">' +
      '<thead><tr><th colspan="3">' + label + ' — Best</th></tr>' + thead + '</thead>' +
      '<tbody>' + top.map(skaterRow).join('') + '</tbody>' +
      '</table>';

    if (bottom.length) {
      html += '<table width="100%" style="margin-top:4px;">' +
        '<thead><tr><th colspan="3">' + label + ' — Worst</th></tr>' + thead + '</thead>' +
        '<tbody>' + bottom.map(skaterRow).join('') + '</tbody>' +
        '</table>';
    }
    return html;
  }

  return '<h3 style="margin-top:20px;margin-bottom:4px;">SKATERS</h3>' +
    '<table width="100%" style="border:none;">' +
    '<tr>' +
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + skaterPanel(getPlayers(homeStats), homeAbbrev) + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">' + skaterPanel(getPlayers(awayStats), awayAbbrev) + '</td>' +
    '</tr></table>';
}

// --- Main entry point ---

function buildScoreboardHTML(boxscore, playByPlay) {
  var home      = boxscore.homeTeam || {};
  var away      = boxscore.awayTeam || {};
  var gameStats = boxscore.playerByGameStats || {};
  var homeStats = gameStats.homeTeam || {};
  var awayStats = gameStats.awayTeam || {};
  var rosterMap = buildRosterMap((playByPlay || {}).rosterSpots);
  var plays     = (playByPlay || {}).plays || [];

  return buildLiveHeader(boxscore) +
    buildLiveGoals(plays, rosterMap, home.id, home.abbrev, away.abbrev) +
    buildLivePenalties(plays, rosterMap) +
    buildLiveGoalies(homeStats.goalies, awayStats.goalies, home.abbrev, away.abbrev) +
    buildLiveSkaters(homeStats, awayStats, home.abbrev, away.abbrev);
}

async function fetchAndRenderScoreboard(gameId) {
  var container = document.getElementById('live-scoreboard');
  if (!container) return;
  container.innerHTML = '<p style="opacity:0.5;font-size:10pt;">Loading game data...</p>';

  try {
    var results = await Promise.all([
      fetch(WORKER + '/v1/gamecenter/' + gameId + '/boxscore'),
      fetch(WORKER + '/v1/gamecenter/' + gameId + '/play-by-play'),
    ]);
    var boxscore   = await results[0].json();
    var playByPlay = await results[1].json();
    container.innerHTML = buildScoreboardHTML(boxscore, playByPlay);
  } catch (err) {
    console.error('Scoreboard fetch failed:', err);
    container.innerHTML = '<p style="opacity:0.5;font-size:10pt;">Could not load game data.</p>';
  }
}

function renderLiveGame(game) {
  var gameId    = game && game.id;
  var container = document.getElementById('live-scoreboard');
  if (!gameId) {
    if (container) container.innerHTML = '';
    return;
  }
  fetchAndRenderScoreboard(gameId);
}
