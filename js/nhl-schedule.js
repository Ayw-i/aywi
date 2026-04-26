const WORKER = 'https://nhl-proxy.aywi.workers.dev';

// --- Season schedule cache ---

var _seasonScheduleCache = null;

function getSeasonSchedule() {
  if (_seasonScheduleCache) return Promise.resolve(_seasonScheduleCache);
  var now = new Date();
  var startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  var seasonStr = startYear + '' + (startYear + 1);
  return fetch(WORKER + '/v1/club-schedule-season/NYI/' + seasonStr)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      _seasonScheduleCache = d.games || [];
      return _seasonScheduleCache;
    });
}

function getNYIGameNumber(gameId, games) {
  var num = 0;
  for (var i = 0; i < games.length; i++) {
    if (games[i].gameType !== 2) continue;
    num++;
    if (games[i].id == gameId) return num;
  }
  return null;
}
