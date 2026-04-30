// Live game coordinator. Stateful — owns all shared state vars and the fetch/render loop.
// Depends on (load order): live-scoreboard.js, live-skaters.js, live-overlays.js.
// Also depends on: utils.js, nhl-schedule.js, state.js (detectAndRenderState), main.js (_ytPlayer etc.).

// --- Shared state ---

var _slideshowTimer = null;

// Fight state
var _fightsData           = null;
var _lastSeenFightEventId = -1;
var _fightTimerEnd        = 0;
var _fightOverlayData     = null;

// Goal/game state
var _lastSeenGoalEventId   = -1;
var _currentGameId         = null;
var _scoreboardInitialized = false;
var _goalTransitionActive  = false;
var _shortKingAltTimer     = null;
var _inShootoutMode        = false;

var SHORT_KING_IMGS = [
  'assets/short-king/pager34-1.png',
  'assets/short-king/pager34-2.jpg',
];

function randomShortKingImg() {
  return SHORT_KING_IMGS[Math.floor(Math.random() * SHORT_KING_IMGS.length)];
}

// --- applyMoodOverlay ---

function applyMoodOverlay(overlay) {
  var fightEl = document.getElementById('fight-content');
  if (fightEl) {
    if (overlay && overlay.fightContent) {
      fightEl.innerHTML = overlay.fightContent;
      fightEl.style.display = 'block';
    } else {
      fightEl.innerHTML = '';
      fightEl.style.display = 'none';
    }
  }
  if (!overlay) return;

  // Clear any running slideshow
  if (_slideshowTimer) { clearInterval(_slideshowTimer); _slideshowTimer = null; }

  // Stop YouTube if we're leaving a YouTube overlay
  if (_ytMode && !overlay.youtubeId) {
    _ytMode = false;
    if (_ytPlayer && _ytReady) _ytPlayer.pauseVideo();
    var ytWidget = document.getElementById('yt-widget');
    if (ytWidget) ytWidget.style.display = 'none';
  }

  if (overlay.background) document.body.style.backgroundColor = overlay.background;

  var headlineEl = document.getElementById('mood-headline');
  if (headlineEl) {
    headlineEl.innerHTML = overlay.headline;
    headlineEl.style.fontSize = overlay.fontSize
      || (overlay.headline.replace(/<[^>]+>/g, '').length > 25 ? '28pt' : '');
  }

  var imgEl       = document.getElementById('mood-image');
  var moodSection = document.getElementById('mood-section');

  if (imgEl && !overlay.image) imgEl.style.display = 'none';

  var old = document.getElementById('situation-img');
  if (old) old.parentNode.removeChild(old);
  var oldAbove = document.getElementById('situation-above');
  if (oldAbove) oldAbove.parentNode.removeChild(oldAbove);

  if (overlay.image && imgEl && moodSection) {
    if (overlay.image.type === 'single') {
      imgEl.src = overlay.image.src;
      imgEl.style.maxWidth = '50%';
      imgEl.style.display  = 'block';
      if (overlay.aboveImage) {
        var aboveDiv = document.createElement('div');
        aboveDiv.id = 'situation-above';
        aboveDiv.style.textAlign    = 'center';
        aboveDiv.style.fontWeight   = 'bold';
        aboveDiv.style.fontSize     = overlay.aboveFontSize || '28pt';
        aboveDiv.style.marginBottom = '8px';
        aboveDiv.innerHTML = overlay.aboveImage;
        moodSection.insertBefore(aboveDiv, imgEl);
      }
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
      } else if (overlay.image.type === 'slideshow') {
        var srcs     = overlay.image.srcs || [];
        var slideImg = document.createElement('img');
        slideImg.src = srcs[0] || '';
        slideImg.style.height    = '280px';
        slideImg.style.width     = 'auto';
        slideImg.style.objectFit = 'contain';
        slideImg.style.display   = 'block';
        slideImg.style.margin    = '0 auto';
        container.appendChild(slideImg);
        if (srcs.length > 1) {
          var ssIdx = 0;
          _slideshowTimer = setInterval(function () {
            ssIdx = (ssIdx + 1) % srcs.length;
            slideImg.src = srcs[ssIdx];
          }, 1000);
        }
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
        aboveDiv.style.textAlign    = 'center';
        aboveDiv.style.fontWeight   = 'bold';
        aboveDiv.style.fontSize     = overlay.aboveFontSize || '28pt';
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

  if (overlay.youtubeId) {
    _ytMode = true;
    var ytWidget = document.getElementById('yt-widget');
    if (ytWidget) {
      ytWidget.style.opacity = '0';
      ytWidget.style.display = 'block';
      requestAnimationFrame(function () { ytWidget.style.opacity = '1'; });
    }
    if (_ytReady && _ytPlayer) _ytPlayer.loadVideoById(overlay.youtubeId);
    syncToggle();
  }
}

// --- Goal transition ---

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
  var moodImg     = document.getElementById('mood-image');
  var moodSub     = document.getElementById('mood-sub');
  var headlineEl  = document.getElementById('mood-headline');
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
      moodSub.style.fontSize  = '13pt';
      moodSub.style.fontStyle = 'italic';
      moodSub.style.display   = 'block';
    } else {
      moodSub.innerHTML    = '';
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

// --- Fight detection ---

async function checkForNewFight(plays, rosterMap, homeTeamId, nyiIsHome) {
  var fightPens = plays.filter(function (p) {
    return p.typeDescKey === 'penalty' &&
           ((p.details || {}).descKey || '').indexOf('fighting') !== -1 &&
           (p.eventId || 0) > _lastSeenFightEventId;
  });
  if (!fightPens.length) return false;

  var maxId = Math.max.apply(null, fightPens.map(function (p) { return p.eventId || 0; }));

  if (!_scoreboardInitialized) {
    _lastSeenFightEventId = maxId;
    return false;
  }

  _lastSeenFightEventId = maxId;

  var seen = {};
  var fighterNames = [];
  fightPens.forEach(function (p) {
    var pid = (p.details || {}).committedByPlayerId;
    if (pid && !seen[pid]) {
      seen[pid] = true;
      var full = (rosterMap && rosterMap[pid]) || '';
      fighterNames.push(full.split(' ').pop() || '?');
    }
  });

  var fdata = await loadFightsData();
  var historical = pickHistoricalFight(new Date(), fdata);

  _fightOverlayData = { fighters: fighterNames, additionalPen: null, historical: historical };
  _fightTimerEnd    = Date.now() + 45000;
  return true;
}

function checkFightAdditionalPenalty(plays, rosterMap, homeTeamId, nyiIsHome) {
  var newPens = plays.filter(function (p) {
    return p.typeDescKey === 'penalty' &&
           ((p.details || {}).descKey || '').indexOf('fighting') === -1 &&
           (p.eventId || 0) > _lastSeenFightEventId;
  });
  if (!newPens.length || !_fightOverlayData) return;

  var latest  = newPens[newPens.length - 1];
  var d       = latest.details || {};
  var pid     = d.committedByPlayerId;
  var name    = pid && rosterMap ? ((rosterMap[pid] || '').split(' ').pop() || '') : '';
  var ptype   = (d.descKey || 'penalty').replace(/-/g, ' ');
  var maxId   = Math.max.apply(null, newPens.map(function (p) { return p.eventId || 0; }));
  var isNYI   = nyiIsHome
    ? d.eventOwnerTeamId === homeTeamId
    : d.eventOwnerTeamId !== homeTeamId;
  var emoji   = isNYI ? ' 😔' : ' 😊';

  _lastSeenFightEventId = maxId;
  _fightOverlayData.additionalPen = ptype + (name ? ' on ' + name : '') + emoji;
}

// --- Main fetch/render loop ---

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

    var nyiGameNum = null;
    if (typeof getSeasonSchedule === 'function') {
      try {
        var seasonGames = await getSeasonSchedule();
        nyiGameNum = getNYIGameNumber(gameId, seasonGames);
      } catch (e) {}
    }

    container.innerHTML = buildScoreboardHTML(boxscore, playByPlay, gameId, nyiGameNum);

    var nyiIsHome    = home.abbrev === 'NYI';
    var nextHomeGame = (context && context.nextHomeGame) || '—';

    if (_currentGameId !== gameId) {
      _currentGameId         = gameId;
      _scoreboardInitialized = false;
      _lastSeenGoalEventId   = -1;
      _lastSeenFightEventId  = -1;
      _fightTimerEnd         = 0;
      _fightOverlayData      = null;
    }

    await checkForNewFight(plays, rosterMap, home.id, nyiIsHome);

    var goalTriggered = checkForNewNYIGoals(plays, rosterMap, nyiIsHome, home.id);
    if (!goalTriggered) {
      if (_fightTimerEnd > Date.now()) {
        checkFightAdditionalPenalty(plays, rosterMap, home.id, nyiIsHome);
        applyMoodOverlay(buildFightOverlay());
      } else {
        var review = getReviewStatus(plays, nyiIsHome, home.id);
        if (review.active) {
          applyMoodOverlay(buildGoalReviewOverlay(review.nyiGoal));
        } else {
          var overlay = getSituationOverlay(boxscore, nyiIsHome, nextHomeGame, rosterMap);
          applyMoodOverlay(overlay);
        }
      }
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
