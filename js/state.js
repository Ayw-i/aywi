var _liveRefreshTimer = null;

const STATES = {
  sorover: {
    background: '#2bae66',
    image: 'assets/sorover.png',
    headline: "IT'S SOROVER",
    headlineLink: null,
    audioSrc: 'assets/only%20posers%20fall%20in%20love.mp3',
    // Shown in the hover panel next to the sound toggle. The mp3 is track 4
    // of the album (the file is named after the album, not the track).
    audioCredit: {
      title:  'Tinder対現実 • ☹ •',
      artist: 'TVVIN_PINEZ_M4LL',
      cover:  'assets/only-posers-cover.jpg',
      link:   'https://powerlunch.bandcamp.com/track/tinder',
      linkLabel: 'on Bandcamp ↗',
    },
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
  // GIF, then a line under it (subHeadline, set by getRegularSeasonState).
  // The postgame headline is empty (config.json) — headlineAbove keeps the
  // line directly under the GIF. Between-games wins reuse this state with no
  // image and their own headline.
  // imageSize 100%: the GIFs are small (291-360px wide), so they show at their
  // own size, and at most the full width on a phone.
  win: {
    background: '#000000',
    image: 'assets/offsides_like_how_worf_rides_with_starfleet.gif',
    imageSize: '100%',
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
    headlineAbove: true,
  },
  ot_win: {
    background: '#000000',
    image: 'assets/schot_woll.gif',
    imageSize: '100%',
    headline: '',
    headlineLink: null,
    audioSrc: null,
    fades: true,
    headlineAbove: true,
  },
  // No image — the shootout chart in the scoreboard below is the picture
  shootout_win: {
    background: '#000000',
    image: null,
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

  // Stop YouTube (a review overlay, or an earlier state's song) — unless this
  // state plays the same song, which keeps going instead of starting over
  if (typeof _ytMode !== 'undefined' && _ytMode && _ytMusicId !== state.youtubeId) ytStop();
  // Line under the headline — or under the image, when the headline sits above
  // it. Starts from mood-sub's own look each time (from index.html), since the
  // goal transition and subHeadlineStyle restyle it.
  var moodSub = document.getElementById('mood-sub');
  if (moodSub) {
    if (moodSub.dataset.baseStyle == null) moodSub.dataset.baseStyle = moodSub.getAttribute('style') || '';
    moodSub.setAttribute('style', moodSub.dataset.baseStyle);
    if (state.subHeadline) {
      moodSub.textContent   = state.subHeadline;   // may hold an API name — never innerHTML
      moodSub.style.cssText += state.subHeadlineStyle || '';
      moodSub.style.display = 'block';
    } else {
      moodSub.innerHTML     = '';
      moodSub.style.display = 'none';
    }
  }

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
  } else if (state.headlineHTML) {
    // Only for markup this code builds itself (e.g. the countdown's hover
    // note) — never for text that comes from an API or feed.
    headline.innerHTML = state.headlineHTML;
  } else {
    headline.textContent = state.headline;
  }
  // Long headlines shrink to fit; a state can pin a size instead with headlineFontSize
  headline.style.fontSize = state.headlineFontSize || (state.headline.length > 25 ? '28pt' : '');

  // Reorder headline vs image in the DOM based on state flag
  var moodSection = img.parentNode;
  if (state.headlineAbove) {
    moodSection.insertBefore(headline, img);
  } else {
    moodSection.insertBefore(img, headline);
  }

  // Optional smaller line above the headline (the shutout screen's). Uses the
  // #situation-above slot, which the top of this function clears every render.
  if (state.aboveHeadline) {
    var above = document.createElement('div');
    above.id = 'situation-above';
    above.style.cssText = 'text-align:center;font-weight:bold;font-size:18pt;margin-bottom:8px;';
    above.textContent = state.aboveHeadline;
    moodSection.insertBefore(above, headline);
  }

  const audio       = document.getElementById('bg-audio');
  const soundWidget = document.getElementById('sound-widget');
  audio.pause();
  if (state.audioSrc) {
    audio.src = state.audioSrc;
    soundWidget.style.display = 'block';
    renderSoundCredit(state.audioCredit);
    audio.play().catch(function () {});
  } else {
    audio.src = '';
    soundWidget.style.display = 'none';
  }

  // Music from a YouTube video instead of an mp3 (the Rangers win songs).
  // It brings its own ▶/⏸ button, the one the goal review uses.
  if (state.youtubeId && typeof ytPlayMusic === 'function') ytPlayMusic(state.youtubeId);

  if (!state.fades) {
    document.getElementById('site-header').classList.add('visible');
    document.querySelectorAll('.fade-section').forEach(function (el) {
      el.classList.add('visible');
    });
  }
}

// Fills the hover panel next to the sound toggle. States with audio but no
// credit get no panel, so hovering the toggle shows nothing.
function renderSoundCredit(credit) {
  var panel = document.getElementById('sound-panel');
  if (!panel) return;
  if (!credit) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  document.getElementById('sound-cover').src          = credit.cover || '';
  document.getElementById('sound-title').textContent  = credit.title || '';
  document.getElementById('sound-artist').textContent = credit.artist || '';
  document.getElementById('sound-source').textContent = credit.linkLabel || '';
  document.getElementById('sound-link').href          = credit.link || '#';
}

function showGameSection(text) {
  const gameHeadline = document.getElementById('game-headline');
  const gameSection  = document.getElementById('game-section');
  gameHeadline.textContent = text;
  setNextGameRevealed(false);
  gameSection.style.display = '';
  gameSection.classList.remove('visible');
  if (typeof _uiObserving !== 'undefined' && _uiObserving) {
    _uiObserver.observe(gameSection);
  }
}

// Hides the whole game section, divider line included. States that show their
// game up in the mood section (pregame, live, final today) or no game at all
// would otherwise leave an empty gap between two lines.
function clearGameSection() {
  const gameHeadline = document.getElementById('game-headline');
  const gameSection  = document.getElementById('game-section');
  gameHeadline.textContent = '';
  gameSection.style.display = 'none';
  gameSection.classList.remove('visible');
  var prevScore = document.getElementById('prev-game-score');
  if (prevScore) prevScore.innerHTML = '';
  renderNextGameCard(null);
  setNextGameRevealed(false);
}

// The next game card stays folded away until the day in "we'll win again on
// Friday" is clicked (nextGameDayLink below); clicking again folds it back.
var _nextGameOpen = false;

// animate = grow the space open and fade the card in (or shrink and fade out);
// otherwise it just appears / disappears.
function setNextGameRevealed(show, animate) {
  var reveal = document.getElementById('next-game-reveal');
  if (!reveal) return;
  _nextGameOpen = show;

  if (!animate) {
    reveal.style.display = show ? '' : 'none';
    reveal.style.height  = '';
    reveal.style.opacity = '';
    return;
  }

  // Pin the wrapper at its current height (0 when folded away), then set the
  // height it's heading to — the CSS transition on #next-game-reveal slides it
  // there, and everything below moves with it.
  var from = reveal.style.display === 'none' ? 0 : reveal.offsetHeight;
  reveal.style.display = '';
  var to = show ? reveal.scrollHeight : 0;
  reveal.style.height = from + 'px';
  if (from === 0) reveal.style.opacity = '0';
  reveal.offsetHeight;   // reading a size makes the browser apply the start values first
  reveal.style.height  = to + 'px';
  reveal.style.opacity = show ? '1' : '0';

  reveal.ontransitionend = function (e) {
    if (e.target === reveal && e.propertyName === 'height') finishNextGameReveal(reveal);
  };
  if (from === to) finishNextGameReveal(reveal);   // nothing to slide, so no transitionend
}

// After the slide: open goes back to its natural height (so it still fits if
// the card changes), folded goes back to hidden.
function finishNextGameReveal(reveal) {
  reveal.style.height = '';
  if (!_nextGameOpen) {
    reveal.style.display = 'none';
    reveal.style.opacity = '';
  }
}

function toggleNextGame(event) {
  event.preventDefault();
  // Only animate when the game section is already showing — otherwise the
  // card just arrives with the section's own fade-in below.
  var gameSection = document.getElementById('game-section');
  var animate = gameSection && gameSection.classList.contains('visible');
  setNextGameRevealed(!_nextGameOpen, animate);
  // Clicking counts as the first scroll: fade in the header and the sections
  // on screen, or the card would unfold inside a still-invisible game section.
  if (typeof revealHeader === 'function') revealHeader();
}

// "on Friday" -> "on <link>Friday</link>", "tomorrow" -> "<link>tomorrow</link>".
// Same white underline as the other headline links.
function nextGameDayLink(dayText) {
  var prefix = dayText.indexOf('on ') === 0 ? 'on ' : '';
  return prefix +
    '<a href="#" onclick="toggleNextGame(event)" title="Show next game" ' +
    'style="color:white;text-decoration:underline;">' + dayText.slice(prefix.length) + '</a>';
}

// One side of a previous/next game card: logo, abbrev, big score (or a dash
// for a game that hasn't been played).
function gameCardTeamCell(team, scoreHTML) {
  var abbrev = team.abbrev || '';
  return '<td width="35%" align="center" style="border:none;">' +
    '<img src="https://assets.nhle.com/logos/nhl/svg/' + abbrev + '_light.svg" width="56" alt="' + abbrev + '" ' +
    'onerror="this.style.display=\'none\'" style="display:block;margin:0 auto 4px;">' +
    '<div style="font-size:10pt;">' + abbrev + '</div>' +
    '<div style="font-size:22pt;font-weight:bold;line-height:1.1;">' + scoreHTML + '</div>' +
    '</td>';
}

// Away | center label | home, the layout both game cards share. Margins are in
// index.html's CSS (the next game card trims its bottom one).
function gameCardTable(away, centerHTML, home, awayScore, homeScore) {
  return '<table style="width:100%;border-collapse:collapse;"><tr>' +
      gameCardTeamCell(away, awayScore) +
      '<td width="30%" align="center" style="border:none;font-size:9pt;color:#aaa;letter-spacing:1px;text-transform:uppercase;">' + centerHTML + '</td>' +
      gameCardTeamCell(home, homeScore) +
    '</tr></table>';
}

// Same card as the previous game, for the next one: dashes for scores, and the
// date and puck drop (viewer's own time zone, like the pregame preview) in the
// middle. game is a club-schedule-season object; null hides the card.
function renderNextGameCard(game, nyiGameNum) {
  var headline  = document.getElementById('next-game-headline');
  var container = document.getElementById('next-game-score');
  if (!headline || !container) return;
  if (!game) {
    headline.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  var lines = [];
  if (nyiGameNum)               lines.push('Game ' + nyiGameNum);
  else if (game.gameType === 1) lines.push('Preseason');
  lines.push(formatSeasonDate(game.gameDate));
  // TBD games still carry a placeholder start time — don't show it
  if (game.gameScheduleState === 'TBD' || !game.startTimeUTC) {
    lines.push('Time TBD');
  } else {
    lines.push(new Date(game.startTimeUTC).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }));
  }

  headline.style.display = '';
  container.innerHTML = gameCardTable(game.awayTeam || {}, lines.join('<br>'),
    game.homeTeam || {}, '&ndash;', '&ndash;');
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

  function score(team) { return team.score != null ? team.score : '&mdash;'; }

  container.innerHTML = gameCardTable(away, finalLabel, home, score(away), score(home));
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

// Last name of the opponent's top goal scorer, for the shutout headline
// ("Hey Ovi..."). This season first — but club-stats stay empty until the
// first regular-season game, so fall back to last season's leader. null if
// neither has one, and the headline is just "Hey...".
async function fetchOppLeadingScorer(abbrev) {
  var season     = getSelectedSeason();
  var startYear  = parseInt(season.slice(0, 4), 10);
  var lastSeason = (startYear - 1) + '' + startYear;
  return (await fetchTopGoalScorer(abbrev, season)) ||
         (await fetchTopGoalScorer(abbrev, lastSeason));
}

// Regular-season goals leader's last name for one team and season, or null
// (no stats yet, nobody has scored, or the fetch failed).
async function fetchTopGoalScorer(abbrev, season) {
  try {
    var r = await fetch(WORKER + '/v1/club-stats/' + abbrev + '/' + season + '/2');
    var d = await r.json();
    var skaters = (d.skaters || []).slice().sort(function (a, b) { return b.goals - a.goals; });
    if (skaters.length && skaters[0].goals > 0 && skaters[0].lastName) {
      return skaters[0].lastName.default || null;
    }
  } catch (e) {}
  return null;
}

// Beating the Rangers (regulation or OT win): the song cue replaces the win
// screen's GIF, headline and the line under it, and the song plays. Home or
// away picks which one — the Chicken Dance at home, since that's where it
// started (and it plays more at UBS Arena), and "If You're Happy And You Know
// It" on the road. Headlines are in config.json.
const RANGERS_WIN_SONGS = {
  home: { headlineKey: 'rangers_win_home', youtubeId: 'Nt81gzIAt18' },  // The Chicken Dance
  away: { headlineKey: 'rangers_win_away', youtubeId: 'hmEe-YUZ0VA' },  // If You're Happy And You Know It
};

// Extra overrides for a win over the Rangers; {} for any other opponent.
function rangersWinOverrides(game, config) {
  var nyiIsHome = game.homeTeam.abbrev === 'NYI';
  var opp       = nyiIsHome ? game.awayTeam : game.homeTeam;
  if (opp.abbrev !== 'NYR') return {};
  var song = RANGERS_WIN_SONGS[nyiIsHome ? 'home' : 'away'];
  return {
    headline:    getResponseText(config, song.headlineKey),
    image:       null,
    subHeadline: null,
    youtubeId:   song.youtubeId,
  };
}

function wasOTorSO(game) {
  return game.gameOutcome &&
    (game.gameOutcome.lastPeriodType === 'OT' ||
     game.gameOutcome.lastPeriodType === 'SO');
}

// Last name of whoever scored NYI's OT winner. /v1/score/now lists every goal
// on the game object, and the winner is the last one. null if that list isn't
// there (yet) or its last goal isn't an NYI OT goal.
function otWinnerLastName(game) {
  var goals = game.goals || [];
  var last  = goals[goals.length - 1];
  if (!last || last.teamAbbrev !== 'NYI') return null;
  if ((last.periodDescriptor || {}).periodType !== 'OT') return null;
  return (last.lastName && last.lastName.default) || null;
}

// --- Response text ---

// "Tonight" from 3PM until 6AM (roughly sunrise), "Today" the rest of the
// morning and early afternoon — the win screen can hang around until the NHL
// flips its date around noon. Uses the viewer's own clock.
function tonightOrToday() {
  var hour = new Date().getHours();
  return (hour >= 15 || hour < 6) ? 'Tonight' : 'Today';
}

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
    case 'postgame_win_sub':
      return r.postgame.win_sub.replace('{tonightOrToday}', tonightOrToday());
    case 'postgame_ot_win':   return r.postgame.ot_win;
    case 'postgame_ot_win_sub':
      return r.postgame.ot_win_sub.replace('{scorer}', params.scorer || '');
    case 'postgame_shootout_win':     return r.postgame.shootout_win;
    case 'postgame_shootout_win_sub': return r.postgame.shootout_win_sub;
    case 'shutout_win_above':         return r.postgame.shutout_win_above;
    case 'rangers_win_home':          return r.postgame.rangers_win_home;
    case 'rangers_win_away':          return r.postgame.rangers_win_away;
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

    if (nyiWon(lastGame) && oppScore(lastGame) === 0) {
      var opp1 = lastGame.awayTeam.abbrev === 'NYI' ? lastGame.homeTeam : lastGame.awayTeam;
      var cap1 = await fetchOppLeadingScorer(opp1.abbrev);
      return { stateName: 'shutout_win', overrides: {
        headline:      cap1 ? 'Hey ' + cap1 + '...' : 'Hey...',
        aboveHeadline: getResponseText(config, 'shutout_win_above'),
      } };
    }
    // The next game's day links to the folded-away next game card. "soon" (no
    // next game this month) stays plain text.
    var betweenKey = nyiWon(lastGame) ? 'between_win' : 'between_loss';
    var betweenOverrides = {
      headline: getResponseText(config, betweenKey, { nextGameDay: nextGameDay }),
      image:    null,
    };
    if (nextGame) {
      betweenOverrides.headlineHTML =
        getResponseText(config, betweenKey, { nextGameDay: nextGameDayLink(nextGameDay) });
    }
    return { stateName: nyiWon(lastGame) ? 'win' : 'loss', overrides: betweenOverrides };
  }

  const state = nyiGame.gameState;

  if (state === 'FUT' || state === 'PRE') {
    // Within 3 hours of puck drop, count down instead. Rounded up so it never
    // says "0 minutes". Once the listed start time passes it's "Any minute
    // now." — the NHL keeps the game in PRE through anthems and intros until
    // the real puck drop. The 60s pregame refresh keeps all of this current.
    // The countdown is pinned to 28pt so the size doesn't jump as its length
    // changes ("Game in 2 hours." vs "Game in 2 hours 59 minutes.").
    var pregameOverrides = { headline: 'Game today.' };
    if (nyiGame.startTimeUTC) {
      var minsToPuckDrop = Math.ceil((new Date(nyiGame.startTimeUTC) - new Date()) / 60000);
      if (minsToPuckDrop > 0 && minsToPuckDrop <= 180) {
        pregameOverrides = {
          headline: 'Game in ' + formatCountdown(minsToPuckDrop) + '.',
          headlineFontSize: '28pt',
        };
        // Under an hour, the listed start time is close enough that the gap to
        // the real puck drop (anthems, intros) matters — say so on hover.
        if (minsToPuckDrop < 60) {
          pregameOverrides.headlineHTML = 'Game in ' +
            '<span class="hover-note">' + formatCountdown(minsToPuckDrop) +
              '<span class="hover-note-box">...plus the 7-12 minutes it takes to actually ' +
              'start after it says it&rsquo;s gonna start</span>' +
            '</span>.';
        }
      } else if (minsToPuckDrop <= 0) {
        pregameOverrides = { headline: 'Any minute now.' };
      }
    }
    return { stateName: 'pregame', overrides: pregameOverrides, gameObj: nyiGame };
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
        return { stateName: 'shutout_win', gameObj: nyiGame, overrides: {
          headline:      cap2 ? 'Hey ' + cap2 + '...' : 'Hey...',
          aboveHeadline: getResponseText(config, 'shutout_win_above'),
        } };
      }
      // Big bold line under the GIF (win and OT win)
      var BIG_SUB = 'font-size:28pt;font-weight:bold;opacity:1;margin:16px 0 30px 0;';
      var lastPeriod = (nyiGame.gameOutcome || {}).lastPeriodType;
      if (lastPeriod === 'SO') {
        return { stateName: 'shootout_win', gameObj: nyiGame, overrides: {
          headline:         getResponseText(config, 'postgame_shootout_win'),
          subHeadline:      getResponseText(config, 'postgame_shootout_win_sub'),
          subHeadlineStyle: 'font-size:14pt;',
        } };
      }
      if (lastPeriod === 'OT') {
        // The dagger line only shows once the scorer's name is in the data
        var scorer = otWinnerLastName(nyiGame);
        return { stateName: 'ot_win', gameObj: nyiGame, overrides: Object.assign({
          headline:         getResponseText(config, 'postgame_ot_win'),
          subHeadline:      scorer ? getResponseText(config, 'postgame_ot_win_sub', { scorer: scorer.toUpperCase() }) : null,
          subHeadlineStyle: BIG_SUB,
        }, rangersWinOverrides(nyiGame, config)) };
      }
      return { stateName: 'win', gameObj: nyiGame, overrides: Object.assign({
        headline:         getResponseText(config, 'postgame_win'),
        subHeadline:      getResponseText(config, 'postgame_win_sub'),
        subHeadlineStyle: BIG_SUB,
      }, rangersWinOverrides(nyiGame, config)) };
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
  'sorover':  ['win', 'ot_win', 'shootout_win', 'loss', 'pregame', 'live'],
  'clinched': ['win', 'ot_win', 'shootout_win', 'loss'],
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
  // clinchIndicator is stale ("e" all summer if NYI missed the playoffs). Left
  // in, it would override real preseason/early-season game states with
  // Sorover/Clinched. The row's own seasonId says which season it's from, so a
  // row from last season is dropped quietly — that's expected every September
  // (same check as playoffs.js).
  if (!data.isMock && clinchMood && String(nyi.seasonId) !== getSelectedSeason()) {
    clinchMood = null;
  }

  // Backstop: a clinch mood from this season's standings showing up in a month
  // it shouldn't (see config.stateMonthGates) means something unexpected.
  if (!data.isMock && clinchMood && !isMonthAllowedForState(config, clinchMood, new Date())) {
    console.warn('[state] Ignoring "' + clinchMood + '" clinch mood — current month is ' +
      'outside its expected window (config.stateMonthGates). Check state-detection logic.');
    clinchMood = null;
  }

  const clinchOverrides = clinchMood ? CLINCH_STATE_OVERRIDES[clinchMood] : null;

  var gameInfo = await getRegularSeasonState(data);

  // States without a game object never fill the scoreboard spot, so clear
  // anything an earlier refresh left there (e.g. a pregame preview for a game
  // that has since been postponed).
  if (!gameInfo || !gameInfo.gameObj) {
    var liveScoreboard = document.getElementById('live-scoreboard');
    if (liveScoreboard) liveScoreboard.innerHTML = '';
  }

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
    if (clinchMood) { showGameSection('Previous game:'); fetchAndRenderGameCards(); }
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

  // Pregame preview is built from the schedule object alone, so it renders for
  // dev mocks too. Live and final games need the boxscore fetch (skip mock
  // objects which have no id).
  if (gameInfo.stateName === 'pregame' && typeof renderPregame === 'function') {
    renderPregame(gameInfo.gameObj);
  } else if (gameInfo.gameObj && gameInfo.gameObj.id && typeof renderLiveGame === 'function') {
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
    fetchAndRenderGameCards();
  } else {
    clearGameSection();
  }

  return gameInfo.stateName;
}

// --- State detection (real API or mock data) ---

// Fills the game section's cards from the season schedule: the last finished
// NYI game, and the next one (folded away until the headline's day link is
// clicked). The next game is the first one whose start time is still ahead —
// not just the first FUT game, in case the cached schedule is behind — with
// postponed and cancelled games skipped. No next game (end of season) = no card.
function fetchAndRenderGameCards() {
  getSeasonSchedule()
    .then(function (games) {
      var nyiGames = games.filter(isNYIGame);
      var now      = new Date();

      var completed = nyiGames.filter(function (g) {
        return g.gameState === 'OFF' || g.gameState === 'FINAL';
      });
      var lastGame = completed[completed.length - 1] || null;
      renderPreviousGameScore(lastGame, lastGame ? getNYIGameNumber(lastGame.id, games) : null);

      var nextGame = nyiGames.find(function (g) {
        return g.gameState !== 'OFF' && g.gameState !== 'FINAL' &&
               g.gameScheduleState !== 'PPD' && g.gameScheduleState !== 'CNCL' &&
               g.startTimeUTC && new Date(g.startTimeUTC) > now;
      }) || null;
      renderNextGameCard(nextGame, nextGame ? getNYIGameNumber(nextGame.id, games) : null);
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

    // Keep re-checking while a game is on or coming up today. Pregame polls
    // more slowly — it only needs to catch puck drop, and the page may sit on
    // it for hours.
    if (renderedState === 'live' && !mockData) {
      _liveRefreshTimer = setInterval(detectAndRenderState, 30000);
    } else if (renderedState === 'pregame' && !mockData) {
      _liveRefreshTimer = setInterval(detectAndRenderState, 60000);
    }

  } catch (err) {
    console.error('State detection failed:', err);
    renderMoodState('sorover');
  }
}
