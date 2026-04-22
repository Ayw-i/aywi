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
    if (scoringSkaters > defendSkaters) return 'PPG (EA)';
    if (scoringSkaters < defendSkaters) return 'SHG (EA)';
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

// --- Situation overlays ---

function buildPKOverlay(diff, doublePK, nextHomeGame) {
  var image = doublePK
    ? { type: 'double', src: 'assets/yapper200.gif' }
    : { type: 'single', src: 'assets/yapper100.gif' };

  var suffix = doublePK
    ? 'and we\'re killing off two bullshit penalties in this rigged league &mdash; ' +
      '<a href="https://www.cnib.ca/en">click here to donate money to Bettman</a>'
    : 'we\'re killing a bullshit penalty.';

  if (diff <= -4) {
    var footnote = doublePK
      ? '(Also, we\'re killing off two bullshit penalties in this rigged league)'
      : '(Also, we\'re killing a bullshit penalty.)';
    return { headline: 'Next home game: ' + (nextHomeGame || '&mdash;'), image: image, subHeadline: footnote };
  }

  var prefix;
  if      (diff >= 4) prefix = 'Yes! Yes! Yes! But ';
  else if (diff === 3) prefix = 'Yes!!! But ';
  else if (diff === 2) prefix = 'Yes! But ';
  else if (diff === 1) prefix = 'Yes. But ';
  else if (diff === 0) prefix = 'Not yet, and ';
  else if (diff === -1) prefix = 'No, and ';
  else if (diff === -2) prefix = 'Nope, and ';
  else                  prefix = 'Nooo, and ';

  return { headline: prefix + suffix, image: image, subHeadline: null };
}

function buildPPOverlay(diff, doublePP) {
  if (doublePP) {
    return {
      headline: "We're 5-on-3 so we've GOT to score here, right? Right?",
      image: { type: 'single', src: 'assets/barzal-the-muse.png' },
      subHeadline: null,
    };
  }

  var headline;
  if (diff >= 4)       headline = "Yes! Yes! Yes! And we're on the power play!";
  else if (diff === 3) headline = "Yes!!! And we're on the power play!";
  else if (diff === 2) headline = "Yes! And we're on the power play!";
  else if (diff === 1) headline = "Yes. And we're on the power play!";
  else if (diff === 0) headline = "Not yet, but we're on the power play.";
  else if (diff === -1) headline = "No, but we're on the power play.";
  else if (diff === -2) headline = "Nope, but we're on the power play.";
  else if (diff === -3) headline = "Nooo, but we're on the power play.";
  else                  headline = "No, but we're on the power play.";

  return {
    headline: headline,
    image: { type: 'grid', src: 'assets/barzal-the-muse.png' },
    subHeadline: 'We are on the New York Islanders Power Play (...can we decline?)',
  };
}

function buildPlayoffOTOverlay(gameNumber) {
  if (gameNumber === 6) {
    return {
      aboveImage: 'ANTHONY BEAUVILLIER IF YOU CAN HEAR US',
      aboveFontSize: '40pt',
      image: { type: 'pair', left: 'assets/beauv-mugshot.jpg', right: 'assets/please-save-me.jpg' },
      headline: 'PLEASE ANTHONY BEAUVILLIER PLEASE SAVE US PLEASE SAVE US ANTHONY BEAUVILLIER PLEASE I\'M ASKING YOU PLEASE SAVE US',
      fontSize: '28pt',
      background: '#0a0f2c',
      subHeadline: null,
    };
  }
  return {
    headline: 'OVERTIME.<br>PLAYOFF.<br>ISLANDERS.<br>HOCKEY.',
    fontSize: '56pt',
    background: '#0a0f2c',
    image: { type: 'single', src: 'assets/jon_bois.jpg' },
    subHeadline: null,
  };
}

function buildOTOverlay(nyiSkaters, oppSkaters) {
  var sub;
  if (nyiSkaters === oppSkaters) {
    sub = nyiSkaters === 4
      ? '(...with a few extra guys on the field)'
      : null; // standard 3v3
  } else if (nyiSkaters > oppSkaters) {
    sub = nyiSkaters >= 5
      ? '(double relish!)'
      : '(with a little extra relish on the side!)';
  } else {
    sub = oppSkaters >= 5
      ? '(hard mode against perpetually rigged league)'
      : '(against an uncalled too-many-men)';
  }
  return {
    headline: 'OVERTIME.',
    image: { type: 'single', src: 'assets/ot-utput.gif' },
    subHeadline: sub ? '<span style="font-size:14pt;">' + sub + '</span>' : null,
  };
}

function getSituationOverlay(boxscore, nyiIsHome, nextHomeGame) {
  var isFinal = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
  if (isFinal) return null;

  var code = boxscore.situation && boxscore.situation.situationCode;
  if (!code || code.length < 4) return null;

  var awaySkaters = parseInt(code[1]) || 5;
  var homeSkaters = parseInt(code[2]) || 5;
  var nyiSkaters  = nyiIsHome ? homeSkaters : awaySkaters;
  var oppSkaters  = nyiIsHome ? awaySkaters : homeSkaters;

  var pd = boxscore.periodDescriptor || {};
  if (pd.periodType === 'OT') {
    return boxscore.gameType === 3
      ? buildPlayoffOTOverlay((boxscore.seriesStatus || {}).gameNumberOfSeries)
      : buildOTOverlay(nyiSkaters, oppSkaters);
  }

  if (nyiSkaters === 5 && oppSkaters === 5) return null;

  var home = boxscore.homeTeam || {};
  var away = boxscore.awayTeam || {};
  var nyiScore = nyiIsHome ? (home.score || 0) : (away.score || 0);
  var oppScore = nyiIsHome ? (away.score || 0) : (home.score || 0);
  var diff = nyiScore - oppScore;

  if (oppSkaters > nyiSkaters) return buildPKOverlay(diff, nyiSkaters <= 3, nextHomeGame);
  if (nyiSkaters > oppSkaters) return buildPPOverlay(diff, oppSkaters <= 3);

  return null;
}

function buildReviewHTML() {
  return '<table style="width:100%;border-collapse:collapse;">' +
    '<tr>' +
    '<td style="width:50%;text-align:center;vertical-align:middle;padding:4px 8px 4px 0;">' +
    '<img src="assets/ref-review.jpg" style="max-width:100%;">' +
    '</td>' +
    '<td style="width:50%;vertical-align:top;padding:4px 0 4px 8px;">' +
    '<div id="video-analysis" tabindex="0" style="outline:1px solid #555;background:#000;display:block;">' +
    '<div style="overflow:hidden;line-height:0;">' +
    '<video id="review-video" src="assets/palmieris-butt-enhance-enhance.mp4"' +
    ' muted autoplay loop playsinline tabindex="-1"' +
    ' style="width:100%;display:block;cursor:crosshair;"></video>' +
    '</div>' +
    '<div style="font-size:9pt;padding:3px 4px;border-top:1px solid #333;text-align:left;">' +
    '<button id="review-halfspeed" style="font-family:inherit;font-size:9pt;background:#222;color:#fff;border:1px solid #555;padding:1px 5px;margin-right:6px;cursor:pointer;">0.5×</button>' +
    '<span style="opacity:0.5;">click to focus · ←→ frame · space play/pause · click zoom · right-click zoom out</span>' +
    '</div>' +
    '</div>' +
    '</td>' +
    '</tr>' +
    '</table>';
}

function setupVideoAnalysis() {
  var wrapper = document.getElementById('video-analysis');
  var videoEl = document.getElementById('review-video');
  var halfBtn = document.getElementById('review-halfspeed');
  if (!wrapper || !videoEl) return;

  var FPS = 30;
  var zoomLevel = 1;
  var isHalf = false;

  halfBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    isHalf = !isHalf;
    videoEl.playbackRate = isHalf ? 0.5 : 1;
    halfBtn.textContent = isHalf ? '1×' : '0.5×';
  });

  wrapper.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (videoEl.paused) videoEl.play(); else videoEl.pause();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      videoEl.pause();
      videoEl.currentTime = Math.max(0, videoEl.currentTime - 1 / FPS);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      videoEl.pause();
      videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 1 / FPS);
    }
  });

  videoEl.addEventListener('click', function (e) {
    wrapper.focus();
    zoomLevel = Math.min(zoomLevel + 0.5, 4);
    var rect = videoEl.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * 100;
    var y = ((e.clientY - rect.top) / rect.height) * 100;
    videoEl.style.transformOrigin = x + '% ' + y + '%';
    videoEl.style.transform = 'scale(' + zoomLevel + ')';
  });

  videoEl.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    zoomLevel = Math.max(1, zoomLevel - 0.5);
    if (zoomLevel === 1) {
      videoEl.style.transform = '';
      videoEl.style.transformOrigin = '';
    } else {
      videoEl.style.transform = 'scale(' + zoomLevel + ')';
    }
  });
}

function buildGoalReviewOverlay() {
  return {
    aboveImage: 'GOAL UNDER REVIEW',
    aboveFontSize: '48pt',
    image: { type: 'review' },
    headline: '',
    fontSize: '1pt',
    background: '#0a0f2c',
    subHeadline: null,
  };
}

function applyMoodOverlay(overlay) {
  if (!overlay) return;

  if (overlay.background) document.body.style.backgroundColor = overlay.background;

  var headlineEl = document.getElementById('mood-headline');
  if (headlineEl) {
    headlineEl.innerHTML = overlay.headline;
    headlineEl.style.fontSize = overlay.fontSize
      || (overlay.headline.replace(/<[^>]+>/g, '').length > 25 ? '28pt' : '');
  }

  var imgEl      = document.getElementById('mood-image');
  var moodSection = document.getElementById('mood-section');

  var old = document.getElementById('situation-img');
  if (old) old.parentNode.removeChild(old);
  var oldAbove = document.getElementById('situation-above');
  if (oldAbove) oldAbove.parentNode.removeChild(oldAbove);

  if (overlay.image && imgEl && moodSection) {
    if (overlay.image.type === 'single') {
      imgEl.src = overlay.image.src;
      imgEl.style.maxWidth = '50%';
      imgEl.style.display  = 'block';
    } else {
      imgEl.style.display = 'none';
      var container = document.createElement('div');
      container.id = 'situation-img';
      container.style.textAlign = 'center';
      container.style.marginBottom = '16px';
      if (overlay.image.type === 'double') {
        container.innerHTML =
          '<img src="' + overlay.image.src + '" style="max-width:40%;display:inline-block;margin:0 4px;">' +
          '<img src="' + overlay.image.src + '" style="max-width:40%;display:inline-block;margin:0 4px;">';
      } else if (overlay.image.type === 'pair') {
        container.innerHTML =
          '<img src="' + overlay.image.left  + '" style="max-width:40%;display:inline-block;margin:0 4px;">' +
          '<img src="' + overlay.image.right + '" style="max-width:40%;display:inline-block;margin:0 4px;">';
      } else if (overlay.image.type === 'review') {
        container.innerHTML = buildReviewHTML();
      } else {
        var gridHtml = '';
        for (var i = 0; i < 9; i++) {
          gridHtml += '<img src="' + overlay.image.src + '" style="width:30%;display:inline-block;margin:1%;">';
        }
        container.innerHTML = gridHtml;
      }

      if (overlay.aboveImage) {
        var aboveDiv = document.createElement('div');
        aboveDiv.id = 'situation-above';
        aboveDiv.style.textAlign = 'center';
        aboveDiv.style.fontWeight = 'bold';
        aboveDiv.style.fontSize = overlay.aboveFontSize || '28pt';
        aboveDiv.style.marginBottom = '8px';
        aboveDiv.innerHTML = overlay.aboveImage;
        moodSection.insertBefore(aboveDiv, imgEl.nextSibling);
      }

      var afterEl = document.getElementById('situation-above') || imgEl;
      moodSection.insertBefore(container, afterEl.nextSibling);

      if (overlay.image.type === 'review') setupVideoAnalysis();
    }
  }

  var subEl = document.getElementById('mood-sub');
  if (subEl) {
    if (overlay.subHeadline) {
      subEl.innerHTML = overlay.subHeadline;
      subEl.style.display = 'block';
    } else {
      subEl.innerHTML = '';
      subEl.style.display = 'none';
    }
  }
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

// --- Goal transition ---

var _lastSeenGoalEventId  = -1;
var _currentGameId        = null;
var _scoreboardInitialized = false;
var _goalTransitionActive = false;
var _shortKingAltTimer    = null;
var _inShootoutMode       = false;
var SHORT_KING_IMGS = [
  'assets/short-king/pager34-1.png',
  'assets/short-king/pager34-2.jpg',
];

function randomShortKingImg() {
  return SHORT_KING_IMGS[Math.floor(Math.random() * SHORT_KING_IMGS.length)];
}

function formatShotType(raw) {
  if (!raw) return null;
  return raw.replace(/-/g, ' ');
}

function getGoalSituationType(play, nyiIsHome, homeTeamId) {
  var d = play.details || {};
  var nyiScored = nyiIsHome
    ? d.eventOwnerTeamId === homeTeamId
    : d.eventOwnerTeamId !== homeTeamId;
  if (!nyiScored) return null;

  var code        = play.situationCode || '1551';
  var awaySkaters = parseInt(code[1]) || 5;
  var homeSkaters = parseInt(code[2]) || 5;
  var nyiSkaters  = nyiIsHome ? homeSkaters : awaySkaters;
  var oppSkaters  = nyiIsHome ? awaySkaters : homeSkaters;

  if (oppSkaters < nyiSkaters) return 'ppg';
  if (nyiSkaters < oppSkaters) return nyiSkaters <= 3 ? 'double_shg' : 'shg';
  return 'goal';
}

function showGoalTransition(play, rosterMap, nyiIsHome, homeTeamId, onComplete) {
  var sit = getGoalSituationType(play, nyiIsHome, homeTeamId);
  if (!sit) return;

  var d        = play.details || {};
  var fullName = rosterMap[d.scoringPlayerId] || null;
  var lastName = fullName ? fullName.split(' ').pop() : null;
  var shotType = formatShotType(d.shotType);
  var subText  = lastName ? lastName + (shotType ? ' with the ' + shotType + '!' : '!') : null;

  if (_shortKingAltTimer) { clearInterval(_shortKingAltTimer); _shortKingAltTimer = null; }
  _goalTransitionActive = true;

  var old = document.getElementById('situation-img');
  if (old) old.parentNode.removeChild(old);
  var moodImg    = document.getElementById('mood-image');
  var moodSub    = document.getElementById('mood-sub');
  var headlineEl = document.getElementById('mood-headline');
  var moodSection = document.getElementById('mood-section');

  headlineEl.style.fontSize = '';

  var bigText;
  if (sit === 'goal' || sit === 'ppg') {
    bigText = sit === 'ppg' ? 'POWER PLAY GOAL!' : 'GOAL!';
    var textPt = Math.min(72, Math.floor(500 / (bigText.length * 0.6)));
    if (moodImg) moodImg.style.display = 'none';
    headlineEl.innerHTML =
      '<table style="margin:0 auto;border:none;font-size:inherit;text-align:center;"><tr>' +
      '<td style="border:none;vertical-align:middle;padding:0 12px;width:80px;">' +
        '<img src="assets/red-blue-siren-siren.gif" style="width:80px;display:block;">' +
      '</td>' +
      '<td style="border:none;vertical-align:middle;text-align:center;font-size:' + textPt + 'pt;">' + bigText + '</td>' +
      '<td style="border:none;vertical-align:middle;padding:0 12px;width:80px;">' +
        '<img src="assets/red-blue-siren-siren.gif" style="width:80px;display:block;">' +
      '</td>' +
      '</tr></table>';
  } else {
    bigText = sit === 'double_shg' ? 'DOUBLE SHORTIE!!!' : 'SHORTIE!';
    headlineEl.textContent = bigText;

    if (sit === 'double_shg') {
      if (moodImg) moodImg.style.display = 'none';
      var container = document.createElement('div');
      container.id = 'situation-img';
      container.style.textAlign = 'center';
      container.style.marginBottom = '16px';
      var img1 = document.createElement('img');
      var img2 = document.createElement('img');
      img1.style.cssText = 'width:40%;display:inline-block;margin:0 4px;';
      img2.style.cssText = 'width:40%;display:inline-block;margin:0 4px;';
      img1.src = randomShortKingImg();
      img2.src = randomShortKingImg();
      container.appendChild(img1);
      container.appendChild(img2);
      if (moodSection && moodImg) moodSection.insertBefore(container, moodImg.nextSibling);
      _shortKingAltTimer = setInterval(function () {
        img1.src = randomShortKingImg();
        img2.src = randomShortKingImg();
      }, 1000);
    } else {
      if (moodImg) {
        moodImg.src = randomShortKingImg();
        moodImg.style.width   = '40%';
        moodImg.style.display = 'block';
      }
      _shortKingAltTimer = setInterval(function () {
        if (moodImg) moodImg.src = randomShortKingImg();
      }, 1000);
    }
  }

  if (moodSub) {
    if (subText) {
      moodSub.textContent = subText;
      moodSub.style.fontSize = '13pt';
      moodSub.style.fontStyle = 'italic';
      moodSub.style.display = 'block';
    } else {
      moodSub.innerHTML = '';
      moodSub.style.display = 'none';
    }
  }

  setTimeout(function () {
    _goalTransitionActive = false;
    if (_shortKingAltTimer) { clearInterval(_shortKingAltTimer); _shortKingAltTimer = null; }
    (onComplete || detectAndRenderState)();
  }, 5000);
}

function checkForNewNYIGoals(plays, rosterMap, nyiIsHome, homeTeamId) {
  var goals = plays.filter(function (p) { return p.typeDescKey === 'goal'; });
  var maxId = goals.length
    ? Math.max.apply(null, goals.map(function (g) { return g.eventId || 0; }))
    : 0;

  if (!_scoreboardInitialized) {
    _lastSeenGoalEventId   = maxId;
    _scoreboardInitialized = true;
    return false;
  }

  if (maxId <= _lastSeenGoalEventId) return false;

  var newGoals = goals.filter(function (g) { return (g.eventId || 0) > _lastSeenGoalEventId; });
  _lastSeenGoalEventId = maxId;

  var nyiGoals = newGoals.filter(function (g) {
    var d = g.details || {};
    return nyiIsHome
      ? d.eventOwnerTeamId === homeTeamId
      : d.eventOwnerTeamId !== homeTeamId;
  });

  if (!nyiGoals.length) return false;
  showGoalTransition(nyiGoals[nyiGoals.length - 1], rosterMap, nyiIsHome, homeTeamId);
  return true;
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

  var awayPullShutout = hadShutoutUntilGoaliePull(plays, away.id, home.id);
  var homePullShutout = hadShutoutUntilGoaliePull(plays, home.id, home.id);
  var wentToOT = ((boxscore.periodDescriptor || {}).number || 0) > 3;

  // Away is always left column, home is always right column — consistent with header.
  return buildLiveHeader(boxscore) +
    buildLiveGoals(plays, rosterMap, home.id, home.abbrev, away.abbrev, isFinal, awayShutoutImg, homeShutoutImg) +
    buildLivePenalties(plays, rosterMap, home.id, home.abbrev, away.abbrev) +
    buildLiveGoalies(awayStats.goalies, homeStats.goalies, away.abbrev, home.abbrev, awayPullShutout, homePullShutout, isFinal, wentToOT) +
    buildLiveSkaters(awayStats, homeStats, away.abbrev, home.abbrev);
}

async function fetchAndRenderScoreboard(gameId, context) {
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

    var home      = boxscore.homeTeam || {};
    var isFinal   = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
    var pd        = boxscore.periodDescriptor || {};
    var isShootout = pd.periodType === 'SO' && !isFinal;

    if (isShootout) {
      if (!_inShootoutMode) {
        _inShootoutMode = true;
        document.querySelectorAll('.fade-section').forEach(function (el) { el.style.display = 'none'; });
        var moodImg = document.getElementById('mood-image');
        if (moodImg) moodImg.style.display = 'none';
        var moodSub = document.getElementById('mood-sub');
        if (moodSub) moodSub.style.display = 'none';
        var moodHL = document.getElementById('mood-headline');
        if (moodHL) { moodHL.innerHTML = ''; moodHL.style.fontSize = ''; }
      }
      container.innerHTML = buildShootoutBoard(boxscore, playByPlay);
      return;
    }

    if (_inShootoutMode) {
      _inShootoutMode = false;
      document.querySelectorAll('.fade-section').forEach(function (el) { el.style.display = ''; });
    }

    var rosterMap  = buildRosterMap((playByPlay || {}).rosterSpots);
    var plays      = (playByPlay || {}).plays || [];
    container.innerHTML = buildScoreboardHTML(boxscore, playByPlay);

    var nyiIsHome    = home.abbrev === 'NYI';
    var nextHomeGame = (context && context.nextHomeGame) || '—';

    if (_currentGameId !== gameId) {
      _currentGameId         = gameId;
      _scoreboardInitialized = false;
      _lastSeenGoalEventId   = -1;
    }

    var goalTriggered = checkForNewNYIGoals(plays, rosterMap, nyiIsHome, home.id);
    if (!goalTriggered) {
      var overlay = getSituationOverlay(boxscore, nyiIsHome, nextHomeGame);
      applyMoodOverlay(overlay);
    }
  } catch (err) {
    console.error('Scoreboard fetch failed:', err);
    container.innerHTML = '<p style="opacity:0.5;font-size:10pt;">Could not load game data.</p>';
  }
}

function renderLiveGame(game, context) {
  var gameId    = game && game.id;
  var container = document.getElementById('live-scoreboard');
  if (!gameId) {
    if (container) container.innerHTML = '';
    return;
  }
  fetchAndRenderScoreboard(gameId, context);
}
