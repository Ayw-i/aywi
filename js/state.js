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
  post_finals: {
    background: '#000000',
    image: 'assets/now_im_on_the_outside.png',
    headline: '',
    headlineLink: 'playoffs.html',
    audioSrc: null,
    fades: false,
  },
  shutout_win: {
    background: '#000000',
    image: 'assets/hey-ovi-tell-me-how.jpg',
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
  preseason: {
    background: '#000000',
    image: null,
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
  },
  schedule_out: {
    background: '#000000',
    image: null,
    headline: 'NEW YEAR, NEW ME',
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

  // Clear the Schedule-Out table unless we're re-entering that state
  // (renderScheduleOutTable repopulates it right after this call)
  var scheduleOutTable = document.getElementById('schedule-out-table');
  if (scheduleOutTable && stateName !== 'schedule_out') scheduleOutTable.innerHTML = '';

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
  var finalText  = outcome === 'REG' ? 'Final' : 'Final/' + outcome;
  // "Final" links through to the full box score on game.html. Mauve-tinted gray
  // (vs the #aaa of the surrounding label) so it reads as a link without going
  // bright white.
  var finalLabel = game.id
    ? '<a href="game.html?id=' + encodeURIComponent(game.id) + '" ' +
      'title="Full box score" style="color:' + LINK_TINT + ';text-decoration:underline;">' +
      finalText + '</a>'
    : finalText;
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

// Bare #/Date/Opponent schedule table for the Schedule-Out state — nothing's
// been played yet, so no result/score/record columns. Reuses the shared
// formatting helpers from nhl-schedule.js (same look as season.html).
function renderScheduleOutTable(games) {
  var container = document.getElementById('schedule-out-table');
  if (!container) return;
  var regGames = games.filter(function (g) { return g.gameType === 2; });
  if (!regGames.length) { container.innerHTML = ''; return; }

  var TH = 'style="padding:4px 8px;font-size:9pt;color:#666;text-align:left;border-bottom:1px solid #333;"';
  var rows = regGames.map(function (g, i) {
    var isHome    = g.homeTeam.abbrev === 'NYI';
    var opp       = isHome ? g.awayTeam : g.homeTeam;
    var dc        = dateColor(regGames, i);
    var dateStyle = dc ? 'color:' + dc + ';' : '';
    var time      = formatGameTime(g.startTimeUTC, g.easternUTCOffset);
    var dateCell  = formatSeasonDate(g.gameDate) +
      '<br><span style="font-size:8pt;opacity:0.6;">' + time + '</span>';
    var prefix = isHome ? 'vs ' : '@ ';
    var rowBg  = i % 2 === 1 ? 'background-color:#0d0d0d;' : '';
    var TD     = 'style="padding:3px 8px;font-size:10pt;';
    return '<tr style="' + rowBg + '">' +
      '<td style="padding:3px 6px;text-align:right;font-size:9pt;color:#444;">' + (i + 1) + '</td>' +
      '<td ' + TD + dateStyle + '">' + dateCell + '</td>' +
      '<td ' + TD + '">' + prefix + logoImg(opp.abbrev) + opp.abbrev + '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<table width="100%" style="border:none;"><tr><td style="border:none;">' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<thead><tr>' +
      '<th ' + TH + ' style="text-align:right;">#</th>' +
      '<th ' + TH + '>Date</th>' +
      '<th ' + TH + '>Opponent</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</td></tr></table>';
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
    case 'post_finals':
      return r.post_finals;
    case 'offseason':
      return r.offseason.replace('{days}', String(params.days));
    case 'preseason':
      return r.preseason;
    default: return '';
  }
}

// --- Regular season state ---

// Preseason (1) and regular season (2) games both count as "a game NYI played" —
// playoffs (3) are handled separately upstream in applyState().
function isCountedGame(g) {
  return g.gameType === 1 || g.gameType === 2;
}

async function getRegularSeasonState(data) {
  const { todayGames, monthGames, config } = data;

  const nyiGame = todayGames.find(function (g) {
    return isCountedGame(g) && isNYIGame(g);
  });

  if (!nyiGame) {
    const completed = monthGames.filter(function (g) {
      return isCountedGame(g) && isNYIGame(g) && (g.gameState === 'OFF' || g.gameState === 'FINAL');
    });
    const upcoming = monthGames.filter(function (g) {
      return isCountedGame(g) && isNYIGame(g) && (g.gameState === 'FUT' || g.gameState === 'PRE');
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

// --- Off-season detection ---

function daysBetween(a, b) {
  var oneDay = 24 * 60 * 60 * 1000;
  var utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / oneDay);
}

// Finds when the Stanley Cup Final (bracket series 'O') was decided, regardless of
// whether NYI was in it. Returns null if the Final hasn't concluded (or bracket data
// isn't available yet, e.g. early in the season).
async function getStanleyCupFinalEndDate() {
  var now = new Date();
  // NHL Finals are always decided in spring. Only roll back to last calendar
  // year in Jan-Mar, before that year's own playoffs have happened yet —
  // every other month (including Sep-Dec) should look at the current year's
  // bracket, since that's the one that most recently concluded.
  var bracketYear = now.getMonth() <= 2 ? now.getFullYear() - 1 : now.getFullYear();
  try {
    var bracketData = await fetch(WORKER + '/v1/playoff-bracket/' + bracketYear)
      .then(function (r) { return r.json(); });
    var finalSeries = (bracketData.series || []).find(function (s) { return s.seriesLetter === 'O'; });
    if (!finalSeries) return null;

    var topWins    = finalSeries.topSeedWins    || 0;
    var bottomWins = finalSeries.bottomSeedWins || 0;
    if (topWins < 4 && bottomWins < 4) return null;

    var topAbbrev    = (finalSeries.topSeedTeam    || {}).abbrev;
    var bottomAbbrev = (finalSeries.bottomSeedTeam || {}).abbrev;
    if (!topAbbrev || !bottomAbbrev) return null;

    // The season string for the season that just concluded — derived from
    // bracketYear rather than getSelectedSeason(), which reflects whatever
    // season is *currently* underway and would be wrong here once a new
    // season has since started (e.g. looking up June 2026's Final in Sept 2026).
    var finalSeasonStr = (bracketYear - 1) + '' + bracketYear;
    var schedData = await fetch(WORKER + '/v1/club-schedule-season/' + topAbbrev + '/' + finalSeasonStr)
      .then(function (r) { return r.json(); });
    var finalGames = (schedData.games || []).filter(function (g) {
      if (g.gameType !== 3) return false;
      if (g.gameState !== 'OFF' && g.gameState !== 'FINAL') return false;
      var ha = (g.homeTeam || {}).abbrev, aa = (g.awayTeam || {}).abbrev;
      return (ha === topAbbrev && aa === bottomAbbrev) || (ha === bottomAbbrev && aa === topAbbrev);
    }).sort(function (a, b) { return (a.id || 0) - (b.id || 0); });

    if (!finalGames.length) return null;
    var lastGame = finalGames[finalGames.length - 1];
    return lastGame.gameDate ? new Date(lastGame.gameDate + 'T12:00:00') : null;
  } catch (e) {
    return null;
  }
}

// Fetches next season's full schedule, keyed off the year the most recently
// concluded Final was decided (not `now`, which has the Sep-Dec ambiguity
// getStanleyCupFinalEndDate had). Returns [] if the NHL hasn't published it yet.
async function getUpcomingSeasonSchedule(finalEndDate) {
  var finalYear = finalEndDate.getFullYear();
  var upcomingSeason = finalYear + '' + (finalYear + 1); // Final decided in 2026 -> next season "20262027"
  try {
    var schedData = await fetch(WORKER + '/v1/club-schedule-season/NYI/' + upcomingSeason)
      .then(function (r) { return r.json(); });
    return schedData.games || [];
  } catch (e) {
    return [];
  }
}

// Fallback estimate for the summer stretch before next season's schedule is published.
function getEstimatedPreseasonStartDate(config) {
  var now = new Date();
  var startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  var monthDay = (config.season && config.season.preseasonStartEstimateMonthDay) || '09-21';
  var parts = monthDay.split('-');
  return new Date(startYear + 1, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10), 12, 0, 0);
}

// --- Top-level state application ---

async function applyState(data) {
  const { standings, todayGames, config } = data;

  if (todayGames.some(function (g) { return g.gameType === 3; })) {
    if (!data.isMock) checkMonthSanity(config, 'outside_in');
    renderMoodState('outside_in');
    clearGameSection();
    return 'outside_in';
  }

  const nyi    = standings.standings.find(function (t) { return t.teamAbbrev.default === 'NYI'; });
  const clinch = nyi ? nyi.clinchIndicator : null;
  let clinchMood = clinch ? CLINCH_MOOD_MAP[clinch] : null;

  // /v1/standings/now keeps serving last season's final standings until the new
  // season's start to populate, so in the preseason/off-season stretch the
  // clinchIndicator is stale ("e" all summer if NYI missed the playoffs). Drop
  // it when the current month isn't one this mood belongs in, otherwise it
  // overrides real preseason/early-season game states with Sorover/Clinched.
  if (!data.isMock && clinchMood && !isMonthAllowedForState(config, clinchMood, new Date())) {
    console.warn('[state] Ignoring stale "' + clinchMood + '" clinch mood — current month is ' +
      'outside its expected window (config.stateMonthGates); standings data is likely ' +
      'left over from last season.');
    clinchMood = null;
  }

  const clinchOverrides = clinchMood ? CLINCH_STATE_OVERRIDES[clinchMood] : null;

  var gameInfo = await getRegularSeasonState(data);

  if (!gameInfo) {
    // No NYI games found this month — could be a mid-season gap, or the whole
    // playoffs (league-wide) may have wrapped up. Check the latter before falling
    // back to the persisted clinch mood. Skipped for dev mock data so the mock
    // panel's Sorover/Clinched buttons aren't overridden by real live season state.
    var finalEndDate = data.isMock ? null : await getStanleyCupFinalEndDate();
    if (finalEndDate) {
      var windowDays = (config.season && config.season.postFinalsWindowDays) || 7;
      var daysSinceFinal = daysBetween(finalEndDate, new Date());
      if (daysSinceFinal < windowDays) {
        if (!data.isMock) checkMonthSanity(config, 'post_finals');
        renderMoodState('post_finals', { headline: getResponseText(config, 'post_finals') });
        clearGameSection();
        return 'post_finals';
      }

      var upcomingGames = await getUpcomingSeasonSchedule(finalEndDate);
      var hasRegularSeasonGames = upcomingGames.some(function (g) { return g.gameType === 2; });

      if (!hasRegularSeasonGames) {
        // Next season's schedule isn't published yet at all (roughly June-early Aug).
        var estDate = getEstimatedPreseasonStartDate(config);
        var estDays = Math.max(0, daysBetween(new Date(), estDate));
        if (!data.isMock) checkMonthSanity(config, 'offseason');
        renderMoodState('offseason', { headline: getResponseText(config, 'offseason', { days: estDays }) });
        clearGameSection();
        return 'offseason';
      }

      var preseasonGames = upcomingGames
        .filter(function (g) { return g.gameType === 1 && g.gameDate; })
        .sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
      var preseasonStart     = preseasonGames.length ? new Date(preseasonGames[0].gameDate + 'T12:00:00') : null;
      var daysUntilPreseason = preseasonStart ? daysBetween(new Date(), preseasonStart) : null;
      var cutoff             = (config.season && config.season.scheduleOutCutoffDays) || 10;
      var month              = new Date().getMonth() + 1;

      if (preseasonStart && daysUntilPreseason <= 0) {
        if (!data.isMock) checkMonthSanity(config, 'preseason');
        renderMoodState('preseason', { headline: getResponseText(config, 'preseason') });
        clearGameSection();
        return 'preseason';
      }

      if (preseasonStart && daysUntilPreseason <= cutoff) {
        if (!data.isMock) checkMonthSanity(config, 'offseason');
        renderMoodState('offseason', { headline: getResponseText(config, 'offseason', { days: daysUntilPreseason }) });
        clearGameSection();
        return 'offseason';
      }

      if (month === 8 || month === 9) {
        if (!data.isMock) checkMonthSanity(config, 'schedule_out');
        renderMoodState('schedule_out');
        renderScheduleOutTable(upcomingGames);
        clearGameSection();
        return 'schedule_out';
      }

      // Schedule is out, but it's not Aug/Sep and preseason is still far off
      // (shouldn't normally happen) — fall back to a generic countdown.
      var fallbackDays = daysUntilPreseason != null ? daysUntilPreseason
        : Math.max(0, daysBetween(new Date(), getEstimatedPreseasonStartDate(config)));
      if (!data.isMock) checkMonthSanity(config, 'offseason');
      renderMoodState('offseason', { headline: getResponseText(config, 'offseason', { days: fallbackDays }) });
      clearGameSection();
      return 'offseason';
    }

    // No Final data available at all (real fetch failed, or genuinely no month
    // makes sense for it yet). Only trust the clinch-mood/Sorover default when
    // the current month is actually plausible for it — otherwise this is the
    // exact failure mode that used to show Sorover in September.
    var fallbackMood = clinchMood || 'sorover';
    if (!data.isMock && !isMonthAllowedForState(config, fallbackMood, new Date())) {
      console.warn('[state] "' + fallbackMood + '" blocked outside its expected months ' +
        '(config.stateMonthGates) — rendering preseason placeholder instead.');
      renderMoodState('preseason', { headline: getResponseText(config, 'preseason') });
      clearGameSection();
      return 'preseason';
    }

    renderMoodState(fallbackMood);
    if (clinchMood) { showGameSection('Previous game:'); fetchAndRenderLastGame(); }
    else            { clearGameSection(); }
    return fallbackMood;
  }

  // Apply clinch mood override if this game state is in the override list
  var moodOverridden = clinchOverrides && clinchOverrides.indexOf(gameInfo.stateName) !== -1;
  if (moodOverridden) {
    // clinchMood already passed its month gate above, or it would be null here.
    renderMoodState(clinchMood);
  } else {
    if (!data.isMock) checkMonthSanity(config, gameInfo.stateName);
    renderMoodState(gameInfo.stateName, gameInfo.overrides);
  }

  // Render scoreboard for live and final games (skip mock objects which have no id)
  if (gameInfo.gameObj && gameInfo.gameObj.id && typeof renderLiveGame === 'function') {
    renderLiveGame(gameInfo.gameObj, { nextHomeGame: gameInfo.nextHomeGame || '—', config: data.config });
  }

  // Show the previous game's scoreboard when there's nothing else showing one:
  // the clinched/eliminated moods, and between-games win/loss (no gameObj, so
  // renderLiveGame above didn't run). Live/pregame are excluded — live renders
  // its own scoreboard, and pregame has no result to show yet.
  var showsOwnScoreboard = !!gameInfo.gameObj;
  if ((clinchMood || !showsOwnScoreboard) &&
      gameInfo.stateName !== 'live' && gameInfo.stateName !== 'pregame') {
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

    const renderedState = await applyState({ standings, todayGames, monthGames, config, isMock: !!mockData });

    if (renderedState === 'live' && !mockData) {
      _liveRefreshTimer = setInterval(detectAndRenderState, 30000);
    }

  } catch (err) {
    console.error('State detection failed:', err);
    renderMoodState('sorover');
  }
}
