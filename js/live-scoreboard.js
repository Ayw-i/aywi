// Scoreboard section HTML builders.
// Pure functions — no shared state. Depends on utils.js (formatSVP etc.).

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
  var awayGoalieIn = code[0] === '1';
  var awaySkaters  = parseInt(code[1]) || 5;
  var homeSkaters  = parseInt(code[2]) || 5;
  var homeGoalieIn = code[3] === '1';
  var d = play.details || {};
  var scoringHome = d.eventOwnerTeamId === homeTeamId;

  var scoringGoalieIn = scoringHome ? homeGoalieIn : awayGoalieIn;
  var defendGoalieIn  = scoringHome ? awayGoalieIn : homeGoalieIn;
  var scoringSkaters  = scoringHome ? homeSkaters  : awaySkaters;
  var defendSkaters   = scoringHome ? awaySkaters  : homeSkaters;

  // EN: scored into the defending team's empty net
  if (!defendGoalieIn) return 'EN';

  // Scoring team pulled their own goalie (extra attacker — 6v5, 6v4, etc.)
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

// Returns the shortest time remaining (MM:SS) among active penalties, or null if none.
function getShortestActivePenaltyTime(plays, currentPeriod, timeRemaining) {
  if (!currentPeriod || !timeRemaining) return null;
  var clockSecs    = parseTOISecs(timeRemaining);
  var currentTotal = (currentPeriod - 1) * 1200 + (1200 - clockSecs);

  var shortest = null;
  (plays || []).forEach(function (p) {
    if (p.typeDescKey !== 'penalty') return;
    var dur = ((p.details || {}).duration || 0) * 60;
    if (!dur) return;
    var pp        = (p.periodDescriptor || {}).number || 0;
    var penTotal  = (pp - 1) * 1200 + parseTOISecs(p.timeInPeriod || '0:00');
    var remaining = penTotal + dur - currentTotal;
    if (remaining > 0 && (shortest === null || remaining < shortest)) shortest = remaining;
  });

  if (shortest === null) return null;
  var mins = Math.floor(shortest / 60);
  var secs = Math.round(shortest % 60);
  return mins + ':' + String(secs).padStart(2, '0');
}

// Returns a non-5v5 skater situation line (e.g. "5v4 1:42") in gold, replacing the date.
// Returns empty string at 5v5, intermission, final, or when situation data is unavailable.
function buildSkaterSituation(boxscore, plays) {
  var isFinal = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
  if (isFinal) return '';
  var clock = boxscore.clock || {};
  if (clock.inIntermission) return '';
  var pd = boxscore.periodDescriptor || {};
  if (!pd.number) return '';
  var sit = boxscore.situation;
  if (!sit || !sit.situationCode || sit.situationCode.length < 4) return '';

  var code        = sit.situationCode;
  var awaySkaters = parseInt(code[1]) || 5;
  var homeSkaters = parseInt(code[2]) || 5;
  if (awaySkaters === 5 && homeSkaters === 5) return '';

  var penTime = getShortestActivePenaltyTime(plays, pd.number, clock.timeRemaining);
  var text    = awaySkaters + 'v' + homeSkaters + (penTime ? ' ' + penTime : '');
  return '<div style="font-size:9pt;color:#FFD700;margin-top:4px;">' + text + '</div>';
}

function buildLiveHeader(boxscore, plays) {
  var home  = boxscore.homeTeam || {};
  var away  = boxscore.awayTeam || {};
  var pd    = boxscore.periodDescriptor || {};
  var clock = boxscore.clock || {};
  var isFinal = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
  var period  = pd.number || 0;

  var clockStr;
  if (isFinal) {
    var otLabel     = pd.number === 4 ? 'OT' : (pd.number > 4 ? (pd.number - 3) + 'OT' : 'OT');
    var finalSuffix = pd.periodType === 'OT' ? '/' + otLabel : pd.periodType === 'SO' ? '/SO' : '';
    clockStr = 'Final' + finalSuffix;
  } else if (clock.inIntermission) {
    var isPlayoff = boxscore.gameType === 3;
    var intLabel = null;
    if (period === 1) intLabel = '1st INT';
    else if (period === 2) intLabel = '2nd INT';
    else if (isPlayoff && period === 3) intLabel = 'OT INT';
    else if (isPlayoff && period >= 4) intLabel = liveGamePeriodLabel(period + 1) + ' INT';
    if (intLabel && clock.timeRemaining) {
      clockStr = intLabel + ' &middot; ' + clock.timeRemaining;
    } else {
      clockStr = 'End of ' + liveGamePeriodLabel(period);
    }
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
      (function () {
        var sit = buildSkaterSituation(boxscore, plays);
        return sit || (boxscore.gameDate
          ? '<div style="font-size:9pt;opacity:0.7;margin-top:4px;">' + formatGameDate(boxscore.gameDate) + '</div>'
          : '');
      }()) +
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
  var penalties     = plays.filter(function (p) { return p.typeDescKey === 'penalty'; });
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

  // Group same-player same-time penalties into one row (e.g. boarding + game misconduct).
  function groupPenalties(pens) {
    var groups = [], keyMap = {};
    pens.forEach(function (p) {
      var d   = p.details || {};
      var per = (p.periodDescriptor || {}).number || 0;
      var id  = d.committedByPlayerId || d.servedByPlayerId || 'bench';
      var key = per + ':' + (p.timeInPeriod || '') + ':' + id;
      if (keyMap[key] !== undefined) {
        groups[keyMap[key]].push(p);
      } else {
        keyMap[key] = groups.length;
        groups.push([p]);
      }
    });
    return groups;
  }

  function penaltyRow(group) {
    var first     = group[0];
    var d0        = first.details || {};
    var periodNum = (first.periodDescriptor || {}).number;
    var time      = first.timeInPeriod || '?';

    var player = d0.committedByPlayerId
      ? (rosterMap[d0.committedByPlayerId] || '?')
      : d0.servedByPlayerId
        ? 'Bench (served by ' + (rosterMap[d0.servedByPlayerId] || '?') + ')'
        : 'Bench';

    var drawnBy = '';
    group.forEach(function (p) {
      if (!drawnBy && (p.details || {}).drawnByPlayerId)
        drawnBy = rosterMap[p.details.drawnByPlayerId] || '?';
    });

    var isFirstMin  = periodNum === 1 && parseTOISecs(time) < 60;
    var isEjection  = false;
    var isTooManyMen = false;
    var infractions = group.map(function (p) {
      var dk = (p.details || {}).descKey || '?';
      if (dk.indexOf('game-misconduct') !== -1 ||
          dk.indexOf('gross-misconduct') !== -1 ||
          dk.indexOf('match') !== -1) isEjection = true;
      if (dk.indexOf('too-many-men') !== -1) isTooManyMen = true;
      var isFighting = dk.indexOf('fighting') !== -1;
      return (isFighting && isFirstMin)
        ? 'illegal ' + TONE_TOOLTIP
        : dk.replace(/-/g, ' ');
    }).join(' + ');

    var duration = group.map(function (p) {
      var dur = (p.details || {}).duration;
      return dur ? dur + '\'' : '';
    }).filter(Boolean).join(' + ');

    var EJECT = '&#128683;'; // 🚫
    var ejectBadge = isEjection
      ? '<br><span style="font-size:10pt;color:gray;">' + EJECT +
        '<span style="font-style:italic;"> Ejected.</span></span>'
      : '';
    var rowStyle = isEjection ? ' style="background-color:#3a0000;"' : '';

    var penTeamAbbrev = d0.eventOwnerTeamId === homeTeamId ? homeAbbrev : awayAbbrev;
    if (isTooManyMen && penTeamAbbrev === 'TBL') {
      var jsError =
        '<span style="color:#ff6b6b;font-family:monospace;font-size:8pt;display:block;margin-top:3px;">' +
        'TypeError: TBL can\'t possibly have too many men!<br>' +
        '&nbsp;&nbsp;&nbsp;&nbsp;at enforceRules (nhl-rulebook.js:1)<br>' +
        '&nbsp;&nbsp;&nbsp;&nbsp;at GameState.validate (refs.js:' + (periodNum * 100 + 4) + ')' +
        '</span>';
      return '<tr' + rowStyle + '>' +
        '<td>' + liveGamePeriodLabel(periodNum || '?') + ' ' + time + '</td>' +
        '<td>' + player + ejectBadge + '</td>' +
        '<td colspan="3">' + infractions + jsError + '</td>' +
        '</tr>';
    }

    return '<tr' + rowStyle + '>' +
      '<td>' + liveGamePeriodLabel(periodNum || '?') + ' ' + time + '</td>' +
      '<td>' + player + ejectBadge + '</td>' +
      '<td>' + infractions + '</td>' +
      '<td style="font-size:9pt;opacity:0.7;">' + drawnBy + '</td>' +
      '<td>' + duration + '</td>' +
      '</tr>';
  }

  function penaltyTable(pens, label) {
    var rows = pens.length
      ? groupPenalties(pens).map(penaltyRow).join('')
      : '<tr><td colspan="5" style="opacity:0.5;">None</td></tr>';
    return '<table width="100%" style="font-size:9pt;">' +
      '<thead>' +
        '<tr><th colspan="5">' + label + '</th></tr>' +
        '<tr><th>Time</th><th>Player</th><th>Infraction</th><th>Drawn by</th><th>Dur.</th></tr>' +
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

function hadShutoutUntilGoaliePull(plays, goalieTeamId, homeTeamId) {
  var goalsAgainst = plays.filter(function (p) {
    if (p.typeDescKey !== 'goal') return false;
    return (p.details || {}).eventOwnerTeamId !== goalieTeamId;
  });
  if (goalsAgainst.length === 0) return false;
  // Sanity check: goalie pulls only happen in P3+ (never seen before that)
  var firstPeriod = parseInt((goalsAgainst[0].periodDescriptor || {}).number) || 0;
  if (firstPeriod < 3) return false;
  return goalsAgainst.every(function (g) {
    var code = g.situationCode || '1551';
    var scoringHome  = (g.details || {}).eventOwnerTeamId === homeTeamId;
    // Scoring team had their own goalie pulled (extra attacker)
    var scoringGoalieIn = scoringHome ? (code[3] === '1') : (code[0] === '1');
    return !scoringGoalieIn;
  });
}

function buildLiveGoalies(leftGoalies, rightGoalies, leftAbbrev, rightAbbrev, leftPullShutout, rightPullShutout, isFinal, wentToOT) {
  var MEDAL = '&#127941;'; // 🏅 sports medal
  var WALL  = '&#129521;'; // 🧱 brick wall

  function goalieRows(goalies, pullShutout) {
    var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
    if (played.length === 0) {
      return '<tr><td colspan="5" style="opacity:0.5;font-size:9pt;">No data</td></tr>';
    }
    played.sort(function (a, b) { return parseTOISecs(b.toi) - parseTOISecs(a.toi); });
    return played.map(function (g, i) {
      var toiSecs = parseTOISecs(g.toi);
      var ga      = g.goalsAgainst != null ? g.goalsAgainst : null;
      var pulled  = played.length > 1 && i === played.length - 1;
      var rawName = (g.name && g.name.default) || 'Unknown';
      var name    = rawName.indexOf('Sorokin') !== -1
        ? '<a href="sorokin.html">' + rawName + '</a>'
        : rawName;
      var sa  = g.shotsAgainst != null ? g.shotsAgainst : '&mdash;';
      var sv  = g.saves        != null ? g.saves        : '&mdash;';
      var svp = g.savePctg     != null ? formatSVP(g.savePctg) : '&mdash;';
      var toi = g.toi || '&mdash;';
      var tag = pulled ? ' (pulled)' : '';

      // Badge: only for primary goalie (not the pulled backup), min 40 min TOI
      // Badge stored as [emoji_entity, text] to render emoji non-italic, text italic
      var badgeParts = null;
      if (!pulled && ga === 0 && toiSecs >= 2400) {
        if (isFinal)       badgeParts = [WALL,  'Shutout.'];
        else if (wentToOT) badgeParts = [MEDAL, 'Regulation shutout.'];
      }
      if (!badgeParts && !pulled && i === 0 && pullShutout && toiSecs >= 2400) {
        badgeParts = [MEDAL, 'Shutout until goalie pull.'];
      }

      var shutoutRow = !pulled && ga === 0 && toiSecs >= 2400;
      var rowStyle = pulled     ? ' style="color:#ff4444;"'
                   : shutoutRow ? ' style="background-color:#7a6000;color:#FFD700;"'
                   : '';
      var badgeHtml = badgeParts
        ? '<br><span style="font-size:10pt;color:gray;">' + badgeParts[0] +
          '<span style="font-style:italic;"> ' + badgeParts[1] + '</span></span>'
        : '';

      return '<tr' + rowStyle + '>' +
        '<td>' + name + tag + badgeHtml + '</td>' +
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

  function goalieTable(goalies, label, pullShutout) {
    return '<table width="100%">' +
      '<thead><tr><th colspan="5">' + label + '</th></tr>' + thead + '</thead>' +
      '<tbody>' + goalieRows(goalies, pullShutout) + '</tbody>' +
      '</table>';
  }

  return '<h3 style="margin-top:20px;margin-bottom:4px;">GOALIES</h3>' +
    '<table width="100%" style="border:none;">' +
    '<tr>' +
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + goalieTable(leftGoalies,  leftAbbrev,  leftPullShutout)  + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">'  + goalieTable(rightGoalies, rightAbbrev, rightPullShutout) + '</td>' +
    '</tr></table>';
}

// --- Shootout board ---

function parseShootoutAttempts(plays, homeTeamId) {
  var soPlays = plays.filter(function (p) {
    return (p.periodDescriptor || {}).periodType === 'SO';
  });
  var away = [], home = [];
  soPlays.forEach(function (p) {
    var t = p.typeDescKey;
    var d = p.details || {};
    var isGoal   = t === 'goal';
    var isSaved  = t === 'shot-on-goal';
    var isMissed = t === 'missed-shot';
    if (!isGoal && !isSaved && !isMissed) return;
    var isHome   = d.eventOwnerTeamId === homeTeamId;
    var playerId = isGoal
      ? (d.scoringPlayerId  || d.shootingPlayerId)
      : (d.shootingPlayerId || d.scoringPlayerId);
    var attempt = { playerId: playerId, scored: isGoal };
    if (isHome) home.push(attempt); else away.push(attempt);
  });
  return { away: away, home: home };
}

function getShootoutNeedsText(g1, a1, g2, a2, abbrev1, abbrev2) {
  // abbrev1/g1/a1 = away (shoots first each round), abbrev2/g2/a2 = home
  var isSuddenDeath = Math.min(a1, a2) >= 3;

  if (a1 === a2) {
    // Away's turn
    if (!isSuddenDeath) {
      var t2Rem = 3 - a2;
      if (g1 + 1 > g2 + t2Rem) return abbrev1 + ' wins with a goal.';
    }
    // In sudden death away scoring doesn't clinch — home still shoots
    return null;
  }

  if (a1 === a2 + 1) {
    // Home's turn
    if (!isSuddenDeath) {
      var t1Rem = 3 - a1;
      if (g2 + 1 > g1 + t1Rem) return abbrev2 + ' wins with a goal.';
      if (g1 > g2 + Math.max(0, 2 - a2)) return abbrev2 + ' needs a goal to continue.';
    } else {
      return g1 > g2
        ? abbrev2 + ' needs a goal to continue.'
        : abbrev2 + ' wins with a goal.';
    }
  }

  return null;
}

function buildShootoutBoard(boxscore, playByPlay) {
  var home      = boxscore.homeTeam || {};
  var away      = boxscore.awayTeam || {};
  var gameStats = boxscore.playerByGameStats || {};
  var homeStats = gameStats.homeTeam || {};
  var awayStats = gameStats.awayTeam || {};
  var rosterMap = buildRosterMap((playByPlay || {}).rosterSpots);
  var plays     = (playByPlay || {}).plays || [];

  var parsed       = parseShootoutAttempts(plays, home.id);
  var awayAttempts = parsed.away;
  var homeAttempts = parsed.home;
  var a1 = awayAttempts.length;
  var a2 = homeAttempts.length;
  var g1 = awayAttempts.filter(function (a) { return a.scored; }).length;
  var g2 = homeAttempts.filter(function (a) { return a.scored; }).length;

  function primaryGoalieLastName(goalies) {
    var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
    if (!played.length) return null;
    played.sort(function (a, b) { return parseTOISecs(b.toi) - parseTOISecs(a.toi); });
    var name = (played[0].name && played[0].name.default) || '';
    return name.split(' ').pop() || null;
  }
  var awayGoalie = primaryGoalieLastName(awayStats.goalies);
  var homeGoalie = primaryGoalieLastName(homeStats.goalies);

  var needsText = getShootoutNeedsText(g1, a1, g2, a2, away.abbrev || 'AWAY', home.abbrev || 'HOME');

  var ATTEMPT_STYLE = 'border:1px solid rgba(255,255,255,0.3);padding:6px 10px;text-align:center;';
  var HEADER_STYLE  = 'border:none;background:none;padding:10px 8px;text-align:center;';
  var ROUND_STYLE   = 'font-size:9pt;opacity:0.5;border:none;padding:2px 8px;text-align:center;';

  function attemptCell(attempt) {
    if (!attempt) {
      return '<td style="' + ATTEMPT_STYLE + 'color:#555;">&mdash;</td>';
    }
    var name     = rosterMap[attempt.playerId] || '?';
    var lastName = name.split(' ').pop();
    var symbol   = attempt.scored
      ? '<span style="font-size:28pt;color:#44ff44;">&#10003;</span>'
      : '<span style="font-size:28pt;color:#ff4444;">&#10007;</span>';
    return '<td style="' + ATTEMPT_STYLE + '">' +
      '<div style="font-size:9pt;color:#aaa;font-style:italic;">' + lastName + '</div>' +
      symbol +
      '</td>';
  }

  function teamHeaderTh(abbrev, goalieLastName) {
    return '<th style="' + HEADER_STYLE + '">' +
      '<img src="' + getNHLLogoURL(abbrev || '') + '" width="56" alt="' + (abbrev || '') + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 4px;">' +
      '<div style="font-size:11pt;">' + (abbrev || '') + '</div>' +
      (goalieLastName
        ? '<div style="font-size:9pt;color:#888;font-style:italic;font-weight:normal;">' + goalieLastName + ' in net</div>'
        : '') +
      '</th>';
  }

  // Always show at least 3 rows (best-of-3 format)
  var numRows = Math.max(a1, a2, 3);
  var rows = '';
  for (var i = 0; i < numRows; i++) {
    rows += '<tr>' +
      '<td style="' + ROUND_STYLE + '">' + (i + 1) + '</td>' +
      attemptCell(i < a1 ? awayAttempts[i] : null) +
      attemptCell(i < a2 ? homeAttempts[i] : null) +
      '</tr>';
  }

  return '<div style="text-align:center;margin-bottom:16px;">' +
      '<div style="font-size:36pt;font-weight:bold;letter-spacing:2px;">SHOOTOUT</div>' +
      '<div style="font-size:22pt;font-weight:bold;margin:6px 0;">' + g1 + ' &ndash; ' + g2 + '</div>' +
    '</div>' +
    (needsText
      ? '<div style="text-align:center;font-size:12pt;font-style:italic;color:#ffdd44;margin:6px 0 16px 0;">' + needsText + '</div>'
      : '') +
    '<table width="100%" style="border-collapse:collapse;">' +
      '<thead><tr>' +
        '<th style="border:none;background:none;width:28px;"></th>' +
        teamHeaderTh(away.abbrev, awayGoalie) +
        teamHeaderTh(home.abbrev, homeGoalie) +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

// --- Live feed ---

function buildLiveFeed(plays, rosterMap, homeId, homeAbbrev, awayAbbrev, isFinal, nyiGameNum, nhlGameNum) {
  var FEED_TYPES = { goal: true, 'shot-on-goal': true, 'blocked-shot': true, hit: true, penalty: true };
  var feed = plays.filter(function (p) { return FEED_TYPES[p.typeDescKey]; });
  feed = feed.slice(-7);
  if (!feed.length) return '';

  function teamAbbrev(teamId) { return teamId === homeId ? homeAbbrev : awayAbbrev; }
  function lastName(id) { var n = rosterMap[id] || ''; return n.split(' ').slice(-1)[0] || '?'; }

  var rows = feed.slice().reverse().map(function (p) {
    var t  = p.typeDescKey;
    var d  = p.details || {};
    var pd = p.periodDescriptor || {};
    var period = liveGamePeriodLabel(pd.number || 0);
    var time   = p.timeInPeriod || '';
    var label, detail;

    if (t === 'goal') {
      label  = '<b>GOAL</b>';
      detail = teamAbbrev(d.eventOwnerTeamId) + ' — ' + lastName(d.scoringPlayerId);
    } else if (t === 'shot-on-goal') {
      label  = 'Shot';
      detail = lastName(d.shootingPlayerId) + ' (' + teamAbbrev(d.eventOwnerTeamId) + ')';
    } else if (t === 'blocked-shot') {
      label  = 'Block';
      detail = lastName(d.blockingPlayerId) + ' (' + teamAbbrev(d.eventOwnerTeamId) + ')';
    } else if (t === 'hit') {
      label  = 'Hit';
      detail = lastName(d.hittingPlayerId) + ' (' + teamAbbrev(d.eventOwnerTeamId) + ')';
    } else if (t === 'penalty') {
      var pname = d.committedByPlayerId ? lastName(d.committedByPlayerId) : 'Bench';
      label  = 'Penalty';
      detail = pname + ' (' + teamAbbrev(d.eventOwnerTeamId) + ') — ' + (d.descKey || '');
    } else {
      return '';
    }

    return '<tr>' +
      '<td style="white-space:nowrap;font-size:9pt;">' + period + ' ' + time + '</td>' +
      '<td style="font-size:9pt;">' + label + '</td>' +
      '<td style="font-size:9pt;">' + detail + '</td>' +
      '</tr>';
  });

  var gameLabel = nyiGameNum
    ? ' &mdash; <span' + (nhlGameNum ? ' title="NHL Game ' + nhlGameNum + '"' : '') + ' style="cursor:default;">Game ' + nyiGameNum + '</span>'
    : '';
  var title = (isFinal ? 'PLAY LOG' : 'LIVE FEED') + gameLabel;
  return '<h3 style="margin-top:20px;margin-bottom:4px;">' + title + '</h3>' +
    '<table width="100%" style="border:none;"><tr><td style="border:none;">' +
    '<table>' +
    '<thead>' +
      '<tr><th style="font-size:8pt;">Time</th><th style="font-size:8pt;">Event</th><th style="font-size:8pt;">Player</th></tr>' +
    '</thead>' +
    '<tbody>' + rows.join('') + '</tbody>' +
    '</table>' +
    '</td></tr></table>';
}

// --- Main scoreboard assembler ---

function buildScoreboardHTML(boxscore, playByPlay, gameId, nyiGameNum) {
  var home      = boxscore.homeTeam || {};
  var away      = boxscore.awayTeam || {};
  var gameStats = boxscore.playerByGameStats || {};
  var homeStats = gameStats.homeTeam || {};
  var awayStats = gameStats.awayTeam || {};
  var rosterMap = buildRosterMap((playByPlay || {}).rosterSpots);
  var plays     = (playByPlay || {}).plays || [];

  var isFinal    = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
  var nhlGameNum = (boxscore.gameType === 2 && gameId)
    ? parseInt(String(gameId).slice(-4), 10) : null;

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

  var awayPullShutout = hadShutoutUntilGoaliePull(plays, away.id, home.id);
  var homePullShutout = hadShutoutUntilGoaliePull(plays, home.id, home.id);
  var wentToOT = ((boxscore.periodDescriptor || {}).number || 0) > 3;

  // Away is always left column, home is always right column — consistent with header.
  var nyiIsHome = home.abbrev === 'NYI';
  return buildLiveHeader(boxscore, plays) +
    buildLiveGoals(plays, rosterMap, home.id, home.abbrev, away.abbrev, isFinal, awayShutoutImg, homeShutoutImg) +
    buildLivePenalties(plays, rosterMap, home.id, home.abbrev, away.abbrev) +
    buildLiveGoalies(awayStats.goalies, homeStats.goalies, away.abbrev, home.abbrev, awayPullShutout, homePullShutout, isFinal, wentToOT) +
    buildLiveSkaters(awayStats, homeStats, away.abbrev, home.abbrev, plays) +
    buildLiveGraph(boxscore, playByPlay, nyiIsHome) +
    buildLiveFeed(plays, rosterMap, home.id, home.abbrev, away.abbrev, isFinal, nyiGameNum, nhlGameNum);
}
