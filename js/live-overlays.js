// Situation overlay and fight HTML builders.
// Pure functions — no shared state. Depends on live-scoreboard.js (parseTOISecs etc.).
// buildFightOverlay() reads _fightOverlayData from live-game.js at call time.

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
  if (diff >= 4)        headline = "Yes! Yes! Yes! And we're on the power play!";
  else if (diff === 3)  headline = "Yes!!! And we're on the power play!";
  else if (diff === 2)  headline = "Yes! And we're on the power play!";
  else if (diff === 1)  headline = "Yes. And we're on the power play!";
  else if (diff === 0)  headline = "Not yet, but we're on the power play.";
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

// --- Empty net overlays ---

var SOROKIN_WATER_IMGS = [
  'assets/sorokin-water/11.jpg',
  'assets/sorokin-water/22.jpg',
  'assets/sorokin-water/33.jpg',
  'assets/sorokin-water/44.jpg',
  'assets/sorokin-water/55.jpg',
  'assets/sorokin-water/66.jpg',
];

function buildNYIEmptyNetOverlay(goalieLastName, goalsNeeded) {
  var n        = Math.max(1, goalsNeeded);
  var needText = 'We just need ' + n + (n >= 2 ? ' in a row' : '') + '!';
  return {
    aboveImage:    goalieLastName + ' is off the ice...',
    aboveFontSize: '18pt',
    image:    { type: 'single', src: 'assets/sorokin-is-watching.png' },
    headline: needText,
  };
}

function buildOppEmptyNetOverlay(oppGoalieName, nyiGoalieName, nyiLead) {
  var n    = Math.max(1, nyiLead);
  var unit = n === 1 ? 'goal' : 'goals';
  return {
    aboveImage:    oppGoalieName + ' is off the ice...<br>' + nyiGoalieName + ' is locking in...',
    aboveFontSize: '18pt',
    image:    { type: 'slideshow', srcs: SOROKIN_WATER_IMGS },
    headline: 'Time to find out if the Isles can score on an empty net before they concede ' + n + ' ' + unit + '.',
  };
}

// --- Situation dispatcher ---

function getSituationOverlay(boxscore, nyiIsHome, nextHomeGame, rosterMap) {
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

  var home     = boxscore.homeTeam || {};
  var away     = boxscore.awayTeam || {};
  var nyiScore = nyiIsHome ? (home.score || 0) : (away.score || 0);
  var oppScore = nyiIsHome ? (away.score || 0) : (home.score || 0);
  var diff     = nyiScore - oppScore;

  var gameStats = boxscore.playerByGameStats || {};

  // NYI pulled their goalie (extra attacker)
  var nyiGoalieIn = nyiIsHome ? (code[3] === '1') : (code[0] === '1');
  if (!nyiGoalieIn) {
    var nyiStats     = nyiIsHome ? (gameStats.homeTeam || {}) : (gameStats.awayTeam || {});
    var activeGoalie = (nyiStats.goalies || []).find(function (g) { return parseTOISecs(g.toi) > 0; });
    var goalieLastName = 'Goalie';
    if (activeGoalie && rosterMap) {
      var fullName = rosterMap[activeGoalie.playerId] || '';
      goalieLastName = fullName.split(' ').pop() || 'Goalie';
    }
    return buildNYIEmptyNetOverlay(goalieLastName, oppScore - nyiScore);
  }

  // Opponent pulled their goalie (NYI defending empty net)
  var oppGoalieIn = nyiIsHome ? (code[0] === '1') : (code[3] === '1');
  if (!oppGoalieIn) {
    var oppStats        = nyiIsHome ? (gameStats.awayTeam || {}) : (gameStats.homeTeam || {});
    var activeOppGoalie = (oppStats.goalies || []).find(function (g) { return parseTOISecs(g.toi) > 0; });
    var oppGoalieName   = 'Goalie';
    if (activeOppGoalie && rosterMap) {
      var oppFullName = rosterMap[activeOppGoalie.playerId] || '';
      oppGoalieName   = oppFullName.split(' ').pop() || 'Goalie';
    }
    var nyiStatsEN      = nyiIsHome ? (gameStats.homeTeam || {}) : (gameStats.awayTeam || {});
    var activeNYIGoalie = (nyiStatsEN.goalies || []).find(function (g) { return parseTOISecs(g.toi) > 0; });
    var nyiGoalieName   = 'Goalie';
    if (activeNYIGoalie && rosterMap) {
      var nyiFullName = rosterMap[activeNYIGoalie.playerId] || '';
      nyiGoalieName   = nyiFullName.split(' ').pop() || 'Goalie';
    }
    return buildOppEmptyNetOverlay(oppGoalieName, nyiGoalieName, nyiScore - oppScore);
  }

  if (nyiSkaters === 5 && oppSkaters === 5) return null;

  if (oppSkaters > nyiSkaters) return buildPKOverlay(diff, nyiSkaters <= 3, nextHomeGame);
  if (nyiSkaters > oppSkaters) return buildPPOverlay(diff, oppSkaters <= 3);

  return null;
}

// --- Goal under review ---

function getReviewStatus(plays, nyiIsHome, homeTeamId) {
  var limit = Math.max(0, plays.length - 10);
  for (var i = plays.length - 1; i >= limit; i--) {
    var p = plays[i];
    var t = p.typeDescKey;
    var reason = (p.details || {}).reason || '';
    if (t === 'stoppage') {
      if (reason.indexOf('chlg-') === 0 || reason === 'video-review') {
        var nyiGoal;
        if (reason.indexOf('chlg-hm-') === 0) {
          // Home team challenged → away team's goal is under review
          nyiGoal = !nyiIsHome;
        } else if (reason.indexOf('chlg-vis-') === 0) {
          // Visiting team challenged → home team's goal is under review
          nyiGoal = nyiIsHome;
        } else {
          // League/situation-room review — find the most recent goal to determine whose it was
          nyiGoal = null;
          for (var j = i - 1; j >= 0; j--) {
            if (plays[j].typeDescKey === 'goal') {
              var scoringTeam = (plays[j].details || {}).eventOwnerTeamId;
              nyiGoal = nyiIsHome ? scoringTeam === homeTeamId : scoringTeam !== homeTeamId;
              break;
            }
          }
        }
        return { active: true, nyiGoal: nyiGoal };
      }
      continue; // non-challenge stoppage — keep scanning back
    }
    return { active: false }; // any non-stoppage event means play has resumed
  }
  return { active: false };
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

function buildGoalReviewOverlay(nyiGoal) {
  var subText = nyiGoal === true  ? 'Oh god damn it...'
              : nyiGoal === false ? 'Wait a minute, hold that goal!'
              : '';
  var aboveHtml = (subText ? '<span style="font-size:18pt;">' + subText + '</span><br>' : '') +
                  'GOAL UNDER REVIEW';
  return {
    aboveImage: aboveHtml,
    aboveFontSize: '48pt',
    image: { type: 'review' },
    headline: '',
    fontSize: '1pt',
    youtubeId: 'GDP4ds-ozOI',
    subHeadline: null,
  };
}

// --- Fight overlay builders ---

async function loadFightsData() {
  if (_fightsData) return _fightsData;
  try {
    var r = await fetch('fights.json');
    _fightsData = await r.json();
  } catch (e) { _fightsData = []; }
  return _fightsData;
}

function getDayOfYear(d) {
  var start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function pickHistoricalFight(today, fights) {
  var todayYear = today.getFullYear();
  var todayDOY  = getDayOfYear(today);
  var past = fights.filter(function (f) {
    return f.youtubeId && parseInt((f.date || '').split('-')[0]) < todayYear;
  });
  if (!past.length) return null;

  var best = null, bestDist = Infinity;
  past.forEach(function (f) {
    var fDate = new Date(f.date + 'T12:00:00');
    var fDOY  = getDayOfYear(fDate);
    var dist  = Math.abs(fDOY - todayDOY);
    dist = Math.min(dist, 365 - dist);
    if (dist < bestDist) { bestDist = dist; best = f; }
  });
  if (!best) return null;

  var yearsAgo = todayYear - parseInt(best.date.split('-')[0]);
  var label = bestDist === 0
    ? 'on this day, ' + yearsAgo + ' year' + (yearsAgo !== 1 ? 's' : '') + ' ago...'
    : bestDist <= 7
    ? 'on (almost) this day, ' + yearsAgo + ' year' + (yearsAgo !== 1 ? 's' : '') + ' ago...'
    : yearsAgo + ' year' + (yearsAgo !== 1 ? 's' : '') + ' ago...';

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var fDate     = new Date(best.date + 'T12:00:00');
  var dateLabel = MONTHS[fDate.getMonth()] + ' ' + fDate.getDate() + ', ' + fDate.getFullYear();

  return { youtubeId: best.youtubeId, fighters: best.fighters, label: label, dateLabel: dateLabel };
}

function buildFightHTML(data) {
  var html = '';

  if (data.historical) {
    var h = data.historical;
    html += '<p style="margin:12px 0 2px;font-size:9pt;opacity:0.8;">Meanwhile, ' + h.label + '</p>';
    html += '<p style="margin:0 0 6px;font-size:9pt;opacity:0.6;">' + h.dateLabel + ':</p>';
    if (h.youtubeId) {
      html += '<div style="text-align:center;">' +
              '<iframe src="https://www.youtube.com/embed/' + h.youtubeId + '?rel=0" ' +
              'style="width:100%;max-width:480px;height:270px;border:1px solid #444;" ' +
              'allowfullscreen></iframe></div>';
    }
  }

  return html;
}

function buildFightOverlay() {
  if (!_fightOverlayData) return null;
  var d = _fightOverlayData;
  var fightersLine = d.fighters.length >= 2
    ? d.fighters[0] + ' vs ' + d.fighters[1]
    : d.fighters[0] || '';

  return {
    background: '#000000',
    headline: '🥊 FIGHT! FIGHT! FIGHT! 🥊<br>' +
              '<span style="font-size:14pt;">' + fightersLine + '</span>',
    subHeadline: d.additionalPen
      ? 'Additional ' + d.additionalPen
      : null,
    fightContent: buildFightHTML(d),
  };
}
