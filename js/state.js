var _liveRefreshTimer = null;

const STATES = {
  sorover: {
    background: '#2bae66',
    image: 'assets/sorover.png',
    headline: "IT'S SOROVER",
    headlineLink: null,
    audioSrc: 'assets/only%20posers%20fall%20in%20love.mp3',
    fades: true,
  },
  clinched: {
    background: '#000000',
    image: 'assets/roblox engvall.png',
    headline: 'Clinched.',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
  outside_in: {
    background: '#000000',
    image: 'assets/now_im_on_the_outside.png',
    headline: 'OUTSIDE IN',
    headlineLink: 'playoffs.html',
    audioSrc: null,
    fades: false,
  },
  shutout_win: {
    background: '#000000',
    image: 'assets/sorokin-butt.jpg',
    imageSize: '50%',
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
    headlineAbove: true,
  },
  win: {
    background: '#000000',
    image: 'assets/lee.png',
    imageSize: '30%',
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
  loss: {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
  live: {
    background: '#000000',
    image: null,
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
  pregame: {
    background: '#000000',
    image: null,
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
  offseason: {
    background: '#000000',
    image: null,
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
};

function renderMoodState(stateName, overrides) {
  const base = STATES[stateName];
  if (!base) return;
  const state = Object.assign({}, base, overrides || {});

  document.body.style.backgroundColor = state.background;

  // Clear live scoreboard only for non-live states that have no loaded game
  // (renderLiveGame repopulates it when transitioning into live state)

  // Clear any situation overlay from a prior live state
  var sitImg = document.getElementById('situation-img');
  if (sitImg) sitImg.parentNode.removeChild(sitImg);
  var sitAbove = document.getElementById('situation-above');
  if (sitAbove) sitAbove.parentNode.removeChild(sitAbove);

  // Stop YouTube if a review overlay was active
  if (typeof _ytMode !== 'undefined' && _ytMode) {
    _ytMode = false;
    if (typeof _ytPlayer !== 'undefined' && _ytPlayer && _ytReady) _ytPlayer.pauseVideo();
    var ytWidget = document.getElementById('yt-widget');
    if (ytWidget) ytWidget.style.display = 'none';
  }
  var moodSub = document.getElementById('mood-sub');
  if (moodSub) { moodSub.innerHTML = ''; moodSub.style.display = 'none'; }

  const img = document.getElementById('mood-image');
  if (state.image) {
    img.src = state.image;
    img.style.maxWidth = state.imageSize || '50%';
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }

  const headline = document.getElementById('mood-headline');
  if (state.headlineLink) {
    headline.innerHTML =
      '<a href="' + state.headlineLink + '" style="color:white;text-decoration:underline;">' +
      state.headline + '</a>';
  } else {
    headline.textContent = state.headline;
  }
  headline.style.fontSize = state.headline.length > 25 ? '28pt' : '';

  // Reorder headline vs image in the DOM based on state flag
  var moodSection = img.parentNode;
  if (state.headlineAbove) {
    moodSection.insertBefore(headline, img);
  } else {
    moodSection.insertBefore(img, headline);
  }

  const audio = document.getElementById('bg-audio');
  const toggle = document.getElementById('sound-toggle');
  audio.pause();
  if (state.audioSrc) {
    audio.src = state.audioSrc;
    toggle.style.display = 'block';
    audio.play().catch(function () {});
  } else {
    audio.src = '';
    toggle.style.display = 'none';
  }

  if (!state.fades) {
    document.getElementById('site-header').classList.add('visible');
    document.querySelectorAll('.fade-section').forEach(function (el) {
      el.classList.add('visible');
    });
  }
}

function showGameSection(text) {
  const gameHeadline = document.getElementById('game-headline');
  const gameSection  = document.getElementById('game-section');
  gameHeadline.textContent = text;
  gameSection.classList.remove('visible');
  if (typeof _uiObserving !== 'undefined' && _uiObserving) {
    _uiObserver.observe(gameSection);
  }
}

function clearGameSection() {
  const gameHeadline = document.getElementById('game-headline');
  const gameSection  = document.getElementById('game-section');
  gameHeadline.textContent = '';
  gameSection.classList.remove('visible');
  var prevScore = document.getElementById('prev-game-score');
  if (prevScore) prevScore.innerHTML = '';
}

function renderPreviousGameScore(game, nyiGameNum) {
  var container = document.getElementById('prev-game-score');
  if (!container) return;
  if (!game) { container.innerHTML = ''; return; }

  var home    = game.homeTeam || {};
  var away    = game.awayTeam || {};
  var outcome = (game.gameOutcome && game.gameOutcome.lastPeriodType) || 'REG';
  var finalLabel = outcome === 'REG' ? 'Final' : 'Final/' + outcome;
  if (nyiGameNum) {
    var nhlGameNum = (game.gameType === 2 && game.id)
      ? parseInt(String(game.id).slice(-4), 10) : null;
    var tooltip = nhlGameNum ? ' title="NHL Game ' + nhlGameNum + '"' : '';
    finalLabel = '<span' + tooltip + ' style="cursor:default;">Game ' + nyiGameNum + '</span><br>' + finalLabel;
  }

  function teamCell(team) {
    var abbrev = team.abbrev || '';
    return '<td width="35%" align="center" style="border:none;">' +
      '<img src="https://assets.nhle.com/logos/nhl/svg/' + abbrev + '_light.svg" width="56" alt="' + abbrev + '" ' +
      'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 4px;">' +
      '<div style="font-size:10pt;">' + abbrev + '</div>' +
      '<div style="font-size:22pt;font-weight:bold;line-height:1.1;">' + (team.score != null ? team.score : '&mdash;') + '</div>' +
      '</td>';
  }

  container.innerHTML =
    '<table style="width:100%;border-collapse:collapse;margin:10px 0;"><tr>' +
      teamCell(away) +
      '<td width="30%" align="center" style="border:none;font-size:9pt;color:#aaa;letter-spacing:1px;text-transform:uppercase;">' + finalLabel + '</td>' +
      teamCell(home) +
    '</tr></table>';
}


// --- Config cache ---

var appConfig = null;
async function getConfig() {
  if (!appConfig) {
    const res = await fetch('config.json');
    appConfig = await res.json();
  }
  return appConfig;
}

// --- NYI game helpers ---

function isNYIGame(game) {
  return game.awayTeam.abbrev === 'NYI' || game.homeTeam.abbrev === 'NYI';
}

function nyiDiff(game) {
  const nyiScore = game.awayTeam.abbrev === 'NYI'
    ? game.awayTeam.score : game.homeTeam.score;
  const oppScore = game.awayTeam.abbrev === 'NYI'
    ? game.homeTeam.score : game.awayTeam.score;
  return nyiScore - oppScore;
}

function nyiWon(game) { return nyiDiff(game) > 0; }

function oppScore(game) {
  return game.awayTeam.abbrev === 'NYI'
    ? (game.homeTeam.score || 0)
    : (game.awayTeam.score || 0);
}

async function fetchOppLeadingScorer(abbrev) {
  var season = getSelectedSeason();
  try {
    var r = await fetch(WORKER + '/v1/club-stats/' + abbrev + '/' + season + '/2');
    var d = await r.json();
    var skaters = (d.skaters || []).slice().sort(function (a, b) { return b.goals - a.goals; });
    if (skaters.length && skaters[0].lastName) {
      return skaters[0].lastName.default || null;
    }
  } catch (e) {}
  return null;
}

function wasOTorSO(game) {
  return game.gameOutcome &&
    (game.gameOutcome.lastPeriodType === 'OT' ||
     game.gameOutcome.lastPeriodType === 'SO');
}

// --- Response text ---

function getResponseText(config, situation, params) {
  const r = config.responses;
  params = params || {};
  switch (situation) {
    case 'live_leading': {
      const d = params.diff;
      return d >= 4 ? r.live.leading['4plus'] : r.live.leading[String(d)];
    }
    case 'live_tied':
      return r.live.tied;
    case 'live_trailing': {
      const d = Math.abs(params.diff);
      if (d >= 4) return r.live.trailing['4plus']
        .replace('{nextHomeGame}', params.nextHomeGame || '—');
      return r.live.trailing[String(d)];
    }
    case 'postgame_win':      return r.postgame.win;
    case 'postgame_loss_reg': return r.postgame.loss_regulation;
    case 'postgame_loss_ot':  return r.postgame.loss_ot_so;
    case 'between_win':
      return r.between_games.last_was_win
        .replace('{nextGameDay}', params.nextGameDay || 'soon');
    case 'between_loss':
      return r.between_games.last_was_loss
        .replace('{nextGameDay}', params.nextGameDay || 'soon');
    default: return '';
  }
}

// --- Regular season state ---

async function getRegularSeasonState(data) {
  const { todayGames, monthGames, config } = data;

  const nyiGame = todayGames.find(function (g) {
    return g.gameType === 2 && isNYIGame(g);
  });

  if (!nyiGame) {
    const completed = monthGames.filter(function (g) {
      return isNYIGame(g) && (g.gameState === 'OFF' || g.gameState === 'FINAL');
    });
    const upcoming = monthGames.filter(function (g) {
      return isNYIGame(g) && (g.gameState === 'FUT' || g.gameState === 'PRE');
    });
    const lastGame  = completed[completed.length - 1] || null;
    const nextGame  = upcoming[0] || null;
    if (!lastGame) return null;
    const nextGameDay = nextGame ? formatNextGameDay(nextGame.gameDate) : 'soon';

    if (nyiWon(lastGame)) {
      if (oppScore(lastGame) === 0) {
        var opp1 = lastGame.awayTeam.abbrev === 'NYI' ? lastGame.homeTeam : lastGame.awayTeam;
        var cap1 = await fetchOppLeadingScorer(opp1.abbrev);
        return { stateName: 'shutout_win', overrides: { headline: cap1 ? 'Hey ' + cap1 + '...' : 'Hey...' } };
      }
      return { stateName: 'win',  overrides: { headline: getResponseText(config, 'between_win',  { nextGameDay: nextGameDay }), image: null } };
    } else {
      return { stateName: 'loss', overrides: { headline: getResponseText(config, 'between_loss', { nextGameDay: nextGameDay }), image: null } };
    }
  }

  const state = nyiGame.gameState;

  if (state === 'FUT' || state === 'PRE') {
    return { stateName: 'pregame', overrides: { headline: 'Game today.' } };
  }

  if (state === 'LIVE' || state === 'CRIT') {
    const diff      = nyiDiff(nyiGame);
    const situation = diff > 0 ? 'live_leading' : (diff < 0 ? 'live_trailing' : 'live_tied');
    const nextHome  = (monthGames || []).find(function (g) {
      return isNYIGame(g) && g.homeTeam.abbrev === 'NYI' &&
             (g.gameState === 'FUT' || g.gameState === 'PRE');
    });
    const nextHomeGame = nextHome ? formatOrdinalDate(nextHome.gameDate) : '—';
    const headline     = getResponseText(config, situation, { diff: diff, nextHomeGame: nextHomeGame });
    return { stateName: 'live', overrides: { headline: headline }, gameObj: nyiGame, nextHomeGame: nextHomeGame };
  }

  if (state === 'OFF' || state === 'FINAL') {
    if (nyiWon(nyiGame)) {
      if (oppScore(nyiGame) === 0) {
        var opp2 = nyiGame.awayTeam.abbrev === 'NYI' ? nyiGame.homeTeam : nyiGame.awayTeam;
        var cap2 = await fetchOppLeadingScorer(opp2.abbrev);
        return { stateName: 'shutout_win', overrides: { headline: cap2 ? 'Hey ' + cap2 + '...' : 'Hey...' }, gameObj: nyiGame };
      }
      return { stateName: 'win',  overrides: { headline: getResponseText(config, 'postgame_win') }, gameObj: nyiGame };
    } else if (wasOTorSO(nyiGame)) {
      return { stateName: 'loss', overrides: { headline: getResponseText(config, 'postgame_loss_ot') },  gameObj: nyiGame };
    } else {
      return { stateName: 'loss', overrides: { headline: getResponseText(config, 'postgame_loss_reg') }, gameObj: nyiGame };
    }
  }

  return null;
}

// --- Clinch override config ---
// Lists which game states each clinch mood replaces. Edit here to change override behavior.
const CLINCH_MOOD_MAP = {
  'e': 'sorover',   // eliminated
  'x': 'clinched',  // wildcard clinch
  'y': 'clinched',  // division clinch
  'z': 'clinched',  // presidents trophy
};
const CLINCH_STATE_OVERRIDES = {
  'sorover':  ['win', 'loss', 'pregame', 'live'],
  'clinched': ['win', 'loss'],
};

// --- Top-level state application ---

async function applyState(data) {
  const { standings, todayGames } = data;

  if (todayGames.some(function (g) { return g.gameType === 3; })) {
    renderMoodState('outside_in');
    clearGameSection();
    return 'outside_in';
  }

  const nyi        = standings.standings.find(function (t) { return t.teamAbbrev.default === 'NYI'; });
  const clinch     = nyi ? nyi.clinchIndicator : null;
  const clinchMood = clinch ? CLINCH_MOOD_MAP[clinch] : null;
  const clinchOverrides = clinchMood ? CLINCH_STATE_OVERRIDES[clinchMood] : null;

  var gameInfo = await getRegularSeasonState(data);

  if (!gameInfo) {
    // No games found — off-season or no data
    renderMoodState(clinchMood || 'sorover');
    if (clinchMood) { showGameSection('Previous game:'); fetchAndRenderLastGame(); }
    else            { clearGameSection(); }
    return clinchMood || 'sorover';
  }

  // Apply clinch mood override if this game state is in the override list
  var moodOverridden = clinchOverrides && clinchOverrides.indexOf(gameInfo.stateName) !== -1;
  if (moodOverridden) {
    renderMoodState(clinchMood);
  } else {
    renderMoodState(gameInfo.stateName, gameInfo.overrides);
  }

  // Render scoreboard for live and final games (skip mock objects which have no id)
  if (gameInfo.gameObj && gameInfo.gameObj.id && typeof renderLiveGame === 'function') {
    renderLiveGame(gameInfo.gameObj, { nextHomeGame: gameInfo.nextHomeGame || '—', config: data.config });
  }

  // Show previous game section when clinched/eliminated and no active game today
  if (clinchMood && gameInfo.stateName !== 'live' && gameInfo.stateName !== 'pregame') {
    showGameSection('Previous game:');
    fetchAndRenderLastGame();
  } else {
    clearGameSection();
  }

  return gameInfo.stateName;
}

// --- State detection (real API or mock data) ---

function fetchAndRenderLastGame() {
  getSeasonSchedule()
    .then(function (games) {
      var completed = games.filter(function (g) {
        return isNYIGame(g) && (g.gameState === 'OFF' || g.gameState === 'FINAL');
      });
      var lastGame = completed[completed.length - 1] || null;
      var nyiGameNum = lastGame ? getNYIGameNumber(lastGame.id, games) : null;
      renderPreviousGameScore(lastGame, nyiGameNum);
    })
    .catch(function () {});
}

async function detectAndRenderState(mockData) {
  if (typeof _goalTransitionActive !== 'undefined' && _goalTransitionActive) return;

  if (_liveRefreshTimer) {
    clearInterval(_liveRefreshTimer);
    _liveRefreshTimer = null;
  }

  try {
    const config = await getConfig();

    let standings, todayGames, monthGames;

    if (mockData) {
      standings  = mockData.standings;
      todayGames = mockData.todayGames;
      monthGames = mockData.monthGames || [];
    } else {
      const [standingsRes, scheduleRes, monthRes] = await Promise.all([
        fetch(WORKER + '/v1/standings/now'),
        fetch(WORKER + '/v1/score/now'),
        fetch(WORKER + '/v1/club-schedule/NYI/month/now'),
      ]);
      standings       = await standingsRes.json();
      const schedule  = await scheduleRes.json();
      todayGames      = schedule.games;
      const month     = await monthRes.json();
      monthGames      = month.games || [];
    }

    const renderedState = await applyState({ standings, todayGames, monthGames, config });

    if (renderedState === 'live' && !mockData) {
      _liveRefreshTimer = setInterval(detectAndRenderState, 30000);
    }

  } catch (err) {
    console.error('State detection failed:', err);
    renderMoodState('sorover');
  }
}
