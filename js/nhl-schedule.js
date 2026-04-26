const WORKER = 'https://nhl-proxy.aywi.workers.dev';

// --- Season selection ---

function getSelectedSeason() {
  var params = new URLSearchParams(window.location.search);
  var s = params.get('season');
  if (s && /^\d{8}$/.test(s)) return s;
  var now = new Date();
  var startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return startYear + '' + (startYear + 1);
}

function renderSeasonPicker() {
  var selected = getSelectedSeason();
  var now = new Date();
  var currentStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  var html = '<span style="font-size:10pt;color:#888;">Season: </span>' +
    '<select onchange="var p=new URLSearchParams(window.location.search);p.set(\'season\',this.value);window.location.search=p.toString();" ' +
    'style="background:#111;color:white;border:1px solid #444;font-family:Helvetica,Arial,sans-serif;font-size:10pt;padding:2px 6px;">';
  for (var y = currentStart; y >= 2010; y--) {
    var val = y + '' + (y + 1);
    var label = y + '–' + String(y + 1).slice(2);
    html += '<option value="' + val + '"' + (val === selected ? ' selected' : '') + '>' + label + '</option>';
  }
  html += '</select>';
  return html;
}

// --- Season schedule cache ---

var _seasonScheduleCache = null;

function getSeasonSchedule() {
  if (_seasonScheduleCache) return Promise.resolve(_seasonScheduleCache);
  var seasonStr = getSelectedSeason();
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
