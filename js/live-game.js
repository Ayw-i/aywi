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
  // Format: {awayGoalie}{awaySkaters}{homeSkaters}{homeGoalie}
  var awayGoalie  = code[0] === '1';
  var awaySkaters = parseInt(code[1]) || 5;
  var homeSkaters = parseInt(code[2]) || 5;
  var homeGoalie  = code[3] === '1';
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

function randomShatautImg() {
  var list = appConfig && appConfig.kingOfShutoutsImages;
  if (!list || !list.length) return 'assets/saros-no-goals.png';
  return list[Math.floor(Math.random() * list.length)];
}

function isPrimaryGoalieSorokin(goalies) {
  var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
  if (!played.length) return false;
  played.sort(function (a, b) { return parseTOISecs(b.toi) - parseTOISecs(a.toi); });
  var name = (played[0].name && played[0].name.default) || '';
  return name.indexOf('Sorokin') !== -1;
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

function buildLiveGoals(plays, rosterMap, homeTeamId, homeAbbrev, awayAbbrev, isFinal, awayShutoutImg, homeShutoutImg) {
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

  function goalTable(goals, label, shutoutImg) {
    var rows;
    if (goals.length === 0 && isFinal && shutoutImg) {
      rows = '<tr><td colspan="4" style="text-align:center;padding:6px 0;">' +
        '<img src="' + shutoutImg + '" style="max-width:100%;max-height:80px;display:block;margin:0 auto;">' +
        '</td></tr>';
    } else if (goals.length === 0) {
      rows = '<tr><td colspan="4" style="opacity:0.5;font-size:9pt;padding:4px 8px;">No goals</td></tr>';
    } else {
      rows = goals.map(goalRow).join('');
    }
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
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + goalTable(awayGoals, awayAbbrev, awayShutoutImg) + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">' + goalTable(homeGoals, homeAbbrev, homeShutoutImg) + '</td>' +
    '</tr></table>';
}

function buildLivePenalties(plays, rosterMap, homeTeamId, homeAbbrev, awayAbbrev) {
  var penalties    = plays.filter(function (p) { return p.typeDescKey === 'penalty'; });
  var homePenalties = penalties.filter(function (p) { return (p.details || {}).eventOwnerTeamId === homeTeamId; });
  var awayPenalties = penalties.filter(function (p) { return (p.details || {}).eventOwnerTeamId !== homeTeamId; });
  if (penalties.length === 0) return '';

  var TONE_TOOLTIP =
    '<span style="position:relative;display:inline-block;">' +
      '<span style="text-decoration:underline dotted;cursor:help;"' +
        ' onmouseenter="this.nextElementSibling.style.display=\'block\'"' +
        ' onmouseleave="this.nextElementSibling.style.display=\'none\'">setting of the tone</span>' +
      '<span style="display:none;position:absolute;bottom:120%;left:0;z-index:999;' +
        'background:#000;border:1px solid #fff;padding:4px;">' +
        '<img src="assets/shoresy-set-the-tone.gif" style="max-width:180px;display:block;">' +
      '</span>' +
    '</span>';

  function penaltyRow(p) {
    var d          = p.details || {};
    var periodNum  = (p.periodDescriptor || {}).number;
    var time       = p.timeInPeriod || '?';
    var player     = d.committedByPlayerId
      ? (rosterMap[d.committedByPlayerId] || '?')
      : d.servedByPlayerId
        ? 'Bench (served by ' + (rosterMap[d.servedByPlayerId] || '?') + ')'
        : 'Bench';
    var duration   = d.duration ? d.duration + '\'' : '';
    var isFighting = d.descKey && d.descKey.indexOf('fighting') !== -1;
    var isFirstMin = periodNum === 1 && parseTOISecs(time) < 60;
    var infraction = (isFighting && isFirstMin)
      ? 'illegal ' + TONE_TOOLTIP
      : (d.descKey ? d.descKey.replace(/-/g, ' ') : '?');
    return '<tr>' +
      '<td>' + liveGamePeriodLabel(periodNum || '?') + ' ' + time + '</td>' +
      '<td>' + player + '</td>' +
      '<td>' + infraction + '</td>' +
      '<td>' + duration + '</td>' +
      '</tr>';
  }

  function penaltyTable(pens, label) {
    var rows = pens.length
      ? pens.map(penaltyRow).join('')
      : '<tr><td colspan="4" style="opacity:0.5;">None</td></tr>';
    return '<table width="100%" style="font-size:9pt;">' +
      '<thead>' +
        '<tr><th colspan="4">' + label + '</th></tr>' +
        '<tr><th>Time</th><th>Player</th><th>Infraction</th><th>Dur.</th></tr>' +
      '</thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  return '<div style="margin-top:12px;font-size:9pt;opacity:0.85;">' +
    '<table width="100%" style="border:none;">' +
    '<tr>' +
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + penaltyTable(awayPenalties, awayAbbrev + ' Penalties') + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">'  + penaltyTable(homePenalties, homeAbbrev + ' Penalties') + '</td>' +
    '</tr></table></div>';
}

function buildLiveGoalies(leftGoalies, rightGoalies, leftAbbrev, rightAbbrev) {
  function goalieRows(goalies) {
    var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
    if (played.length === 0) {
      return '<tr><td colspan="5" style="opacity:0.5;font-size:9pt;">No data</td></tr>';
    }
    played.sort(function (a, b) { return parseTOISecs(b.toi) - parseTOISecs(a.toi); });
    return played.map(function (g, i) {
      var pulled   = played.length > 1 && i === played.length - 1;
      var rawName  = (g.name && g.name.default) || 'Unknown';
      var name     = rawName.indexOf('Sorokin') !== -1
        ? '<a href="sorokin.html">' + rawName + '</a>'
        : rawName;
      var sa       = g.shotsAgainst != null ? g.shotsAgainst : '&mdash;';
      var sv       = g.saves        != null ? g.saves        : '&mdash;';
      var svp      = g.savePctg     != null ? formatSVP(g.savePctg) : '&mdash;';
      var toi      = g.toi || '&mdash;';
      var shutout  = g.goalsAgainst === 0 && parseTOISecs(g.toi) >= 2400;
      var rowStyle = pulled  ? ' style="color:#ff4444;"'
                   : shutout ? ' style="background-color:#7a6000;color:#FFD700;"'
                   : '';
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
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + goalieTable(leftGoalies,  leftAbbrev)  + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">'  + goalieTable(rightGoalies, rightAbbrev) + '</td>' +
    '</tr></table>';
}

function buildLiveSkaters(leftStats, rightStats, leftAbbrev, rightAbbrev) {
  function playerBestScore(p) {
    // Points take priority; TOI breaks ties (scaled to stay below 1 point of weight)
    var points  = (p.goals || 0) + (p.assists || 0);
    var toiSecs = parseTOISecs(p.toi);
    return points * 10000 + toiSecs;
  }

  function getPlayers(stats) {
    return ((stats.forwards || []).concat(stats.defense || []))
      .filter(function (p) { return parseTOISecs(p.toi) > 0; });
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
    var byBest = players.slice().sort(function (a, b) { return playerBestScore(b) - playerBestScore(a); });
    var byTOI  = players.slice().sort(function (a, b) { return parseTOISecs(a.toi) - parseTOISecs(b.toi); });
    var top    = byBest.slice(0, 3);
    var bottom = players.length >= 6 ? byTOI.slice(0, 3) : [];
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
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + skaterPanel(getPlayers(leftStats),  leftAbbrev)  + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">'  + skaterPanel(getPlayers(rightStats), rightAbbrev) + '</td>' +
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

  var isFinal = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';

  // Shutout easter eggs: saros-no-goals.png by default;
  // king-of-shutouts if NYI shut out opponent and Sorokin was their goalie.
  var homeGoalieSorokin = isPrimaryGoalieSorokin(homeStats.goalies);
  var awayGoalieSorokin = isPrimaryGoalieSorokin(awayStats.goalies);
  // awayShutoutImg: used when away scored 0 (home goalie got the shutout)
  var awayShutoutImg = (home.abbrev === 'NYI' && homeGoalieSorokin)
    ? randomShatautImg() : 'assets/saros-no-goals.png';
  // homeShutoutImg: used when home scored 0 (away goalie got the shutout)
  var homeShutoutImg = (away.abbrev === 'NYI' && awayGoalieSorokin)
    ? randomShatautImg() : 'assets/saros-no-goals.png';

  // Away is always left column, home is always right column — consistent with header.
  return buildLiveHeader(boxscore) +
    buildLiveGoals(plays, rosterMap, home.id, home.abbrev, away.abbrev, isFinal, awayShutoutImg, homeShutoutImg) +
    buildLivePenalties(plays, rosterMap, home.id, home.abbrev, away.abbrev) +
    buildLiveGoalies(awayStats.goalies, homeStats.goalies, away.abbrev, home.abbrev) +
    buildLiveSkaters(awayStats, homeStats, away.abbrev, home.abbrev);
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
