// Live situation graph — win probability line + situation strips.
// Pure function. Depends on live-scoreboard.js (parseTOISecs, buildRosterMap).

function buildLiveGraph(boxscore, playByPlay, nyiIsHome) {
  var home      = boxscore.homeTeam || {};
  var away      = boxscore.awayTeam || {};
  var plays     = (playByPlay || {}).plays || [];

  var nyiAbbrev = nyiIsHome ? home.abbrev : away.abbrev;
  var oppAbbrev = nyiIsHome ? away.abbrev : home.abbrev;
  var homeId    = home.id;
  var nyiId     = nyiIsHome ? home.id : away.id;

  var pd        = boxscore.periodDescriptor || {};
  var clock     = boxscore.clock || {};
  var isFinal   = boxscore.gameState === 'OFF' || boxscore.gameState === 'FINAL';
  var curPeriod = pd.number || 3;

  // --- Helpers ---

  function toGameMin(period, timeInPeriod) {
    if (!period) return 0;
    return (period - 1) * 20 + parseTOISecs(timeInPeriod) / 60;
  }

  function poissonProb(lambda, k) {
    if (k < 0) return 0;
    if (lambda <= 0) return k === 0 ? 1 : 0;
    var logP = -lambda;
    for (var i = 1; i <= k; i++) logP += Math.log(lambda) - Math.log(i);
    return Math.exp(logP);
  }

  // P(NYI wins) given score differential and minutes remaining (Skellam model).
  // diff = nyiScore - oppScore. Tie at minsRemaining=0 → 50% (OT/SO pending).
  function winProb(diff, minsRemaining) {
    if (minsRemaining <= 0) {
      if (diff === 0) return 0.5;
      return diff > 0 ? 0.99 : 0.01;
    }
    var lambda = 0.05 * minsRemaining; // ~3 goals/60 min per team
    var MAX_K  = Math.max(12, Math.ceil(lambda * 4));
    var pWin = 0, pTie = 0;
    for (var x = 0; x <= MAX_K; x++) {
      var px = poissonProb(lambda, x);
      if (px < 1e-12) continue;
      for (var y = 0; y <= MAX_K; y++) {
        var net = x - y;
        if (net === -diff)    pTie += px * poissonProb(lambda, y);
        else if (net > -diff) pWin += px * poissonProb(lambda, y);
      }
    }
    return Math.max(0.01, Math.min(0.99, pWin + 0.5 * pTie));
  }

  // --- Game timeline ---

  var goals = plays.filter(function (p) { return p.typeDescKey === 'goal'; });

  var maxEventMin = 0;
  plays.forEach(function (p) {
    var per = (p.periodDescriptor || {}).number || 0;
    if (per) {
      var t = toGameMin(per, p.timeInPeriod || '0:00');
      if (t > maxEventMin) maxEventMin = t;
    }
  });
  var clockElapsed = isFinal ? 0
    : (curPeriod - 1) * 20 + Math.max(0, 1200 - parseTOISecs(clock.timeRemaining || '20:00')) / 60;
  var curMin    = isFinal ? maxEventMin : Math.max(maxEventMin, clockElapsed);
  var totalMins = Math.max(60, curMin);
  if (totalMins > 60) {
    var otPeriods = Math.ceil((totalMins - 60) / 20);
    totalMins = 60 + otPeriods * 20;
  }

  // --- Win probability points ---

  var wpPoints = []; // [{t, wp}]
  var nyiScore = 0, oppScore = 0;

  wpPoints.push({ t: 0, wp: winProb(0, totalMins) });

  goals.forEach(function (g) {
    var per = (g.periodDescriptor || {}).number || 0;
    if (!per) return;
    var t     = toGameMin(per, g.timeInPeriod || '0:00');
    var d     = g.details || {};
    var isNYI = nyiIsHome ? d.eventOwnerTeamId === homeId : d.eventOwnerTeamId !== homeId;
    var mRem  = Math.max(0, totalMins - t);

    wpPoints.push({ t: t,        wp: winProb(nyiScore - oppScore, mRem) });
    if (isNYI) nyiScore++; else oppScore++;
    wpPoints.push({ t: t + 0.01, wp: winProb(nyiScore - oppScore, mRem) });
  });

  wpPoints.push({ t: curMin, wp: winProb(nyiScore - oppScore, Math.max(0, totalMins - curMin)) });

  // --- Situation segments ---
  // Track lastCodeStart separately so it only advances when the code changes —
  // otherwise a quick transition (e.g. EA goal) creates a near-zero-width segment.

  function classifyCode(code) {
    if (!code || code.length < 4) return null;
    var awayGoalie  = code[0] === '1';
    var awaySkaters = parseInt(code[1]) || 5;
    var homeSkaters = parseInt(code[2]) || 5;
    var homeGoalie  = code[3] === '1';
    var nyiGoalie   = nyiIsHome ? homeGoalie  : awayGoalie;
    var nyiSk       = nyiIsHome ? homeSkaters : awaySkaters;
    var oppSk       = nyiIsHome ? awaySkaters : homeSkaters;
    var oppGoalie   = nyiIsHome ? awayGoalie  : homeGoalie;
    if (!nyiGoalie) return nyiSk - oppSk >= 2 ? 'ea_nyi_pp' : 'ea_nyi';
    if (!oppGoalie) return 'ea_opp';
    if (nyiSk > oppSk) return nyiSk - oppSk >= 2 ? 'pp_5v3' : 'pp';
    if (nyiSk < oppSk) return oppSk - nyiSk >= 2 ? 'pk_3v5' : 'pk';
    return null; // 5v5
  }

  var segments = [];
  var lastCode      = null;
  var lastCodeStart = 0;
  var playsWithCode = plays.filter(function (p) {
    return p.situationCode && (p.periodDescriptor || {}).number;
  });

  playsWithCode.forEach(function (p) {
    var per  = (p.periodDescriptor || {}).number || 0;
    var t    = toGameMin(per, p.timeInPeriod || '0:00');
    var code = p.situationCode;
    if (code !== lastCode) {
      if (lastCode !== null && t > lastCodeStart + 0.01) {
        var type = classifyCode(lastCode);
        if (type) segments.push({ startMin: lastCodeStart, endMin: t, type: type });
      }
      lastCode      = code;
      lastCodeStart = t;
    }
  });
  // Close the final run
  if (lastCode !== null && curMin > lastCodeStart + 0.01) {
    var type = classifyCode(lastCode);
    if (type) segments.push({ startMin: lastCodeStart, endMin: curMin, type: type });
  }

  // --- SVG ---

  var SVG_W = 600, SVG_H = 200;
  var PAD_L = 10,  PAD_R = 10, PAD_T = 14, PAD_B = 14;
  var plotW = SVG_W - PAD_L - PAD_R;
  var plotH = SVG_H - PAD_T - PAD_B;
  var midY  = PAD_T + plotH / 2; // y=50%

  function xOf(t)  { return PAD_L + (t / totalMins) * plotW; }
  function yOf(wp) { return PAD_T + (1 - wp) * plotH; }

  var STRIP_COLORS = {
    pp:        'rgba(0,200,0,0.18)',
    pp_5v3:    'rgba(0,200,0,0.38)',
    pk:        'rgba(200,0,0,0.18)',
    pk_3v5:    'rgba(200,0,0,0.38)',
    ea_nyi:    'rgba(80,180,255,0.30)',
    ea_nyi_pp: 'rgba(80,180,255,0.30)',
    ea_opp:    'rgba(255,80,200,0.30)',
  };

  var svg = ['<svg viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '" width="100%" style="display:block;background:#111;border:1px solid #333;">'];

  // Situation strip rects (drawn first, behind everything)
  segments.forEach(function (seg) {
    var color = STRIP_COLORS[seg.type];
    if (!color) return;
    var x1 = xOf(seg.startMin);
    var x2 = xOf(seg.endMin);
    svg.push('<rect x="' + x1.toFixed(1) + '" y="' + PAD_T + '" width="' + (x2 - x1).toFixed(1) + '" height="' + plotH + '" fill="' + color + '"/>');
  });

  // 50% guideline
  svg.push('<line x1="' + PAD_L + '" y1="' + midY.toFixed(1) + '" x2="' + (SVG_W - PAD_R) + '" y2="' + midY.toFixed(1) + '" stroke="#444" stroke-width="1" stroke-dasharray="4,4"/>');

  // Period dividers
  for (var per = 1; per * 20 < totalMins; per++) {
    var xDiv  = xOf(per * 20);
    var label = per === 1 ? '2nd' : per === 2 ? '3rd' : (per - 2) + 'OT';
    svg.push('<line x1="' + xDiv.toFixed(1) + '" y1="' + PAD_T + '" x2="' + xDiv.toFixed(1) + '" y2="' + (SVG_H - PAD_B) + '" stroke="#555" stroke-width="1" stroke-dasharray="3,3"/>');
    svg.push('<text x="' + (xDiv + 2).toFixed(1) + '" y="' + (SVG_H - 3) + '" fill="#555" font-size="7" font-family="monospace">' + label + '</text>');
  }

  // X-axis time labels
  svg.push('<text x="' + PAD_L + '" y="' + (SVG_H - 3) + '" fill="#444" font-size="7" font-family="monospace">0</text>');
  svg.push('<text x="' + (xOf(60) - 6).toFixed(1) + '" y="' + (SVG_H - 3) + '" fill="#444" font-size="7" font-family="monospace">60</text>');

  // Goal vertical lines (red dashed), drawn before the WP line so the line sits on top
  goals.forEach(function (g) {
    var gper = (g.periodDescriptor || {}).number || 0;
    if (!gper) return;
    var gt = toGameMin(gper, g.timeInPeriod || '0:00');
    var xg = xOf(gt);
    svg.push('<line x1="' + xg.toFixed(1) + '" y1="' + PAD_T + '" x2="' + xg.toFixed(1) + '" y2="' + (SVG_H - PAD_B) + '" stroke="rgba(255,80,80,0.7)" stroke-width="1" stroke-dasharray="2,3"/>');
  });

  // WP shaded area — blue above 50% (NYI winning), orange below (NYI losing).
  // Two clip-path polygons share the same outline; each reveals only its half.
  if (wpPoints.length >= 2) {
    var linePts = wpPoints.map(function (pt) {
      return xOf(pt.t).toFixed(1) + ',' + yOf(pt.wp).toFixed(1);
    }).join(' ');
    var lastX   = xOf(wpPoints[wpPoints.length - 1].t).toFixed(1);
    var firstX  = xOf(wpPoints[0].t).toFixed(1);
    var midYStr = midY.toFixed(1);
    var polyPts = linePts + ' ' + lastX + ',' + midYStr + ' ' + firstX + ',' + midYStr;

    svg.push('<defs>');
    svg.push('<clipPath id="wp-clip-above"><rect x="' + PAD_L + '" y="' + PAD_T + '" width="' + plotW + '" height="' + (plotH / 2).toFixed(1) + '"/></clipPath>');
    svg.push('<clipPath id="wp-clip-below"><rect x="' + PAD_L + '" y="' + midYStr + '" width="' + plotW + '" height="' + (plotH / 2).toFixed(1) + '"/></clipPath>');
    svg.push('</defs>');

    svg.push('<polygon points="' + polyPts + '" fill="rgba(60,140,255,0.25)" clip-path="url(#wp-clip-above)"/>');
    svg.push('<polygon points="' + polyPts + '" fill="rgba(255,140,0,0.25)" clip-path="url(#wp-clip-below)"/>');
    svg.push('<polyline points="' + linePts + '" fill="none" stroke="#FFD700" stroke-width="1.5"/>');
  }

  // Y-axis labels (right edge, drawn last so they sit on top)
  svg.push('<text x="' + (SVG_W - PAD_R - 1) + '" y="' + (PAD_T + 6) + '" fill="#555" font-size="7" font-family="monospace" text-anchor="end">' + nyiAbbrev + ' 100%</text>');
  svg.push('<text x="' + (SVG_W - PAD_R - 1) + '" y="' + (midY + 6).toFixed(1) + '" fill="#555" font-size="7" font-family="monospace" text-anchor="end">50%</text>');
  svg.push('<text x="' + (SVG_W - PAD_R - 1) + '" y="' + (SVG_H - PAD_B - 2) + '" fill="#555" font-size="7" font-family="monospace" text-anchor="end">0%</text>');

  svg.push('</svg>');

  // Strip color legend
  var legend = [
    '<span style="color:rgba(0,200,0,0.9);">&#9632;</span> PP',
    '<span style="color:rgba(200,0,0,0.9);">&#9632;</span> PK',
    '<span style="color:rgba(80,180,255,0.9);">&#9632;</span> ' + nyiAbbrev + ' EA',
    '<span style="color:rgba(255,80,200,0.9);">&#9632;</span> ' + oppAbbrev + ' EA',
    '<span style="color:rgba(255,80,80,0.9);">&#9632;</span> Goal',
  ].join(' &nbsp; ');

  // --- PP/PK records ---
  // ppOppsForNYI = opp penalties = NYI PP opps = NYI PK opps for opp
  // ppOppsForOpp = NYI penalties = opp PP opps = NYI PK opps

  var ppOppsForNYI = 0, ppGoalsNYI = 0;
  var ppOppsForOpp = 0, ppGoalsOpp = 0;

  plays.forEach(function (p) {
    if (p.typeDescKey !== 'penalty') return;
    var d   = p.details || {};
    var dur = d.duration || 0;
    if (!dur || dur >= 10) return; // skip misconducts (no PP awarded)
    var isNYIPenalty = nyiIsHome
      ? d.eventOwnerTeamId === homeId
      : d.eventOwnerTeamId !== homeId;
    if (isNYIPenalty) ppOppsForOpp++; else ppOppsForNYI++;
  });

  goals.forEach(function (g) {
    var code  = g.situationCode || '1551';
    var awaySk = parseInt(code[1]) || 5;
    var homeSk = parseInt(code[2]) || 5;
    var nyiSk  = nyiIsHome ? homeSk : awaySk;
    var oppSk  = nyiIsHome ? awaySk : homeSk;
    var d     = g.details || {};
    var isNYI = nyiIsHome ? d.eventOwnerTeamId === homeId : d.eventOwnerTeamId !== homeId;
    if (isNYI  && nyiSk > oppSk) ppGoalsNYI++;
    if (!isNYI && oppSk > nyiSk) ppGoalsOpp++;
  });

  // NYI's PK opps = penalties NYI took (= opp PP opps)
  var pkOppsNYI  = ppOppsForOpp;
  var pkKillsNYI = pkOppsNYI - ppGoalsOpp;
  var pkOppsOpp  = ppOppsForNYI;
  var pkKillsOpp = pkOppsOpp - ppGoalsNYI;

  function rec(goals, opps) { return goals + '-for-' + opps; }

  var nyiPpPk = nyiAbbrev + ' | PP: ' + rec(ppGoalsNYI, ppOppsForNYI) + ' | PK: ' + rec(pkKillsNYI, pkOppsNYI);
  var oppPpPk = oppAbbrev + ' | PP: ' + rec(ppGoalsOpp, ppOppsForOpp) + ' | PK: ' + rec(pkKillsOpp, pkOppsOpp);

  // --- Empty net events from EA segments ---

  var eaSegs = segments.filter(function (s) {
    return s.type === 'ea_nyi' || s.type === 'ea_nyi_pp' || s.type === 'ea_opp';
  });

  // Merge adjacent same-team EA segments (gap < 3 seconds)
  var mergedEA = [];
  eaSegs.forEach(function (s) {
    var last       = mergedEA[mergedEA.length - 1];
    var isNYISeg   = s.type === 'ea_nyi' || s.type === 'ea_nyi_pp';
    var lastIsNYI  = last && (last.type === 'ea_nyi' || last.type === 'ea_nyi_pp');
    if (last && lastIsNYI === isNYISeg && s.startMin - last.endMin < 0.05) {
      last.endMin = s.endMin;
    } else {
      mergedEA.push({ type: s.type, startMin: s.startMin, endMin: s.endMin });
    }
  });

  function getScoreAt(t) {
    var n = 0, o = 0;
    goals.forEach(function (g) {
      var gper = (g.periodDescriptor || {}).number || 0;
      var gt   = toGameMin(gper, g.timeInPeriod || '0:00');
      if (gt <= t) {
        var d = g.details || {};
        if (nyiIsHome ? d.eventOwnerTeamId === homeId : d.eventOwnerTeamId !== homeId) n++;
        else o++;
      }
    });
    return { nyi: n, opp: o };
  }

  var gameStats = boxscore.playerByGameStats || {};
  var homeStats = gameStats.homeTeam || {};
  var awayStats = gameStats.awayTeam || {};

  function primaryGoalieLastName(goalies) {
    var played = (goalies || []).filter(function (g) { return parseTOISecs(g.toi) > 0; });
    if (!played.length) return null;
    played.sort(function (a, b) { return parseTOISecs(b.toi) - parseTOISecs(a.toi); });
    return ((played[0].name && played[0].name.default) || '').split(' ').pop() || null;
  }

  var nyiGoalieName = primaryGoalieLastName(nyiIsHome ? homeStats.goalies : awayStats.goalies);
  var oppGoalieName = primaryGoalieLastName(nyiIsHome ? awayStats.goalies : homeStats.goalies);

  // Delayed penalty: the non-penalized team pulls their goalie for an extra attacker
  // while the ref's arm is up. The NHL API records the penalty event at the stoppage
  // (when the penalized team touches the puck), which is at or just after the EA
  // segment ends — so the search window spans from 30s before the segment start
  // through 30s after the segment end.
  function isDelayedPenaltyEA(seg) {
    var isNYISeg = seg.type === 'ea_nyi' || seg.type === 'ea_nyi_pp';
    var BUFFER   = 0.5; // 30 seconds in game-minutes
    return plays.some(function (p) {
      if (p.typeDescKey !== 'penalty') return false;
      var per = (p.periodDescriptor || {}).number || 0;
      var pt  = toGameMin(per, p.timeInPeriod || '0:00');
      if (pt < seg.startMin - BUFFER || pt > seg.endMin + BUFFER) return false;
      var d = p.details || {};
      var isNYIPenalty = nyiIsHome
        ? d.eventOwnerTeamId === homeId
        : d.eventOwnerTeamId !== homeId;
      // NYI pulled goalie → look for opponent penalty; opp pulled → look for NYI penalty
      return isNYISeg ? !isNYIPenalty : isNYIPenalty;
    });
  }

  var eaLines = mergedEA.filter(function (seg) {
    return !isDelayedPenaltyEA(seg);
  }).map(function (seg) {
    var isNYISeg = seg.type === 'ea_nyi' || seg.type === 'ea_nyi_pp';
    var sc       = getScoreAt(seg.startMin);
    // trailingDiff > 0 means the pulling team is losing
    var trailingDiff = isNYISeg ? (sc.opp - sc.nyi) : (sc.nyi - sc.opp);
    var dMin    = seg.endMin - seg.startMin;
    var dStr    = Math.floor(dMin) + ':' + String(Math.round((dMin % 1) * 60)).padStart(2, '0');
    var abbrev  = isNYISeg ? nyiAbbrev : oppAbbrev;
    var goalie  = (isNYISeg ? nyiGoalieName : oppGoalieName) || null;
    var who     = goalie ? goalie + ' (' + abbrev + ')' : abbrev;
    var diffStr = trailingDiff > 0 ? 'down ' + trailingDiff
                : trailingDiff < 0 ? 'up ' + Math.abs(trailingDiff)
                : 'tied';

    var goalsInWindow = goals.filter(function (g) {
      var gper = (g.periodDescriptor || {}).number || 0;
      var gt   = toGameMin(gper, g.timeInPeriod || '0:00');
      return gt >= seg.startMin - 0.05 && gt <= seg.endMin + 0.05;
    });
    var pulledScored = goalsInWindow.some(function (g) {
      var d = g.details || {};
      var isNYIGoal = nyiIsHome ? d.eventOwnerTeamId === homeId : d.eventOwnerTeamId !== homeId;
      return isNYISeg ? isNYIGoal : !isNYIGoal;
    });
    var oppScored = goalsInWindow.some(function (g) {
      var d = g.details || {};
      var isNYIGoal = nyiIsHome ? d.eventOwnerTeamId === homeId : d.eventOwnerTeamId !== homeId;
      return isNYISeg ? !isNYIGoal : isNYIGoal;
    });

    var outcome = oppScored    ? '<span style="color:#f88;">Opponent scored.</span>'
                : pulledScored ? '<span style="color:#8f8;">Scored!</span>'
                : 'Failed to score.';

    return who + ' pulled for ' + dStr + ', ' + diffStr + '. ' + outcome;
  });

  // --- Assemble ---

  var summaryHtml =
    '<div style="font-size:9pt;margin-top:6px;opacity:0.85;line-height:1.6;">' +
      '<div>' + nyiPpPk + '</div>' +
      '<div>' + oppPpPk + '</div>' +
      (eaLines.length
        ? '<div style="margin-top:4px;"><b>Empty Net:</b><br>' + eaLines.join('<br>') + '</div>'
        : '') +
      '<div style="margin-top:4px;opacity:0.6;">' + legend + '</div>' +
    '</div>';

  return '<h3 style="margin-top:20px;margin-bottom:4px;">SITUATION GRAPH</h3>' +
    '<table width="100%" style="border:none;"><tr><td style="border:none;">' +
    svg.join('') +
    summaryHtml +
    '</td></tr></table>';
}
