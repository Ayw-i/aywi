// Scoreboard section HTML builders.
// Pure functions — no shared state. Depends on utils.js (formatSVP etc.).

function jafares(name) {
  if (!name) return name;
  return name.replace(/J(?:ohn)?\.?\s+Tavares/gi, function (match) {
    if (/^John/i.test(match)) return Math.random() < 0.5 ? '🐍' : 'Jafares';
    return match.replace(/Tavares/i, 'Afares');
  });
}

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

// playerId -> team abbrev, from the game roster. Used wherever a player's team
// must be right regardless of which team the NHL attached the event to.
function buildPlayerTeamMap(rosterSpots, home, away) {
  var map = {};
  (rosterSpots || []).forEach(function (p) {
    if (p.teamId === home.id) map[p.playerId] = home.abbrev;
    else if (p.teamId === away.id) map[p.playerId] = away.abbrev;
  });
  return map;
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

  if (scoringSkaters > defendSkaters) {
    if (scoringSkaters === 5 && defendSkaters === 4) return 'PPG';
    return 'PPG (' + scoringSkaters + 'v' + defendSkaters + ')';
  }
  if (scoringSkaters < defendSkaters) {
    if (scoringSkaters === 4 && defendSkaters === 5) return 'SHG';
    return 'SHG (' + scoringSkaters + 'v' + defendSkaters + ')';
  }
  return '5v5';
}

function randomShatautImg() {
  var list = (typeof appConfig !== 'undefined') && appConfig && appConfig.kingOfShutoutsImages;
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

// Returns EN breakdown line: "X-Y (+N EN)" or "X-Y (+N EN) (+M pEN)" if any EN goals exist.
// pEN = a non-EN goal scored after the first EN goal in the game.
function buildENBreakdown(plays, homeTeamId) {
  var goals = plays.filter(function (p) {
    return p.typeDescKey === 'goal' && (p.periodDescriptor || {}).periodType !== 'SO';
  });
  var awayPure = 0, homePure = 0, enCount = 0, penCount = 0, seenEN = false;
  goals.forEach(function (g) {
    var isEN   = getSituationLabel(g, homeTeamId) === 'EN';
    var isHome = (g.details || {}).eventOwnerTeamId === homeTeamId;
    if (isEN) {
      enCount++;
      seenEN = true;
    } else if (seenEN) {
      penCount++;
    } else {
      if (isHome) homePure++; else awayPure++;
    }
  });
  if (enCount === 0) return '';
  var text = awayPure + '&ndash;' + homePure +
    ' (+' + enCount + ' EN)' +
    (penCount > 0 ? ' (+' + penCount + ' pEN)' : '');
  return '<div style="font-size:9pt;color:#888;font-style:italic;margin-top:3px;">' + text + '</div>';
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

function buildHighScoringBanner(plays, homeStats, awayStats) {
  var totalGoals = plays.filter(function (p) { return p.typeDescKey === 'goal'; }).length;
  if (totalGoals < 10) return '';

  var label = totalGoals > 10 ? '10+ goal game!' : '10 goal game!';

  var badGoalies = [];
  function checkGoalies(goalies) {
    (goalies || []).forEach(function (g) {
      if ((g.goalsAgainst || 0) >= 5) {
        var name = (g.name && g.name.default) || '';
        badGoalies.push(name.split(' ').pop() || name);
      }
    });
  }
  checkGoalies((homeStats || {}).goalies);
  checkGoalies((awayStats || {}).goalies);

  var pourText = '';
  if (badGoalies.length === 1) {
    pourText = 'Pour one out for ' + badGoalies[0];
  } else if (badGoalies.length >= 2) {
    pourText = 'Pour two out for ' + badGoalies[0] + ' and ' + badGoalies[1];
  }

  return '<div style="text-align:center;margin-bottom:8px;">' +
    '<div style="font-size:12pt;font-weight:bold;">&#128680; ' + label + ' &#128680;</div>' +
    (pourText ? '<div style="font-size:9pt;opacity:0.8;">' + pourText + '</div>' : '') +
    '</div>';
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
    var wentToSO = (plays || []).some(function (p) {
      return (p.periodDescriptor || {}).periodType === 'SO';
    });
    var otLabel     = pd.number === 4 ? 'OT' : (pd.number > 4 ? (pd.number - 3) + 'OT' : 'OT');
    var finalSuffix = wentToSO ? '/SO'
                    : pd.periodType === 'OT' ? '/' + otLabel
                    : pd.periodType === 'SO' ? '/SO'
                    : '';
    clockStr = 'Final' + finalSuffix;
    // Link through to the full box score, unless we're already on game.html
    // (served as /game on the live site, /game.html under Live Server)
    var onGamePage = /\/game(\.html)?$/.test(window.location.pathname);
    if (boxscore.id && !onGamePage) {
      clockStr = '<a href="game.html?id=' + encodeURIComponent(boxscore.id) + '" ' +
        'title="Full box score" style="color:' + LINK_TINT + ';text-decoration:underline;">' +
        clockStr + '</a>';
    }
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
  } else if (period === 1 && clock.timeRemaining === '20:00' && !clock.running) {
    // Marked live but the clock hasn't moved yet: the game is about to start
    // (a stopped 20:00 in the 1st only happens before the opening faceoff).
    clockStr = 'Puck&nbsp;drop any&nbsp;minute';
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
      buildENBreakdown(plays, home.id) +
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

// Pregame preview: same layout as buildLiveHeader, but for a game that hasn't
// started yet. Built straight from the /v1/score/now game object — no extra
// fetch. Scores show as dashes; the center shows puck drop in the viewer's own
// time zone. Team records are left off on purpose: in preseason the API still
// reports last season's final record.
function buildPregameHeader(game) {
  var home = game.homeTeam || {};
  var away = game.awayTeam || {};

  // "puck drop" and the time are each kept on one line (nbsp / nowrap), so a
  // narrow center column wraps between phrases, never leaving "EDT" or "drop"
  // stranded on their own line.
  var puckDrop = game.startTimeUTC
    ? 'puck&nbsp;drop <span style="white-space:nowrap;">' +
        new Date(game.startTimeUTC).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        }) + '</span>'
    : 'time TBD';
  // Listed start times aren't puck drop — anthems and intros take another
  // 7-12 minutes, and the NHL keeps the game in PRE until it actually starts.
  // Past the listed time, say so instead of repeating a time that's gone by.
  var pastListedStart = game.startTimeUTC && new Date() >= new Date(game.startTimeUTC);
  var clockStr;
  if (pastListedStart) {
    clockStr = 'Puck&nbsp;drop any&nbsp;minute';
  } else if (game.gameState === 'PRE') {
    // PRE = teams are on the ice for warmups
    clockStr = 'Warmups &middot; ' + puckDrop;
  } else {
    clockStr = puckDrop.charAt(0).toUpperCase() + puckDrop.slice(1);
  }

  var typeTag = game.gameType === 1 ? 'PRESEASON' : '';

  var detailParts = [];
  if (game.gameDate) detailParts.push(formatGameDate(game.gameDate));
  if (game.venue && game.venue.default) detailParts.push(game.venue.default);

  function teamCell(team) {
    return '<td width="35%" align="center" style="border:none;">' +
      '<img src="' + getNHLLogoURL(team.abbrev || '') + '" width="80" alt="' + (team.abbrev || '') + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 6px;">' +
      '<div style="font-size:11pt;">' + (team.abbrev || '') + '</div>' +
      '</td>';
  }

  return '<table width="100%" style="border:none;margin-bottom:16px;">' +
    '<tr>' +
    teamCell(away) +
    '<td width="30%" align="center" style="border:none;vertical-align:middle;">' +
      (typeTag ? '<div style="font-size:9pt;letter-spacing:2px;margin-bottom:6px;">' + typeTag + '</div>' : '') +
      '<div style="font-size:42pt;font-weight:bold;line-height:1;white-space:nowrap;">&ndash; &ndash; &ndash;</div>' +
      '<div style="font-size:12pt;margin-top:6px;">' + clockStr + '</div>' +
      (detailParts.length
        ? '<div style="font-size:9pt;opacity:0.7;margin-top:4px;">' + detailParts.join('<br>') + '</div>'
        : '') +
    '</td>' +
    teamCell(home) +
    '</tr>' +
    '</table>';
}

function buildLiveGoals(plays, rosterMap, homeTeamId, homeAbbrev, awayAbbrev, isFinal, awayShutoutImg, homeShutoutImg) {
  var goals     = plays.filter(function (p) {
    return p.typeDescKey === 'goal' && (p.periodDescriptor || {}).periodType !== 'SO';
  });
  var homeGoals = goals.filter(function (g) { return (g.details || {}).eventOwnerTeamId === homeTeamId; });
  var awayGoals = goals.filter(function (g) { return (g.details || {}).eventOwnerTeamId !== homeTeamId; });

  function goalRow(g) {
    var d        = g.details || {};
    var scorer   = jafares(rosterMap[d.scoringPlayerId] || '?');
    var a1       = jafares(rosterMap[d.assist1PlayerId]);
    var a2       = jafares(rosterMap[d.assist2PlayerId]);
    var assists  = [a1, a2].filter(Boolean).join(', ') || 'Unassisted';
    var period   = (g.periodDescriptor || {}).number || '?';
    var time     = g.timeInPeriod || '?';
    var sit      = getSituationLabel(g, homeTeamId);
    var shotType = d.shotType ? d.shotType.replace(/-/g, ' ') : null;
    var scorerCell = scorer +
      (shotType ? '<br><span style="font-size:8pt;opacity:0.65;font-style:italic;">' + shotType + '</span>' : '');
    return '<tr>' +
      '<td style="white-space:nowrap;font-size:9pt;">' + liveGamePeriodLabel(period) + ' ' + time + '</td>' +
      '<td>' + scorerCell + '</td>' +
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
    '<table class="team-pair" width="100%" style="border:none;">' +
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

  // Tag coincidental minor pairs (same period+time, opposite teams, both 2') with a shared background color.
  // Each new pair in the game gets the next shade of purple (cycles after 3).
  (function () {
    var COLORS = ['rgba(0,190,170,0.22)', 'rgba(100,60,230,0.25)', 'rgba(80,0,140,0.30)'];
    var buckets = {};
    penalties.forEach(function (p) {
      var dur = (p.details || {}).duration;
      if (dur !== 2) return;
      var per = (p.periodDescriptor || {}).number || 0;
      var key = per + ':' + (p.timeInPeriod || '');
      if (!buckets[key]) buckets[key] = { home: [], away: [] };
      var isHome = (p.details || {}).eventOwnerTeamId === homeTeamId;
      (isHome ? buckets[key].home : buckets[key].away).push(p);
    });
    var groupIdx = 0;
    Object.keys(buckets).forEach(function (key) {
      var b = buckets[key];
      if (!b.home.length || !b.away.length) return;
      var pairs = Math.min(b.home.length, b.away.length);
      for (var i = 0; i < pairs; i++) {
        var color = COLORS[groupIdx % COLORS.length];
        b.home[i]._coincidentalColor = color;
        b.away[i]._coincidentalColor = color;
        groupIdx++;
      }
    });
  })();

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
  // Coincidental minors are always kept as solo rows so they can be colored independently.
  function groupPenalties(pens) {
    var groups = [], keyMap = {};
    pens.forEach(function (p) {
      if (p._coincidentalColor) {
        groups.push([p]);
        return;
      }
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
    var coincidentalColor = group[0]._coincidentalColor || null;
    var rowStyle = isEjection           ? ' style="background-color:#3a0000;"'
                 : coincidentalColor    ? ' style="background-color:' + coincidentalColor + ';"'
                 : '';

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
    '<table class="team-pair" width="100%" style="border:none;">' +
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

// Returns true if the goalie had a shutout until garbage time after the opponent's goalie pull.
// Scenario: opponent pulls goalie → goalie's team scores EN → opponent scores back with goalie in.
// All goals against must come after an EN goal for the goalie's team and be scored 5v5 (goalie back in).
function hadShutoutUntilGarbageTime(plays, goalieTeamId, homeTeamId) {
  var goals = plays.filter(function (p) {
    return p.typeDescKey === 'goal' && (p.periodDescriptor || {}).periodType !== 'SO';
  });
  var goalsAgainst = goals.filter(function (g) {
    return (g.details || {}).eventOwnerTeamId !== goalieTeamId;
  });
  if (goalsAgainst.length === 0) return false;
  var firstPeriod = parseInt((goalsAgainst[0].periodDescriptor || {}).number) || 0;
  if (firstPeriod < 3) return false;
  // Walk goals in order, track when the goalie's team scores an EN (opponent goalie pulled).
  var seenENGoalFor    = false;
  var totalAgainst     = 0;
  var garbageAgainst   = 0;
  goals.forEach(function (g) {
    var code        = g.situationCode || '1551';
    var scoringHome = (g.details || {}).eventOwnerTeamId === homeTeamId;
    var isGoalieTeam = (g.details || {}).eventOwnerTeamId === goalieTeamId;
    if (isGoalieTeam) {
      var oppGoalieIn = scoringHome ? (code[0] === '1') : (code[3] === '1');
      if (!oppGoalieIn) seenENGoalFor = true;
    } else {
      totalAgainst++;
      if (seenENGoalFor) {
        // Garbage time: scoring team's goalie back in (5v5, not EA)
        var scoringGoalieIn = scoringHome ? (code[3] === '1') : (code[0] === '1');
        if (scoringGoalieIn) garbageAgainst++;
      }
    }
  });
  return totalAgainst > 0 && totalAgainst === garbageAgainst;
}

// Works out which of a team's goalies started and which is in net now.
// Ice time alone can't say — a starter pulled early has LESS TOI than the backup
// who finishes. The play-by-play can: every shot attempt records the goalie it
// was taken on (details.goalieInNetId).
//   starter = the first of this team's goalies seen in net
//   current = the last one seen — unless a goalie with ice time hasn't faced a
//             shot yet. He came in after the last shot, so he's in net now
//             (e.g. Varlamov right after Sorokin gets the hook).
// Known blind spot: a backup who fills in briefly (equipment, injury check),
// faces no shots, then hands the net back looks exactly like a starter being
// pulled — the TOI totals are identical — so the two get swapped.
// Returns { starterId, currentId }, both null until the first shot attempt.
function getGoalieOrder(goalies, plays) {
  var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
  var seen = {};
  var starterId = null, currentId = null;

  plays.forEach(function (p) {
    // Shootout attempts also carry goalieInNetId, but the SO isn't a goalie change
    if ((p.periodDescriptor || {}).periodType === 'SO') return;
    var id = (p.details || {}).goalieInNetId;
    var isOurs = played.some(function (g) { return g.playerId === id; });
    if (!isOurs) return;
    if (starterId === null) starterId = id;
    currentId = id;
    seen[id]  = true;
  });
  if (starterId === null) return { starterId: null, currentId: null };

  played.forEach(function (g) {
    if (!seen[g.playerId]) currentId = g.playerId;
  });
  return { starterId: starterId, currentId: currentId };
}

function buildLiveGoalies(leftGoalies, rightGoalies, leftAbbrev, rightAbbrev, leftPullShutout, rightPullShutout, leftGarbageShutout, rightGarbageShutout, isFinal, wentToOT, plays, isPreseason) {
  var MEDAL = '&#127941;'; // 🏅 sports medal
  var WALL  = '&#129521;'; // 🧱 brick wall

  function goalieRows(goalies, pullShutout, garbageShutout) {
    var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
    if (played.length === 0) {
      return '<tr><td colspan="5" style="opacity:0.5;font-size:9pt;">No data</td></tr>';
    }
    // Goalie in net now goes first, then the rest by TOI.
    // The starter is "pulled" only if someone else is in net now — and never in
    // preseason, where teams swap goalies mid-game on purpose to split the reps.
    var order = getGoalieOrder(played, plays || []);
    played.sort(function (a, b) {
      if (a.playerId === order.currentId) return -1;
      if (b.playerId === order.currentId) return 1;
      return parseTOISecs(b.toi) - parseTOISecs(a.toi);
    });
    return played.map(function (g, i) {
      var toiSecs = parseTOISecs(g.toi);
      var ga      = g.goalsAgainst != null ? g.goalsAgainst : null;
      var pulled  = !isPreseason && played.length > 1 && g.playerId === order.starterId &&
                    order.currentId !== order.starterId;
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
      if (!badgeParts && !pulled && i === 0 && garbageShutout && toiSecs >= 2400) {
        badgeParts = [MEDAL, 'Shutout until garbage time after goalie pull (laaame).'];
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

  function goalieTable(goalies, label, pullShutout, garbageShutout) {
    return '<table width="100%">' +
      '<thead><tr><th colspan="5">' + label + '</th></tr>' + thead + '</thead>' +
      '<tbody>' + goalieRows(goalies, pullShutout, garbageShutout) + '</tbody>' +
      '</table>';
  }

  return '<h3 style="margin-top:20px;margin-bottom:4px;">GOALIES</h3>' +
    '<table class="team-pair" width="100%" style="border:none;">' +
    '<tr>' +
    '<td width="50%" valign="top" style="border:none;padding-right:4px;">' + goalieTable(leftGoalies,  leftAbbrev,  leftPullShutout,  leftGarbageShutout)  + '</td>' +
    '<td width="50%" valign="top" style="border:none;padding-left:4px;">'  + goalieTable(rightGoalies, rightAbbrev, rightPullShutout, rightGarbageShutout) + '</td>' +
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

// --- Team stats ---

function buildTeamStats(boxscore, awayStats, homeStats, plays, homeTeamId) {
  var home = boxscore.homeTeam || {};
  var away = boxscore.awayTeam || {};

  // Sum a per-player stat across forwards + defense for one team
  function sumStat(stats, field) {
    return ((stats.forwards || []).concat(stats.defense || []))
      .reduce(function (n, p) { return n + (p[field] || 0); }, 0);
  }

  // Derive hit, faceoff, PIM totals from play-by-play
  var homeHits = 0, awayHits = 0;
  var homeFOW = 0, awayFOW = 0, totalFO = 0;
  var homePIM = 0, awayPIM = 0;
  (plays || []).forEach(function (p) {
    var d   = p.details || {};
    var own = d.eventOwnerTeamId;
    if (p.typeDescKey === 'hit') {
      if (own === homeTeamId) homeHits++; else awayHits++;
    } else if (p.typeDescKey === 'faceoff') {
      totalFO++;
      if (own === homeTeamId) homeFOW++; else awayFOW++;
    } else if (p.typeDescKey === 'penalty') {
      var dur = d.duration || 0;
      if (dur > 0 && dur < 10) {
        if (own === homeTeamId) homePIM += dur; else awayPIM += dur;
      }
    }
  });

  var homeFOPct = totalFO > 0 ? (homeFOW / totalFO * 100).toFixed(1) + '%' : null;
  var awayFOPct = totalFO > 0 ? (awayFOW / totalFO * 100).toFixed(1) + '%' : null;
  var homeBlk = sumStat(homeStats, 'blockedShots');
  var awayBlk = sumStat(awayStats, 'blockedShots');

  function row(label, aVal, hVal) {
    if (aVal == null && hVal == null) return null;
    var a = aVal != null && aVal !== '' ? aVal : '&mdash;';
    var h = hVal != null && hVal !== '' ? hVal : '&mdash;';
    return '<tr>' +
      '<td>' + label + '</td>' +
      '<td style="text-align:center;">' + a + '</td>' +
      '<td style="text-align:center;">' + h + '</td>' +
      '</tr>';
  }

  var rows = [
    row('Shots',         away.sog,  home.sog),
    row('Faceoff %',     awayFOPct, homeFOPct),
    row('Blocked Shots', awayBlk || null, homeBlk || null),
    row('Hits',          awayHits || null, homeHits || null),
    (homePIM || awayPIM) ? row('PIM', awayPIM, homePIM) : null,
  ].filter(Boolean);

  if (!rows.length) return '';

  return '<h3 style="margin-top:20px;margin-bottom:4px;">TEAM STATS</h3>' +
    '<table width="100%" style="border:none;"><tr><td style="border:none;">' +
    '<table>' +
    '<thead><tr>' +
      '<th></th>' +
      '<th style="text-align:center;">' + (away.abbrev || '') + '</th>' +
      '<th style="text-align:center;">' + (home.abbrev || '') + '</th>' +
    '</tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody>' +
    '</table>' +
    '</td></tr></table>';
}

// --- Live feed ---

// --- Live feed (paged) ---

// Which live-feed page is showing (0 = newest). The one piece of shared state in
// this file: the scoreboard is rebuilt from scratch on every 30s refresh, and
// this keeps the reader on the page they picked. Reset when the game changes
// (live-game.js). Lives here, not live-game.js, so game.html's play log pages too.
var _liveFeedPage = 0;
var LIVE_FEED_PAGE_SIZE = 15;

// What the pager needs besides the page number, set by buildLiveFeed so a page
// click can redraw the pager without rebuilding the feed: whether the game is
// over (names the jump-to-page-1 link) and each started period's first page.
var _liveFeedNav = { isFinal: false, periods: [] };

function feedWords(key) { return (key || '').replace(/-/g, ' '); }

function feedAttr(text) {
  return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Who a delayed penalty is against, as "against NYI (Palmieri)" / "against NYI",
// or '' when it can't be told. NOT from the event's own eventOwnerTeamId: that
// has meant the drawing team in one game and the penalized team in another (see
// notes.md). Instead:
//   1. the actual penalty, recorded at the whistle — first `penalty` after this
//      event and before the next faceoff (a penalty's team is reliable);
//   2. still in progress: the team that pulled its goalie drew it, so it's
//      against the other team (situationCode = awayGoalie awaySk homeSk homeGoalie);
//   3. otherwise nothing, rather than a guess.
function delayedPenaltyAgainst(plays, idx, teamAbbrev, lastName, homeAbbrev, awayAbbrev, playerTeam) {
  for (var j = idx + 1; j < plays.length; j++) {
    var q = plays[j];
    if (q.typeDescKey === 'faceoff') break;
    if (q.typeDescKey === 'penalty') {
      var qd = q.details || {};
      return 'against ' + (playerTeam[qd.committedByPlayerId] || teamAbbrev(qd.eventOwnerTeamId)) +
        (qd.committedByPlayerId ? ' (' + lastName(qd.committedByPlayerId) + ')' : '');
    }
  }
  var code = plays[idx].situationCode || '';
  if (code.length === 4) {
    if (code[0] === '0') return 'against ' + homeAbbrev;   // away pulled its goalie
    if (code[3] === '0') return 'against ' + awayAbbrev;   // home pulled its goalie
  }
  return '';
}

// Every play-by-play event, as [label, detail]. Detail is plain text.
// `plays` and `idx` (its place in chronological order) are only needed for
// events that depend on what came next — delayed penalties.
//
// Each player is labelled with THEIR OWN team (playerTeam, from the game roster),
// not the event's eventOwnerTeamId: on blocked shots that's the shooting team,
// so "Pettersson (NYI) blocks Aitcheson" came out for a NYR block. The event's
// team is only a fallback for when there's no player (e.g. a bench penalty).
function describeFeedEvent(p, teamAbbrev, lastName, plays, idx, homeAbbrev, awayAbbrev, playerTeam) {
  var t = p.typeDescKey;
  var d = p.details || {};
  var teamOf = function (id) { return playerTeam[id] || teamAbbrev(d.eventOwnerTeamId); };
  var who    = function (id) { return lastName(id) + ' (' + teamOf(id) + ')'; };

  switch (t) {
    case 'goal':
      return ['<b>GOAL</b>', teamOf(d.scoringPlayerId) + ' — ' + lastName(d.scoringPlayerId) +
        (d.shotType ? ' (' + feedWords(d.shotType) + ')' : '')];
    case 'shot-on-goal':
      return ['Shot', who(d.shootingPlayerId) + (d.shotType ? ' — ' + feedWords(d.shotType) : '')];
    case 'missed-shot':
      return ['Missed shot', who(d.shootingPlayerId) + (d.reason ? ' — ' + feedWords(d.reason) : '')];
    case 'blocked-shot':
      return ['Block', who(d.blockingPlayerId) + (d.shootingPlayerId ? ' blocks ' + lastName(d.shootingPlayerId) : '')];
    case 'hit':
      return ['Hit', who(d.hittingPlayerId) + (d.hitteePlayerId ? ' hits ' + lastName(d.hitteePlayerId) : '')];
    case 'penalty':
      return ['Penalty', (d.committedByPlayerId ? lastName(d.committedByPlayerId) : 'Bench') +
        ' (' + teamOf(d.committedByPlayerId) + ') — ' + feedWords(d.descKey) +
        (d.duration ? ', ' + d.duration + ' min' : '')];
    case 'delayed-penalty':
      return ['Delayed penalty', delayedPenaltyAgainst(plays, idx, teamAbbrev, lastName, homeAbbrev, awayAbbrev, playerTeam)];
    case 'faceoff':
      return ['Faceoff', who(d.winningPlayerId) + (d.losingPlayerId ? ' beats ' + lastName(d.losingPlayerId) : '')];
    case 'giveaway':
      return ['Giveaway', who(d.playerId)];
    case 'takeaway':
      return ['Takeaway', who(d.playerId)];
    case 'stoppage':
      return ['Stoppage', feedWords(d.reason) + (d.secondaryReason ? ' + ' + feedWords(d.secondaryReason) : '')];
    case 'period-start':
      return ['Period start', ''];
    case 'period-end':
      return ['End of period', ''];
    case 'game-end':
      return ['<b>Game over</b>', ''];
    default:
      // Anything the NHL adds later (shootout events etc.) still shows, by name.
      return [feedWords(t).replace(/^./, function (c) { return c.toUpperCase(); }), ''];
  }
}

// Pager, two rows:
//   Latest          « Prev | Page 2 of 21 | Next »
//                   1st · 2nd · 3rd · OT
// "Latest" (or "End of game" once it's final) jumps to page 1 — the feed is
// newest first. It's pinned to the left; Prev / Page / Next stay centered in
// the same fixed spot as before (the 25/25/120px/25/25 split is symmetric).
// The period links jump to the page holding that period's first event, and
// only appear once the period has started — every OT and a shootout included.
function buildLiveFeedPager(pageIdx, pageCount) {
  if (pageCount < 2) return '';
  function link(label, target) {
    if (target < 0 || target >= pageCount || target === pageIdx) {
      return '<span style="opacity:0.35;">' + label + '</span>';
    }
    return '<a href="#" onclick="showLiveFeedPage(' + target + ');return false;">' + label + '</a>';
  }
  var cell = 'border:none;padding:0;';
  // ⇤ (arrow to bar) = "jump all the way", distinct from Prev's single «.
  // Deliberately not ⏮, which many systems draw as a color emoji.
  var latestLabel = '&#8676; ' + (_liveFeedNav.isFinal ? 'End of game' : 'Latest');

  var periodLinks = _liveFeedNav.periods.map(function (per) {
    return '<a href="#" onclick="showLiveFeedPage(' + per.page + ');return false;">' + per.label + '</a>';
  }).join(' &middot; ');

  return '<table style="border:none;margin-top:6px;font-size:9pt;">' +
    '<tr>' +
      '<td style="' + cell + 'width:25%;text-align:left;white-space:nowrap;">' + link(latestLabel, 0) + '</td>' +
      '<td style="' + cell + 'width:25%;text-align:right;">' + link('&laquo; Prev', pageIdx - 1) + '</td>' +
      '<td style="' + cell + 'width:120px;min-width:120px;text-align:center;white-space:nowrap;">' +
        'Page ' + (pageIdx + 1) + ' of ' + pageCount + '</td>' +
      '<td style="' + cell + 'width:25%;text-align:left;">' + link('Next &raquo;', pageIdx + 1) + '</td>' +
      '<td style="' + cell + 'width:25%;"></td>' +
    '</tr>' +
    (periodLinks
      ? '<tr><td style="' + cell + '"></td>' +
        '<td colspan="3" style="' + cell + 'text-align:center;padding-top:4px;">' +
          '<span style="color:#888;">Jump to start of:</span> ' + periodLinks + '</td>' +
        '<td style="' + cell + '"></td></tr>'
      : '') +
    '</table>';
}

// Pager click: every page's rows are already in the table (hidden), so this just
// swaps which ones show — no refetch, no rebuild.
function showLiveFeedPage(pageIdx) {
  var body = document.getElementById('live-feed-body');
  if (!body) return;
  var pageCount = parseInt(body.getAttribute('data-page-count'), 10) || 1;
  _liveFeedPage = Math.max(0, Math.min(pageIdx, pageCount - 1));
  Array.prototype.forEach.call(body.rows, function (row) {
    row.style.display = String(_liveFeedPage) === row.getAttribute('data-feed-page') ? '' : 'none';
  });
  var pager = document.getElementById('live-feed-pager');
  if (pager) pager.innerHTML = buildLiveFeedPager(_liveFeedPage, pageCount);
}

function buildLiveFeed(plays, rosterMap, homeId, homeAbbrev, awayAbbrev, isFinal, nyiGameNum, nhlGameNum, playerTeam) {
  playerTeam = playerTeam || {};
  var feed = plays.slice().reverse();   // every event the NHL logs, newest first
  if (!feed.length) return '';

  var size      = LIVE_FEED_PAGE_SIZE;
  var pageCount = Math.ceil(feed.length / size);
  if (_liveFeedPage > pageCount - 1) _liveFeedPage = pageCount - 1;

  // Jump targets for the pager: each period's first event (normally its
  // period-start), in the order the periods happened. Built from whatever
  // periods the play-by-play has, so any number of OTs works.
  var firstIdxByPeriod = {};
  var periodOrder = [];
  plays.forEach(function (p, k) {
    var pd  = p.periodDescriptor || {};
    var key = pd.periodType === 'SO' ? 'SO' : String(pd.number || 0);
    if (!(key in firstIdxByPeriod)) { firstIdxByPeriod[key] = k; periodOrder.push({ key: key, number: pd.number || 0 }); }
  });
  _liveFeedNav = {
    isFinal: !!isFinal,
    periods: periodOrder
      .filter(function (per) { return per.key === 'SO' || per.number > 0; })
      .map(function (per) {
        var feedIdx = plays.length - 1 - firstIdxByPeriod[per.key];   // position in newest-first order
        return {
          label: per.key === 'SO' ? 'SO' : liveGamePeriodLabel(per.number),
          page:  Math.floor(feedIdx / size),
        };
      }),
  };

  function teamAbbrev(teamId) { return teamId === homeId ? homeAbbrev : awayAbbrev; }
  function lastName(id) { var n = rosterMap[id] || ''; return n.split(' ').slice(-1)[0] || '?'; }

  var cellCss = 'font-size:9pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  function row(page, cells) {
    return '<tr data-feed-page="' + page + '"' + (page === _liveFeedPage ? '' : ' style="display:none;"') + '>' +
      cells + '</tr>';
  }

  var rows = feed.map(function (p, i) {
    var pd     = p.periodDescriptor || {};
    var period = pd.periodType === 'SO' ? 'SO' : liveGamePeriodLabel(pd.number || 0);
    var ev     = describeFeedEvent(p, teamAbbrev, lastName, plays, plays.length - 1 - i, homeAbbrev, awayAbbrev, playerTeam);
    return row(Math.floor(i / size),
      '<td style="' + cellCss + '">' + period + ' ' + (p.timeInPeriod || '') + '</td>' +
      '<td style="' + cellCss + '">' + ev[0] + '</td>' +
      '<td style="' + cellCss + '" title="' + feedAttr(ev[1]) + '">' + ev[1] + '</td>');
  });

  // Blank rows so the last page is as tall as the rest and the pager stays put.
  // Only once there's a pager: early in a game a single short page just grows.
  var lastPage = pageCount - 1;
  for (var b = feed.length; pageCount > 1 && b < pageCount * size; b++) {
    rows.push(row(lastPage, '<td style="' + cellCss + '">&nbsp;</td><td style="' + cellCss + '"></td><td style="' + cellCss + '"></td>'));
  }

  var gameLabel = nyiGameNum
    ? ' &mdash; <span' + (nhlGameNum ? ' title="NHL Game ' + nhlGameNum + '"' : '') + ' style="cursor:default;">Game ' + nyiGameNum + '</span>'
    : '';
  var title = (isFinal ? 'PLAY LOG' : 'LIVE FEED') + gameLabel;
  return '<h3 style="margin-top:20px;margin-bottom:4px;">' + title + '</h3>' +
    '<table width="100%" style="border:none;"><tr><td style="border:none;">' +
    '<table style="table-layout:fixed;">' +
    '<colgroup><col style="width:80px;"><col style="width:110px;"><col></colgroup>' +
    '<thead>' +
      '<tr><th style="font-size:8pt;">Time</th><th style="font-size:8pt;">Event</th><th style="font-size:8pt;">Details</th></tr>' +
    '</thead>' +
    '<tbody id="live-feed-body" data-page-count="' + pageCount + '">' + rows.join('') + '</tbody>' +
    '</table>' +
    '<div id="live-feed-pager">' + buildLiveFeedPager(_liveFeedPage, pageCount) + '</div>' +
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

  var awayPullShutout    = hadShutoutUntilGoaliePull(plays, away.id, home.id);
  var homePullShutout    = hadShutoutUntilGoaliePull(plays, home.id, home.id);
  var awayGarbageShutout = hadShutoutUntilGarbageTime(plays, away.id, home.id);
  var homeGarbageShutout = hadShutoutUntilGarbageTime(plays, home.id, home.id);
  var wentToOT = ((boxscore.periodDescriptor || {}).number || 0) > 3;
  var wentToSO = plays.some(function (p) {
    return (p.periodDescriptor || {}).periodType === 'SO';
  });

  // Away is always left column, home is always right column — consistent with header.
  var nyiIsHome = home.abbrev === 'NYI';
  var shootoutSection = (isFinal && wentToSO && boxscore.gameType === 2)
    ? buildShootoutBoard(boxscore, playByPlay)
    : '';
  return buildHighScoringBanner(plays, homeStats, awayStats) +
    buildLiveHeader(boxscore, plays) +
    shootoutSection +
    buildLiveGoals(plays, rosterMap, home.id, home.abbrev, away.abbrev, isFinal, awayShutoutImg, homeShutoutImg) +
    buildLivePenalties(plays, rosterMap, home.id, home.abbrev, away.abbrev) +
    buildLiveGoalies(awayStats.goalies, homeStats.goalies, away.abbrev, home.abbrev, awayPullShutout, homePullShutout, awayGarbageShutout, homeGarbageShutout, isFinal, wentToOT, plays, boxscore.gameType === 1) +
    buildLiveSkaters(awayStats, homeStats, away.abbrev, home.abbrev, plays, (boxscore.periodDescriptor || {}).number) +
    buildTeamStats(boxscore, awayStats, homeStats, plays, home.id) +
    buildLiveGraph(boxscore, playByPlay, nyiIsHome, gameId) +
    buildLiveFeed(plays, rosterMap, home.id, home.abbrev, away.abbrev, isFinal, nyiGameNum, nhlGameNum,
      buildPlayerTeamMap((playByPlay || {}).rosterSpots, home, away));
}
