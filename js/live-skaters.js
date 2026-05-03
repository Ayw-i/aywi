// Skater panel HTML builder.
// Pure function — no shared state. Depends on live-scoreboard.js (parseTOISecs).

function buildLiveSkaters(leftStats, rightStats, leftAbbrev, rightAbbrev, plays) {
  // Build per-player data from play-by-play: goals, primary/secondary assists,
  // penalties drawn, and fighting vs non-fighting PIM.
  // Play-by-play is more up-to-date than playerByGameStats during live games.
  var pbp     = {};
  var ejected = {};
  function initPbp(id) {
    if (id && !pbp[id]) pbp[id] = { goals: 0, a1: 0, a2: 0, pd: 0, fightPIM: 0, nonFightPIM: 0, missedShots: 0 };
  }
  (plays || []).forEach(function (play) {
    var d = play.details || {};
    if (play.typeDescKey === 'goal') {
      if (d.scoringPlayerId) { initPbp(d.scoringPlayerId); pbp[d.scoringPlayerId].goals++; }
      if (d.assist1PlayerId) { initPbp(d.assist1PlayerId); pbp[d.assist1PlayerId].a1++; }
      if (d.assist2PlayerId) { initPbp(d.assist2PlayerId); pbp[d.assist2PlayerId].a2++; }
    }
    if (play.typeDescKey === 'missed-shot') {
      if (d.shootingPlayerId) { initPbp(d.shootingPlayerId); pbp[d.shootingPlayerId].missedShots++; }
    }
    if (play.typeDescKey === 'penalty') {
      var pim     = d.duration || 0;
      var descKey = d.descKey  || '';
      var isFight = descKey.indexOf('fighting') !== -1;
      // Ejection: game misconduct, gross misconduct, or match penalty
      var isEject = descKey.indexOf('game-misconduct') !== -1 ||
                    descKey.indexOf('gross-misconduct') !== -1 ||
                    descKey.indexOf('match')            !== -1;
      if (d.committedByPlayerId) {
        initPbp(d.committedByPlayerId);
        if (isEject) ejected[d.committedByPlayerId] = true;
        // Only count PIM that creates a man-disadvantage (minors/majors, not misconducts)
        if (pim > 0 && pim < 10) {
          if (isFight) pbp[d.committedByPlayerId].fightPIM    += pim;
          else         pbp[d.committedByPlayerId].nonFightPIM += pim;
        }
      }
      if (d.drawnByPlayerId && pim > 0 && pim < 10) {
        initPbp(d.drawnByPlayerId);
        pbp[d.drawnByPlayerId].pd += pim;
      }
    }
  });

  // Approximate GameScore (Luszczyszyn 2016 + TOI/iCF extensions).
  // Omits on-ice Corsi (not in API) and faceoffs (low game-level impact).
  // Fighting PIM is treated as a small positive rather than penalized.
  // Missed shots added as iCF proxy; TOI rewards minute-eaters.
  function gameScore(p) {
    var q    = pbp[p.playerId] || {};
    var g    = Math.max(p.goals || 0, q.goals || 0);
    var a1   = q.a1 || 0;
    var a2   = q.a2 || 0;
    if (a1 === 0 && a2 === 0) a2 = p.assists || 0;  // fallback if pbp assist split unavailable
    var toi     = parseTOISecs(p.toi || '0:00') / 60;
    var toiOver = Math.max(0, toi - 15);
    return 0.75  * g
         + 0.70  * a1
         + 0.55  * a2
         + 0.075 * (p.sog                || 0)
         + 0.025 * (q.missedShots        || 0)
         + 0.05  * (p.blockedShots       || 0)
         + 0.15  * (p.plusMinus          || 0)
         + 0.15  * (q.pd                 || 0)
         - 0.15  * (q.nonFightPIM        || 0)
         + 0.01  * (q.fightPIM           || 0)
         + 0.01  * toiOver;
  }

  function getPlayers(stats) {
    return ((stats.forwards || []).concat(stats.defense || []))
      .filter(function (p) { return parseTOISecs(p.toi) > 0 || pbp[p.playerId]; });
  }

  function skaterRow(p) {
    var q  = pbp[p.playerId] || {};
    var g  = Math.max(p.goals || 0, q.goals || 0);
    var a1 = q.a1 || 0;
    var a2 = q.a2 || 0;
    if (a1 === 0 && a2 === 0) a2 = p.assists || 0;
    var a        = g > 0 || a1 > 0 || a2 > 0 ? a1 + a2 : (p.assists || 0);
    var sog      = p.sog          || 0;
    var blk      = p.blockedShots || 0;
    var pm       = p.plusMinus    || 0;
    var pd       = q.pd           || 0;
    var nonFPIM  = q.nonFightPIM  || 0;
    var fPIM     = q.fightPIM     || 0;
    var gs       = gameScore(p);
    var gsStr    = (gs >= 0 ? '+' : '') + gs.toFixed(2);
    var gsColor  = gs >= 0 ? '#8f8' : '#f88';

    // Build breakdown tooltip lines for each non-zero component
    var lines = [];
    function term(val, coeff, label) {
      if (!val) return;
      var contrib = coeff * val;
      lines.push((contrib >= 0 ? '+' : '') + contrib.toFixed(3) +
        ' &nbsp;<span style="color:#888;">(' + coeff + '&times;' + val + ' ' + label + ')</span>');
    }
    term(g,      0.75,  'G');
    term(a1,     0.70,  'A1');
    term(a2,     0.55,  'A2');
    var missed   = q.missedShots || 0;
    var toiMins  = parseTOISecs(p.toi || '0:00') / 60;
    term(sog,    0.075, 'SOG');
    term(missed, 0.025, 'missed');
    term(blk,    0.05,  'BLK');
    if (pm) term(pm, 0.15, (pm >= 0 ? '+' : '') + pm + '&nbsp;&plusmn;');
    term(pd,     0.15,  'PD');
    if (nonFPIM) lines.push('-' + (0.15 * nonFPIM).toFixed(3) +
      ' &nbsp;<span style="color:#888;">(0.15&times;' + nonFPIM + ' PIM)</span>');
    term(fPIM,   0.01,  'fight');
    var toiOver = Math.max(0, toiMins - 15);
    if (toiOver > 0) lines.push('+' + (0.01 * toiOver).toFixed(3) +
      ' &nbsp;<span style="color:#888;">(0.01&times;' + toiOver.toFixed(1) + ' TOI&gt;15)</span>');

    var tooltipHTML =
      '<span style="display:none;position:absolute;bottom:120%;right:0;z-index:999;' +
      'background:#111;border:1px solid #555;padding:5px 7px;white-space:nowrap;' +
      'font-size:8pt;font-family:monospace;color:#ccc;line-height:1.6;">' +
      (lines.length ? lines.join('<br>') : '<span style="color:#888;">no contributions</span>') +
      '<br><span style="border-top:1px solid #444;display:block;margin-top:3px;padding-top:3px;">' +
      '<b style="color:' + gsColor + ';">' + gsStr + '</b> GameScore</span>' +
      '</span>';

    var gsCell =
      '<span style="position:relative;display:inline-block;">' +
      '<span style="cursor:help;text-decoration:underline dotted;" ' +
      'onmouseenter="this.nextElementSibling.style.display=\'block\'" ' +
      'onmouseleave="this.nextElementSibling.style.display=\'none\'">' + gsStr + '</span>' +
      tooltipHTML +
      '</span>';

    var pmColor = pm > 0 ? '#8f8' : pm < 0 ? '#f88' : '#ccc';
    var pmStr   = (pm > 0 ? '+' : '') + pm;

    var pmCell;
    if (pm === -3) {
      pmCell = '<span style="position:relative;display:inline-block;">' +
        '<span style="cursor:help;color:' + pmColor + ';" ' +
        'onmouseenter="this.nextElementSibling.style.display=\'block\';var v=this.nextElementSibling.querySelector(\'video\');v.volume=0.5;v.play();" ' +
        'onmouseleave="this.nextElementSibling.style.display=\'none\';var v=this.nextElementSibling.querySelector(\'video\');v.pause();v.currentTime=0;">' +
        pmStr + '</span>' +
        '<span style="display:none;position:absolute;bottom:120%;left:50%;transform:translateX(-50%);z-index:999;' +
        'background:#000;border:1px solid #555;">' +
        '<video src="assets/es minus tri vuxu.mp4" width="220" playsinline ' +
        'onended="this.parentElement.style.display=\'none\';this.currentTime=0;"></video>' +
        '</span></span>';
    } else {
      pmCell = '<span style="color:' + pmColor + ';">' + pmStr + '</span>';
    }

    var EJECT    = '&#128683;'; // 🚫
    var isEjected = !!ejected[p.playerId];
    var ejectBadge = isEjected
      ? '<br><span style="font-size:10pt;color:gray;">' + EJECT +
        '<span style="font-style:italic;"> Ejected.</span></span>'
      : '';
    var rowStyle = isEjected ? ' style="background-color:#3a0000;"' : '';

    return '<tr' + rowStyle + '>' +
      '<td>' + ((p.name && p.name.default) || '?') + ejectBadge + '</td>' +
      '<td style="white-space:nowrap;">' + g + 'G&nbsp;' + a + 'A</td>' +
      '<td>' + (p.toi || '&mdash;') + '</td>' +
      '<td>' + pmCell + '</td>' +
      '<td style="white-space:nowrap;color:' + gsColor + ';">' + gsCell + '</td>' +
      '</tr>';
  }

  function skaterPanel(players, label) {
    if (!players.length) return '';
    var sorted = players.slice().sort(function (a, b) { return gameScore(b) - gameScore(a); });
    var top    = sorted.slice(0, 5);
    var bottom = players.length >= 10 ? sorted.slice(-5).reverse() : [];
    var thead  = '<tr>' +
      '<th style="font-size:8pt;">Name</th>' +
      '<th style="font-size:8pt;">G/A</th>' +
      '<th style="font-size:8pt;">TOI</th>' +
      '<th style="font-size:8pt;">+/-</th>' +
      '<th style="font-size:8pt;">GS</th>' +
      '</tr>';

    var html = '<table width="100%">' +
      '<thead><tr><th colspan="5">' + label + ' — Best</th></tr>' + thead + '</thead>' +
      '<tbody>' + top.map(skaterRow).join('') + '</tbody>' +
      '</table>';

    if (bottom.length) {
      html += '<table width="100%" style="margin-top:4px;">' +
        '<thead><tr><th colspan="5">' + label + ' — Worst</th></tr>' + thead + '</thead>' +
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
