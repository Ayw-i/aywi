// Schaefer player page — two mock Wikipedia categories, by season:
//
// "Category:Sons of Schaefer" — every goalie Schaefer has made his son.
// A goalie makes the list for a game where (see qualifies() below):
//   a. Schaefer scored the OT winner on him
//   b. NYI won by fewer goals than Schaefer scored
//   c. NYI won by no more goals than Schaefer scored, and he had an assist
//   d. Schaefer had a hat trick
//   e. Schaefer had 4+ goals (already covered by d)
// Empty-net goals don't count — there's no goalie to be anyone's son.
//
// "Category:Brothers of Schaefer" — every Isles player with a goal Schaefer
// assisted on, one line per player per season. Empty-netters count here:
// the assist is on the scoresheet either way.
//
// API calls: one game log per season/game type he's played, then one
// play-by-play per game that might make the Sons list, and one game summary
// (landing — ~12KB, vs ~128KB for play-by-play) per other game he had an
// assist in. The play-by-play has the assist details too, so those games
// don't need a summary as well.

var SCHAEFER_ID = 8485366;

function fetchJSON(path) {
  return fetch(WORKER + path).then(function (r) {
    if (!r.ok) throw new Error(path + ' returned ' + r.status);
    return r.json();
  });
}

// Could this game make the list? Checked on the game log alone, before
// spending a play-by-play fetch on it. Deliberately loose: the game log
// counts empty-net goals and has no final score, so a game that passes here
// can still fail qualifies() once the play-by-play is in.
function isCandidate(g) {
  return g.otGoals > 0 || g.goals >= 2 || (g.goals >= 1 && g.assists >= 1);
}

// Boils a game's play-by-play down to what the criteria need.
function summarizeGame(pbp) {
  var nyiHome = pbp.homeTeam.abbrev === 'NYI';
  var nyi = nyiHome ? pbp.homeTeam : pbp.awayTeam;
  var opp = nyiHome ? pbp.awayTeam : pbp.homeTeam;

  var goals     = 0;
  var assists   = 0;
  var otWinner  = false;
  var goalieIds = [];   // goalies he scored on, in the order he beat them

  pbp.plays.forEach(function (p) {
    if (p.typeDescKey !== 'goal') return;
    // Shootout "goals" aren't goals (or assists)
    if (p.periodDescriptor.periodType === 'SO') return;
    var d = p.details || {};

    if (d.assist1PlayerId === SCHAEFER_ID || d.assist2PlayerId === SCHAEFER_ID) assists++;

    if (d.scoringPlayerId !== SCHAEFER_ID) return;
    if (!d.goalieInNetId) return;   // empty net: doesn't count
    goals++;
    // OT is sudden death (regular season and playoffs), so any OT goal is the winner
    if (p.periodDescriptor.periodType === 'OT') otWinner = true;
    if (goalieIds.indexOf(d.goalieInNetId) === -1) goalieIds.push(d.goalieInNetId);
  });

  return {
    goals:     goals,
    assists:   assists,
    otWinner:  otWinner,
    goalieIds: goalieIds,
    nyiScore:  nyi.score,
    oppScore:  opp.score,
    margin:    nyi.score - opp.score,
    lastPeriodType: (pbp.gameOutcome && pbp.gameOutcome.lastPeriodType) || 'REG',
  };
}

function qualifies(s) {
  var won = s.margin > 0;
  return s.otWinner ||                                      // a
    (won && s.margin < s.goals) ||                          // b
    (won && s.margin <= s.goals && s.assists >= 1) ||       // c
    s.goals >= 3;                                           // d (and e)
}

// "4–3 OTW", "3–2 W", "2–5 L" — NYI's score first, en dash like Wikipedia
function formatResult(s) {
  var prefix = s.lastPeriodType === 'OT' ? 'OT' : s.lastPeriodType === 'SO' ? 'SO' : '';
  return s.nyiScore + '&ndash;' + s.oppScore + ' ' + prefix + (s.margin > 0 ? 'W' : 'L');
}

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// The italic second line of an entry: "TOR @ NYI (January 3, 2026)", linked
// to the box score. game is a play-by-play or a landing.
function formatGameLink(game) {
  var parts = game.gameDate.split('-');   // "2026-01-03"
  var date  = MONTH_NAMES[Number(parts[1]) - 1] + ' ' + Number(parts[2]) + ', ' + parts[0];
  return '<a href="game.html?id=' + game.id + '">' +
    game.awayTeam.abbrev + ' @ ' + game.homeTeam.abbrev + ' (' + date + ')</a>';
}

function getPlayerName(pbp, playerId) {
  for (var i = 0; i < pbp.rosterSpots.length; i++) {
    var r = pbp.rosterSpots[i];
    if (r.playerId === playerId) return r.firstName.default + ' ' + r.lastName.default;
  }
  return 'Unknown player';
}

// One list item per goalie he scored on in a qualifying game
function buildEntries(pbp, s) {
  // "(Playoffs, OT winner, 2G 0A, 4–3 OTW)"
  var details = [];
  if (pbp.gameType === 3) details.push('Playoffs');
  if (s.otWinner) details.push('OT winner');
  details.push(s.goals + 'G ' + s.assists + 'A');
  details.push(formatResult(s));

  return s.goalieIds.map(function (goalieId) {
    return '<li>' + getPlayerName(pbp, goalieId) + ' (' + details.join(', ') + ')<br>' +
      '<i>See ' + formatGameLink(pbp) + '.</i></li>';
  }).join('');
}

// --- Brothers ---

// Goals Schaefer assisted on in one game, from its play-by-play:
// [{ id, name }] for each scorer, one entry per goal
function assistedGoalsFromPbp(pbp) {
  var goals = [];
  pbp.plays.forEach(function (p) {
    if (p.typeDescKey !== 'goal') return;
    if (p.periodDescriptor.periodType === 'SO') return;
    var d = p.details || {};
    if (d.assist1PlayerId !== SCHAEFER_ID && d.assist2PlayerId !== SCHAEFER_ID) return;
    goals.push({ id: d.scoringPlayerId, name: getPlayerName(pbp, d.scoringPlayerId) });
  });
  return goals;
}

// Same thing from a game summary (landing)
function assistedGoalsFromLanding(landing) {
  var goals = [];
  ((landing.summary && landing.summary.scoring) || []).forEach(function (period) {
    // The shootout winner is listed as a goal in an "SO" period — not a real goal
    if (period.periodDescriptor.periodType === 'SO') return;
    period.goals.forEach(function (g) {
      var assisted = (g.assists || []).some(function (a) { return a.playerId === SCHAEFER_ID; });
      if (!assisted) return;
      goals.push({ id: g.playerId, name: g.firstName.default + ' ' + g.lastName.default });
    });
  });
  return goals;
}

// Adds one game's assisted goals to the season's per-player tally.
// game is a play-by-play or a landing — both have id/season/gameDate/teams.
function tallyBrothers(brothersBySeason, game, goals) {
  if (!brothersBySeason[game.season]) brothersBySeason[game.season] = {};
  var tally = brothersBySeason[game.season];
  goals.forEach(function (g) {
    if (!tally[g.id]) tally[g.id] = { name: g.name, goals: 0, lastGame: null };
    tally[g.id].goals++;
    if (!tally[g.id].lastGame || game.gameDate > tally[g.id].lastGame.gameDate) {
      tally[g.id].lastGame = game;
    }
  });
}

function buildBrotherEntry(b) {
  // "Bo Horvat (11 goals)" / "Most recent: DAL @ NYI (March 26, 2026)."
  // The count covers regular season and playoffs together.
  var count = b.goals + (b.goals === 1 ? ' goal' : ' goals');
  // One-goal players are hidden by CSS until "Show one-goal players" is ticked
  return '<li' + (b.goals === 1 ? ' class="one-goal"' : '') + '>' + b.name + ' (' + count + ')<br>' +
    '<i>Most recent: ' + formatGameLink(b.lastGame) + '.</i></li>';
}

// --- Rendering ---

// "20252026" -> "2025–26 season", the way Wikipedia writes it
function formatSeasonHeading(season) {
  return String(season).slice(0, 4) + '&ndash;' + String(season).slice(6) + ' season';
}

// One h2 per season; itemsHtml(season) returns that season's <li>s, or '' if none
function renderSeasons(elId, seasons, itemsHtml) {
  var html = '';
  seasons.forEach(function (season) {
    var items = itemsHtml(season);
    html += '<h2>' + formatSeasonHeading(season) + '</h2>';
    html += items
      ? '<ul>' + items + '</ul>'
      : '<p class="wiki-empty">This category currently contains no pages or media.</p>';
  });
  document.getElementById(elId).innerHTML = html;
}

function isFinal(game) {
  return game.gameState === 'OFF' || game.gameState === 'FINAL';
}

async function loadSchaeferPage() {
  try {
    // The "now" log comes back with playerStatsSeasons: every season and
    // game type he's played, so we only ask for logs that have games in them.
    var nowLog = await fetchJSON('/v1/player/' + SCHAEFER_ID + '/game-log/now');
    var played = nowLog.playerStatsSeasons || [];

    var logPromises = [];
    played.forEach(function (ps) {
      ps.gameTypes.forEach(function (type) {
        if (type !== 2 && type !== 3) return;
        if (ps.season === nowLog.seasonId && type === nowLog.gameTypeId) {
          logPromises.push(Promise.resolve(nowLog));   // already have this one
        } else {
          logPromises.push(fetchJSON('/v1/player/' + SCHAEFER_ID + '/game-log/' + ps.season + '/' + type));
        }
      });
    });
    var logs = await Promise.all(logPromises);

    // Sons candidates get the play-by-play; the rest of his assist games
    // only need the smaller summary
    var candidateIds = [];
    var assistOnlyIds = [];
    logs.forEach(function (log) {
      (log.gameLog || []).forEach(function (g) {
        if (isCandidate(g)) candidateIds.push(g.gameId);
        else if (g.assists >= 1) assistOnlyIds.push(g.gameId);
      });
    });

    var fetched = await Promise.all([
      Promise.all(candidateIds.map(function (id) {
        return fetchJSON('/v1/gamecenter/' + id + '/play-by-play');
      })),
      Promise.all(assistOnlyIds.map(function (id) {
        return fetchJSON('/v1/gamecenter/' + id + '/landing');
      })),
    ]);
    var pbps     = fetched[0];
    var landings = fetched[1];

    // A game still in progress doesn't count yet
    var gamesBySeason    = {};   // season -> [{ pbp, summary }] (Sons)
    var brothersBySeason = {};   // season -> { playerId: { name, goals, lastGame } }
    pbps.forEach(function (pbp) {
      if (!isFinal(pbp)) return;
      tallyBrothers(brothersBySeason, pbp, assistedGoalsFromPbp(pbp));
      var summary = summarizeGame(pbp);
      if (!qualifies(summary)) return;
      if (!gamesBySeason[pbp.season]) gamesBySeason[pbp.season] = [];
      gamesBySeason[pbp.season].push({ pbp: pbp, summary: summary });
    });
    landings.forEach(function (landing) {
      if (!isFinal(landing)) return;
      tallyBrothers(brothersBySeason, landing, assistedGoalsFromLanding(landing));
    });

    // Newest game first within each season
    Object.keys(gamesBySeason).forEach(function (season) {
      gamesBySeason[season].sort(function (a, b) {
        return a.pbp.gameDate < b.pbp.gameDate ? 1 : a.pbp.gameDate > b.pbp.gameDate ? -1 : 0;
      });
    });

    // Every season from the current one back to his first, newest first —
    // the current season shows up (empty) before he's played in it
    var firstSeason = Number(getSelectedSeason());
    played.forEach(function (ps) { if (ps.season < firstSeason) firstSeason = ps.season; });
    var seasons = [];
    for (var start = Number(getSelectedSeason().slice(0, 4)); start >= Math.floor(firstSeason / 10000); start--) {
      seasons.push(start * 10000 + start + 1);
    }

    renderSeasons('sons-list', seasons, function (season) {
      return (gamesBySeason[season] || []).map(function (g) {
        return buildEntries(g.pbp, g.summary);
      }).join('');
    });

    // Most goals first; ties go to whoever he set up most recently
    renderSeasons('brothers-list', seasons, function (season) {
      var tally = brothersBySeason[season] || {};
      var brothers = Object.keys(tally).map(function (id) { return tally[id]; });
      brothers.sort(function (a, b) {
        if (b.goals !== a.goals) return b.goals - a.goals;
        return a.lastGame.gameDate < b.lastGame.gameDate ? 1 : -1;
      });
      var html = brothers.map(buildBrotherEntry).join('');

      // While they're hidden, say how many — otherwise a season of only
      // one-goal players would look empty
      var singles = brothers.filter(function (b) { return b.goals === 1; }).length;
      if (singles) {
        html += '<li class="singles-note">' + singles +
          (singles === 1 ? ' player' : ' players') + ' with one goal hidden.</li>';
      }
      return html;
    });
  } catch (e) {
    console.error('Schaefer page failed:', e);
    document.getElementById('sons-list').innerHTML = '<p>Failed to load data.</p>';
    document.getElementById('brothers-list').innerHTML = '<p>Failed to load data.</p>';
  }
}

// Also run once at load: on a reload the browser may keep the box ticked
function applyShowSingles() {
  var checked = document.getElementById('show-singles').checked;
  document.getElementById('brothers-list').className = checked ? 'show-singles' : '';
}
document.getElementById('show-singles').addEventListener('change', applyShowSingles);
applyShowSingles();

loadSchaeferPage();
