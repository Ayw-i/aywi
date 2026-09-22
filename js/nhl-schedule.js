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

// --- Shared schedule-formatting helpers ---
// (used by season-page.js and state.js's Schedule-Out table)

function formatSeasonDate(dateStr) {
  var d = new Date(dateStr + 'T12:00:00');
  var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
}

function formatGameTime(utcStr, easternOffset) {
  var d = new Date(utcStr);
  var offsetHours = parseInt(easternOffset, 10);
  var local = new Date(d.getTime() + offsetHours * 3600000);
  var hours = local.getUTCHours();
  var mins  = local.getUTCMinutes();
  var ampm  = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return hours + (mins ? ':' + String(mins).padStart(2, '0') : '') + ' ' + ampm;
}

function getEasternHour(utcStr, easternOffset) {
  var d = new Date(utcStr);
  var local = new Date(d.getTime() + parseInt(easternOffset, 10) * 3600000);
  return local.getUTCHours();
}

function isWeekendDate(dateStr) {
  var day = new Date(dateStr + 'T12:00:00').getDay();
  return day === 0 || day === 6;
}

function isBackToBack(games, index) {
  if (index === 0) return false;
  var prev = new Date(games[index - 1].gameDate + 'T12:00:00');
  var curr = new Date(games[index].gameDate + 'T12:00:00');
  return (curr - prev) / 86400000 === 1;
}

function dateColor(games, index) {
  var g = games[index];
  if (isBackToBack(games, index)) return '#CC3333';
  if (getEasternHour(g.startTimeUTC, g.easternUTCOffset) < 17) return '#FFD700';
  if (isWeekendDate(g.gameDate)) return '#E8DCC8';
  return '';
}

function logoImg(abbrev) {
  return '<img src="https://assets.nhle.com/logos/nhl/svg/' + abbrev + '_light.svg"' +
    ' width="18" style="vertical-align:middle;margin-right:4px;"' +
    ' onerror="this.style.display=\'none\'">';
}
