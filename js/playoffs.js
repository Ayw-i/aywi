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
  if (topWins === 4)    return topAbbrev    + ' wins 4–' + bottomWins;
  if (bottomWins === 4) return bottomAbbrev + ' wins 4–' + topWins;
  if (topWins === 0 && bottomWins === 0) return 'Series not yet begun';
  if (topWins > bottomWins)  return topAbbrev    + ' leads ' + topWins    + '–' + bottomWins;
  if (bottomWins > topWins)  return bottomAbbrev + ' leads ' + bottomWins + '–' + topWins;
  return 'Series tied ' + topWins + '–' + bottomWins;
}

// Replace any appearance of John Tavares with snake emoji
function jafares(name) {
  return name ? name.replace(/John Tavares/gi, Math.random() < 0.5 ? '🐍' : 'Jafares') : name;
}

// --- Reverse-sweep detection ---

var _bracketYear = null; // set by loadPlayoffsPage

// Hard-coded historical reverse sweeps (bracket API lacks per-game data for past seasons).
var HISTORICAL_REVERSE_SWEEPS = [
  { year: 2014, loser: 'SJS' }, // LAK came back from 0-3 vs SJS
];

// Returns the abbrev of the team that led 3-0 but is now tied 3-3 (reverse sweep watch), or null.
function detectReverseSweptWatch(series) {
  var games = series.games;
  if (!games || games.length < 6) return null;
  var topAbbrev = (series.topSeedTeam || {}).abbrev;
  var winners = [];
  for (var i = 0; i < 6; i++) {
    var g = games[i];
    if (!g) return null;
    var winner = null;
    if (g.topSeedScore !== undefined && g.bottomSeedScore !== undefined) {
      winner = g.topSeedScore > g.bottomSeedScore ? 'top' : 'bottom';
    } else if (g.homeScore !== undefined && g.visitingScore !== undefined && g.homeTeamAbbrev) {
      var homeIsTop = g.homeTeamAbbrev === topAbbrev;
      winner = (g.homeScore > g.visitingScore) === homeIsTop ? 'top' : 'bottom';
    } else {
      return null;
    }
    winners.push(winner);
  }
  var first3 = winners.slice(0, 3);
  if (first3.every(function (w) { return w === 'top'; }))    return topAbbrev;
  if (first3.every(function (w) { return w === 'bottom'; })) return (series.bottomSeedTeam || {}).abbrev;
  return null;
}

// Returns the abbrev of the team that was reverse-swept (led 3-0 then lost 4-3), or null.
function detectReverseSwept(series) {
  var games = series.games;
  if (!games || games.length < 7) {
    // Fall back to hard-coded list for historical seasons
    if (!_bracketYear) return null;
    var tAbbrev = (series.topSeedTeam    || {}).abbrev;
    var bAbbrev = (series.bottomSeedTeam || {}).abbrev;
    for (var i = 0; i < HISTORICAL_REVERSE_SWEEPS.length; i++) {
      var h = HISTORICAL_REVERSE_SWEEPS[i];
      if (h.year === _bracketYear && (h.loser === tAbbrev || h.loser === bAbbrev)) {
        return h.loser;
      }
    }
    return null;
  }
  var topAbbrev = (series.topSeedTeam || {}).abbrev;

  var winners = [];
  for (var i = 0; i < 7; i++) {
    var g = games[i];
    if (!g) return null;
    var winner = null;
    if (g.topSeedScore !== undefined && g.bottomSeedScore !== undefined) {
      winner = g.topSeedScore > g.bottomSeedScore ? 'top' : 'bottom';
    } else if (g.homeScore !== undefined && g.visitingScore !== undefined && g.homeTeamAbbrev) {
      var homeIsTop = g.homeTeamAbbrev === topAbbrev;
      var homeWon   = g.homeScore > g.visitingScore;
      winner = (homeWon === homeIsTop) ? 'top' : 'bottom';
    } else {
      return null;
    }
    winners.push(winner);
  }

  var first3 = winners.slice(0, 3);
  if (first3.every(function (w) { return w === 'top'; })) {
    // Top won first 3; if total top wins = 3 they lost the series → reverse swept
    if (winners.filter(function (w) { return w === 'top'; }).length === 3) {
      return topAbbrev;
    }
  }
  if (first3.every(function (w) { return w === 'bottom'; })) {
    if (winners.filter(function (w) { return w === 'bottom'; }).length === 3) {
      return (series.bottomSeedTeam || {}).abbrev;
    }
  }
  return null;
}

// --- Fraud image hover (potential-fraud.jpg) ---

var _fraudImgEl = null;
function getFraudImgEl() {
  if (!_fraudImgEl) {
    _fraudImgEl = document.createElement('img');
    _fraudImgEl.src = 'assets/potential-fraud.jpg';
    _fraudImgEl.style.cssText = 'position:fixed;z-index:999;pointer-events:none;display:none;width:200px;';
    document.body.appendChild(_fraudImgEl);
  }
  return _fraudImgEl;
}
function showFraudImg(el, e) {
  var img = getFraudImgEl();
  img.style.left = (e.clientX + 14) + 'px';
  img.style.top  = (e.clientY + 14) + 'px';
  img.style.display = 'block';
}
function moveFraudImg(e) {
  var img = getFraudImgEl();
  img.style.left = (e.clientX + 14) + 'px';
  img.style.top  = (e.clientY + 14) + 'px';
}
function hideFraudImg() {
  getFraudImgEl().style.display = 'none';
}

// --- Reverse-sweep hover (eddie-westfall-sends-his-regards.jpg) ---

var _revSwEl = null;
function getRevSwEl() {
  if (!_revSwEl) {
    _revSwEl = document.createElement('div');
    _revSwEl.style.cssText = 'position:fixed;z-index:999;pointer-events:none;display:none;' +
      'background:#000;border:1px solid #fff;padding:6px;text-align:center;width:180px;';
    _revSwEl.innerHTML = '<img src="assets/eddie-westfall-sends-his-regards.jpg" ' +
      'style="width:100%;display:block;margin-bottom:5px;">' +
      '<span style="color:#fff;font-size:8pt;font-family:Helvetica,Arial,sans-serif;' +
      'letter-spacing:1px;">ED WESTFALL SENDS HIS REGARDS</span>';
    document.body.appendChild(_revSwEl);
  }
  return _revSwEl;
}
function showRevSwHover(el, e) {
  var el2 = getRevSwEl();
  el2.style.left = (e.clientX + 14) + 'px';
  el2.style.top  = (e.clientY + 14) + 'px';
  el2.style.display = 'block';
}
function moveRevSwHover(e) {
  var el2 = getRevSwEl();
  el2.style.left = (e.clientX + 14) + 'px';
  el2.style.top  = (e.clientY + 14) + 'px';
}
function hideRevSwHover() {
  getRevSwEl().style.display = 'none';
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
  var awayGoalieIn = code[0] === '1';
  var awaySkaters  = parseInt(code[1]) || 5;
  var homeSkaters  = parseInt(code[2]) || 5;
  var homeGoalieIn = code[3] === '1';
  var scoringHome  = (play.details || {}).eventOwnerTeamId === homeTeamId;

  var scoringGoalieIn = scoringHome ? homeGoalieIn : awayGoalieIn;
  var defendGoalieIn  = scoringHome ? awayGoalieIn : homeGoalieIn;
  var scoringSkaters  = scoringHome ? homeSkaters  : awaySkaters;
  var defendSkaters   = scoringHome ? awaySkaters  : homeSkaters;

  if (!defendGoalieIn) return 'EN';

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

function formatGoalLine(g, rosterMap, homeTeamId) {
  var d      = g.details || {};
  var time   = (g.timeInPeriod || '?').replace(/^0/, '');
  var scorer = jafares(rosterMap[d.scoringPlayerId] || '?');
  var a1raw  = rosterMap[d.assist1PlayerId];
  var a2raw  = rosterMap[d.assist2PlayerId];
  var a1     = a1raw ? jafares(a1raw) : null;
  var a2     = a2raw ? jafares(a2raw) : null;

  var assists;
  if (a1 && a2) assists = ' from ' + a1 + ' and ' + a2;
  else if (a1)  assists = ' from ' + a1;
  else          assists = ' (unassisted)';

  var sit    = playoffsGetSituationLabel(g, homeTeamId);
  var sitTag = (sit && sit !== '5v5') ? ' (' + sit + ')' : '';

  return time + ': ' + scorer + assists + sitTag;
}

// --- Series card (used in bracket) ---

function buildSeriesCard(series, seedLabels) {
  seedLabels = seedLabels || {};

  var top    = series.topSeedTeam    || {};
  var bottom = series.bottomSeedTeam || {};

  var topAbbrev    = top.abbrev    || 'TBD';
  var bottomAbbrev = bottom.abbrev || 'TBD';
  var topWins      = series.topSeedWins    || 0;
  var bottomWins   = series.bottomSeedWins || 0;

  var isNYI      = topAbbrev === 'NYI' || bottomAbbrev === 'NYI';
  var seriesOver = topWins === 4 || bottomWins === 4;
  var status     = seriesStatusText(topAbbrev, topWins, bottomAbbrev, bottomWins);

  var winner = seriesOver ? (topWins === 4 ? topAbbrev : bottomAbbrev) : null;
  var loser  = seriesOver ? (topWins === 4 ? bottomAbbrev : topAbbrev) : null;

  // 6a: higher seed (top) down 2+ in an active series → fraud
  var topFraud = !seriesOver && (bottomWins - topWins) >= 2;

  // 6b: down 3-0 in an active series
  var topDown3    = !seriesOver && topWins === 0    && bottomWins === 3;
  var bottomDown3 = !seriesOver && bottomWins === 0 && topWins === 3;

  // 6c: swept (4-0)
  var topSwept    = seriesOver && loser === topAbbrev    && topWins === 0;
  var bottomSwept = seriesOver && loser === bottomAbbrev && bottomWins === 0;

  // 6d: gentleman's swept (4-1)
  var topGentSwept    = seriesOver && loser === topAbbrev    && topWins === 1;
  var bottomGentSwept = seriesOver && loser === bottomAbbrev && bottomWins === 1;

  // 6e: reverse swept (won first 3, lost next 4)
  var topRevSwept = false, bottomRevSwept = false;
  if (seriesOver && topWins + bottomWins === 7) {
    var rsLoser = detectReverseSwept(series);
    if (rsLoser === topAbbrev)    topRevSwept    = true;
    if (rsLoser === bottomAbbrev) bottomRevSwept = true;
  }

  // 6f: reverse sweep watch (led 3-0, now tied 3-3)
  var topRevSwWatch = false, bottomRevSwWatch = false;
  if (!seriesOver && topWins === 3 && bottomWins === 3) {
    var rswLoser = detectReverseSweptWatch(series);
    if (rswLoser === topAbbrev)    topRevSwWatch    = true;
    if (rswLoser === bottomAbbrev) bottomRevSwWatch = true;
  }

  var tableStyle = 'border-collapse:collapse;margin-bottom:8px;width:100%;' +
    (isNYI ? 'outline:1px solid white;' : '');

  function teamCell(abbrev, isTop) {
    var isFaded = seriesOver && abbrev === loser;
    var isNYITeam = abbrev === 'NYI';
    // Only the higher seed (top seed) gets the fraud treatment; never applied to NYI
    var isFraud = isTop && topFraud && !isNYITeam;
    var isDown3   = (isTop ? topDown3      : bottomDown3)     && !isNYITeam;
    var isSwept   = (isTop ? topSwept      : bottomSwept)     && !isNYITeam;
    var isGent    = (isTop ? topGentSwept  : bottomGentSwept) && !isNYITeam;
    var isRevSw   = (isTop ? topRevSwept   : bottomRevSwept)  && !isNYITeam;
    var isRevSwW  = (isTop ? topRevSwWatch : bottomRevSwWatch) && !isNYITeam;

    var textColor = isFraud ? '#FF69B4'
                  : isSwept ? '#880000'
                  : isRevSw ? '#660066'
                  : isDown3 ? '#CC2222'
                  : '';
    // For swept/reverse-swept teams: fade logo+name individually so emojis stay at full opacity.
    // For all other eliminated teams: fade the whole cell.
    var cellOpacity  = (isFaded && !isSwept && !isRevSw) ? 'opacity:0.4;' : '';
    var innerOpacity = (isSwept || isRevSw) ? 'opacity:0.4;' : '';

    var leftEmoji = '', rightEmoji = '';
    if (isRevSw) {
      leftEmoji  = '<span style="display:inline-block;transform:rotate(180deg);line-height:1;">🧹</span>';
      rightEmoji = '<span style="display:inline-block;transform:rotate(180deg);line-height:1;">🧹</span>';
    } else if (isSwept) {
      leftEmoji  = '🧹';
      rightEmoji = '🧹';
    } else if (isGent) {
      leftEmoji  = '🎩';
      rightEmoji = '🧹';
    } else if (isRevSwW) {
      leftEmoji  = '<span style="opacity:0.3;">👀</span>';
      rightEmoji = '<span style="opacity:0.3;display:inline-block;transform:rotate(180deg);line-height:1;">🧹</span>';
    } else if (isDown3) {
      leftEmoji  = '<span style="opacity:0.3;">👀</span>';
      rightEmoji = '<span style="opacity:0.3;">🧹</span>';
    }

    var innerStyle = isRevSw ? 'display:inline-block;transform:rotate(180deg);' : '';

    var fraudAttr = isFraud
      ? ' onmouseover="showFraudImg(this,event)" onmousemove="moveFraudImg(event)" onmouseout="hideFraudImg()"'
      : '';
    var revSwAttr = isRevSw
      ? ' onmouseover="showRevSwHover(this,event)" onmousemove="moveRevSwHover(event)" onmouseout="hideRevSwHover()"'
      : '';

    var seed = seedLabels[abbrev] || '';
    var nameColor = textColor ? 'color:' + textColor + ';' : '';

    var EC = 'border:none;vertical-align:middle;padding:0 2px;font-size:14pt;';
    var textHTML = (leftEmoji || rightEmoji)
      ? '<table style="margin:0 auto;border-collapse:collapse;border:none;"><tr>' +
          '<td style="' + EC + '">' + (leftEmoji  || '') + '</td>' +
          '<td style="border:none;vertical-align:middle;padding:0;' + innerOpacity + '">' +
            '<div style="font-size:8pt;' + nameColor + '">' + abbrev + '</div>' +
            (seed ? '<div style="font-size:7pt;color:#888;">' + seed + '</div>' : '') +
          '</td>' +
          '<td style="' + EC + '">' + (rightEmoji || '') + '</td>' +
        '</tr></table>'
      : '<div style="font-size:8pt;' + nameColor + '">' + abbrev + '</div>' +
        (seed ? '<div style="font-size:7pt;color:#888;">' + seed + '</div>' : '');

    var imgStyle = 'display:block;margin:0 auto 3px;' + innerOpacity;
    var content = '<span style="' + innerStyle + '">' +
      '<img src="' + playoffsLogoURL(abbrev) + '" width="36" alt="' + abbrev + '" ' +
      'onerror="this.style.display=\'none\'" style="' + imgStyle + '">' +
      textHTML +
      '</span>';

    return '<td align="center" width="30%" style="border:none;padding:4px 2px;' + cellOpacity + '"' + fraudAttr + revSwAttr + '>' +
      content + '</td>';
  }

  function winsCell(abbrev, wins, isTop) {
    var isFaded = seriesOver && abbrev === loser;
    var isNYITeam = abbrev === 'NYI';
    var isFraud = isTop && topFraud && !isNYITeam;
    var isDown3 = (isTop ? topDown3 : bottomDown3) && !isNYITeam;
    var isSwept = (isTop ? topSwept : bottomSwept) && !isNYITeam;
    var isRevSw = (isTop ? topRevSwept : bottomRevSwept) && !isNYITeam;

    var textColor = isFraud ? 'color:#FF69B4;'
                  : isSwept ? 'color:#880000;'
                  : isRevSw ? 'color:#660066;'
                  : isDown3 ? 'color:#CC2222;'
                  : '';
    var cellOpacity = isFaded ? 'opacity:0.4;' : '';

    return '<td align="center" width="10%" style="border:none;font-size:18pt;font-weight:bold;padding:0 2px;' + textColor + cellOpacity + '">' + wins + '</td>';
  }

  // Higher seed (top) on the LEFT; lower seed (bottom) on the RIGHT
  return '<table style="' + tableStyle + '">' +
    '<tr>' +
    teamCell(topAbbrev, true) +
    winsCell(topAbbrev, topWins, true) +
    '<td align="center" width="20%" style="border:none;font-size:8pt;opacity:0.6;">vs</td>' +
    winsCell(bottomAbbrev, bottomWins, false) +
    teamCell(bottomAbbrev, false) +
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
    centerScore = (away.score || 0) + ' – ' + (home.score || 0);
    centerSub   = 'Final';
    if (game.gameOutcome) {
      if (game.gameOutcome.lastPeriodType === 'OT') centerSub = 'Final/OT';
      if (game.gameOutcome.lastPeriodType === 'SO') centerSub = 'Final/SO';
    }
  } else if (isLive) {
    var pd    = game.periodDescriptor || {};
    var clock = game.clock || {};
    centerScore = (away.score || 0) + ' – ' + (home.score || 0);
    var period = pd.number || 0;
    if (clock.inIntermission) {
      var intLabel = period === 1 ? '1st INT'
                   : period === 2 ? '2nd INT'
                   : period === 3 ? 'OT INT'
                   : playoffsPeriodLabel(period + 1) + ' INT';
      centerSub = clock.timeRemaining ? intLabel + ' · ' + clock.timeRemaining : intLabel;
    } else {
      centerSub = playoffsPeriodLabel(period) + ' · ' + (clock.timeRemaining || '');
    }
  } else {
    centerScore = formatGameStartTime(game.startTimeUTC);
    centerSub   = '';
  }

  var ss = game.seriesStatus || {};
  var seriesLine = '';
  if (ss.seriesTitle) {
    var tA = ss.topSeedTeamAbbrev || '', bA = ss.bottomSeedTeamAbbrev || '';
    var tW = ss.topSeedWins || 0,     bW = ss.bottomSeedWins || 0;
    var statusPart = (tW === 3 && bW === 3) ? '🚨 Game 7 🚨' : seriesStatusText(tA, tW, bA, bW);
    seriesLine = ss.seriesTitle + (tA ? ' — ' + statusPart : '');
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

function roundStarted(seriesList) {
  return seriesList.some(function (s) {
    return (s.topSeedWins || 0) + (s.bottomSeedWins || 0) > 0;
  });
}

function roundWrap(started, inner) {
  return started ? inner : '<div style="opacity:0.5;">' + inner + '</div>';
}

function buildConferenceColumn(allSeries, r1, r2, cf, confName, seedLabels) {
  function getSeries(letters) {
    return letters.map(function (l) {
      return allSeries.find(function (s) { return s.seriesLetter === l; });
    }).filter(Boolean);
  }

  var html = '<h3 style="text-align:center;font-size:12pt;margin:0 0 10px 0;">' + confName + '</h3>';

  var r1Series = getSeries(r1);
  if (r1Series.length) {
    html += roundWrap(roundStarted(r1Series),
      '<h4 style="' + ROUND_LABEL_STYLE + '">1st Round</h4>' +
      r1Series.map(function (s) { return buildSeriesCard(s, seedLabels); }).join(''));
  }

  var r2Series = getSeries(r2);
  if (r2Series.length) {
    html += roundWrap(roundStarted(r2Series),
      '<h4 style="' + ROUND_LABEL_STYLE + '">2nd Round</h4>' +
      r2Series.map(function (s) { return buildSeriesCard(s, seedLabels); }).join(''));
  }

  var cfSeries = getSeries([cf]);
  if (cfSeries.length) {
    html += roundWrap(roundStarted(cfSeries),
      '<h4 style="' + ROUND_LABEL_STYLE + '">Conference Final</h4>' +
      cfSeries.map(function (s) { return buildSeriesCard(s, seedLabels); }).join(''));
  }

  return html;
}

// --- Main ---

async function loadPlayoffsPage() {
  var season  = getSelectedSeason();
  var year    = parseInt(season.slice(4), 10);
  var nowYear = (function () {
    var now = new Date();
    return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  }());
  var isCurrent = (year === nowYear);

  _bracketYear = year;
  document.getElementById('season-picker').innerHTML = renderSeasonPicker();

  // Hide today's games section for historical seasons
  var todaySection = document.getElementById('today-games-section');
  if (!isCurrent) todaySection.style.display = 'none';

  try {
    var bracketData, seedLabels = {}, todayGames = [], pbpResults = [];

    if (isCurrent) {
      var results = await Promise.all([
        fetch(WORKER + '/v1/score/now'),
        fetch(WORKER + '/v1/playoff-bracket/' + year),
        fetch(WORKER + '/v1/standings/now'),
      ]);
      var scoreData = await results[0].json();
      bracketData   = await results[1].json();
      var standData = await results[2].json();

      // Build seed label map: A1, M2, WC1, etc.
      (standData.standings || []).forEach(function (t) {
        var abbrev = t.teamAbbrev && (t.teamAbbrev.default || t.teamAbbrev);
        if (!abbrev) return;
        if (t.divisionSequence && t.divisionSequence <= 3) {
          seedLabels[abbrev] = (t.divisionAbbrev || '') + t.divisionSequence;
        } else if (t.wildcardSequence && t.wildcardSequence <= 2) {
          seedLabels[abbrev] = 'WC' + t.wildcardSequence;
        }
      });

      todayGames = (scoreData.games || []).filter(function (g) { return g.gameType === 3; });
      pbpResults = await Promise.all(
        todayGames.map(function (g) {
          return fetch(WORKER + '/v1/gamecenter/' + g.id + '/play-by-play')
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });
        })
      );
    } else {
      bracketData = await fetch(WORKER + '/v1/playoff-bracket/' + year).then(function (r) { return r.json(); });
    }

    // Today's games (current season only)
    if (isCurrent) {
      var todayEl = document.getElementById('today-games');
      if (todayGames.length) {
        todayEl.innerHTML = todayGames.map(function (game, i) {
          return buildTodayGameCard(game, pbpResults[i]);
        }).join('');
      } else {
        todayEl.innerHTML = '<p style="opacity:0.5;font-size:10pt;">No playoff games today.</p>';
      }
    }

    // Bracket
    var bracketEl = document.getElementById('bracket');
    var allSeries = bracketData.series || [];

    if (!allSeries.length) {
      bracketEl.innerHTML = '<p style="opacity:0.5;font-size:10pt;">Bracket not yet available.</p>';
      return;
    }

    var eastHTML    = buildConferenceColumn(allSeries, ['A','B','C','D'], ['I','J'], 'M', 'Eastern Conference', seedLabels);
    var westHTML    = buildConferenceColumn(allSeries, ['E','F','G','H'], ['K','L'], 'N', 'Western Conference', seedLabels);
    var finalSeries = allSeries.find(function (s) { return s.seriesLetter === 'O'; });

    bracketEl.innerHTML =
      '<table width="100%" style="border:none;">' +
      '<tr>' +
      '<td width="50%" valign="top" style="border:none;padding-right:14px;">' + eastHTML + '</td>' +
      '<td width="50%" valign="top" style="border:none;padding-left:14px;">'  + westHTML + '</td>' +
      '</tr>' +
      '</table>' +
      (finalSeries
        ? roundWrap(roundStarted([finalSeries]),
            '<h3 style="text-align:center;font-size:12pt;margin:24px 0 10px 0;">Stanley Cup Final</h3>' +
            '<div style="max-width:300px;margin:0 auto;">' + buildSeriesCard(finalSeries, seedLabels) + '</div>')
        : '');

    document.getElementById('footer').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

  } catch (err) {
    console.error('Playoffs page load failed:', err);
    document.getElementById('bracket').innerHTML =
      '<p style="opacity:0.5;font-size:10pt;">Failed to load data.</p>';
  }
}

loadPlayoffsPage();
