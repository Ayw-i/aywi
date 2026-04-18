const WORKER = 'https://nhl-proxy.aywi.workers.dev';

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
}

// --- Config cache ---

let appConfig = null;
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

function getRegularSeasonState(data) {
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
    return { stateName: 'live', overrides: { headline: headline } };
  }

  if (state === 'OFF' || state === 'FINAL') {
    if (nyiWon(nyiGame)) {
      return { stateName: 'win',  overrides: { headline: getResponseText(config, 'postgame_win') } };
    } else if (wasOTorSO(nyiGame)) {
      return { stateName: 'loss', overrides: { headline: getResponseText(config, 'postgame_loss_ot') } };
    } else {
      return { stateName: 'loss', overrides: { headline: getResponseText(config, 'postgame_loss_reg') } };
    }
  }

  return null;
}

// --- Top-level state application ---

function applyState(data) {
  const { standings, todayGames } = data;

  if (todayGames.some(function (g) { return g.gameType === 3; })) {
    renderMoodState('outside_in');
    clearGameSection();
    return;
  }

  const nyi   = standings.standings.find(function (t) {
    return t.teamAbbrev.default === 'NYI';
  });
  const clinch = nyi ? nyi.clinchIndicator : null;

  if (clinch === 'e' || clinch === 'x' || clinch === 'y' || clinch === 'z') {
    renderMoodState(clinch === 'e' ? 'sorover' : 'clinched');
    showGameSection('Previous game:');
    return;
  }

  clearGameSection();
  var gameInfo = getRegularSeasonState(data);
  if (!gameInfo) {
    renderMoodState('sorover');
    return;
  }
  renderMoodState(gameInfo.stateName, gameInfo.overrides);
}

// --- State detection (real API or mock data) ---

async function detectAndRenderState(mockData) {
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

    applyState({ standings, todayGames, monthGames, config });

  } catch (err) {
    console.error('State detection failed:', err);
    renderMoodState('sorover');
  }
}
