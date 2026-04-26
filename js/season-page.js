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
  if (isBackToBack(games, index))           return '#CC3333';
  if (getEasternHour(g.startTimeUTC, g.easternUTCOffset) < 17) return '#FFD700';
  if (isWeekendDate(g.gameDate))            return '#E8DCC8';
  return '';
}

function logoImg(abbrev) {
  return '<img src="https://assets.nhle.com/logos/nhl/svg/' + abbrev + '_light.svg"' +
    ' width="18" style="vertical-align:middle;margin-right:4px;"' +
    ' onerror="this.style.display=\'none\'">';
}

function renderSeasonTable(games) {
  var regGames = games.filter(function (g) { return g.gameType === 2; });
  if (!regGames.length) return '<p style="opacity:0.5;font-size:10pt;">No regular season games found.</p>';

  var season    = regGames[0].season;
  var startYear = Math.floor(season / 10000);
  var heading   = startYear + '–' + String(startYear + 1).slice(2) + ' REGULAR SEASON';

  var W = 0, L = 0, OTL = 0;

  var TH = 'style="padding:4px 8px;font-size:9pt;color:#666;text-align:left;border-bottom:1px solid #333;"';
  var header = '<tr>' +
    '<th ' + TH + ' style="padding:4px 6px;text-align:right;font-size:9pt;color:#666;border-bottom:1px solid #333;">#</th>' +
    '<th ' + TH + '>Date</th>' +
    '<th ' + TH + '>Opponent</th>' +
    '<th ' + TH + '>Result</th>' +
    '<th ' + TH + '>Score</th>' +
    '<th ' + TH + '></th>' +
    '<th ' + TH + '>Record</th>' +
    '</tr>';

  var rows = '';
  for (var i = 0; i < regGames.length; i++) {
    var g = regGames[i];
    var isHome   = g.homeTeam.abbrev === 'NYI';
    var nyi      = isHome ? g.homeTeam : g.awayTeam;
    var opp      = isHome ? g.awayTeam : g.homeTeam;
    var isPlayed = g.gameState === 'OFF' || g.gameState === 'FINAL';
    var isLive   = g.gameState === 'LIVE' || g.gameState === 'CRIT';

    var resultText = '', resultColor = '', scoreText = '', otTag = '', recordText = '';

    if (isPlayed) {
      var lastPeriod = (g.gameOutcome || {}).lastPeriodType || 'REG';
      var won = nyi.score > opp.score;
      var isOT = lastPeriod === 'OT';
      var isSO = lastPeriod === 'SO';

      if (won) {
        W++;
        resultText  = 'W';
        resultColor = '#4A90D9';
      } else if (isSO) {
        OTL++;
        resultText  = 'SOL';
        resultColor = '#777777';
      } else if (isOT) {
        OTL++;
        resultText  = 'OTL';
        resultColor = '#999999';
      } else {
        L++;
        resultText  = 'L';
        resultColor = '#CC3333';
      }

      scoreText  = nyi.score + '–' + opp.score;
      if (isOT) otTag = 'OT';
      if (isSO) otTag = 'SO';
      recordText = W + '–' + L + '–' + OTL;

    } else if (isLive) {
      resultText  = 'LIVE';
      resultColor = '#FFD700';
      scoreText   = nyi.score + '–' + opp.score;
    } else {
      resultText  = formatGameTime(g.startTimeUTC, g.easternUTCOffset);
      resultColor = '#555555';
    }

    var dc      = dateColor(regGames, i);
    var dateStyle = dc ? 'color:' + dc + ';' : '';
    var time    = formatGameTime(g.startTimeUTC, g.easternUTCOffset);
    var dateCell = formatSeasonDate(g.gameDate) +
      '<br><span style="font-size:8pt;opacity:0.6;">' + time + '</span>';

    var prefix  = isHome ? 'vs ' : '@ ';
    var oppCell = prefix + logoImg(opp.abbrev) + opp.abbrev;
    var rowBg   = i % 2 === 1 ? 'background-color:#0d0d0d;' : '';

    var TD = 'style="padding:3px 8px;font-size:10pt;';
    rows += '<tr style="' + rowBg + '">' +
      '<td style="padding:3px 6px;text-align:right;font-size:9pt;color:#444;">' + (i + 1) + '</td>' +
      '<td ' + TD + dateStyle + '">' + dateCell + '</td>' +
      '<td ' + TD + '">' + oppCell + '</td>' +
      '<td ' + TD + 'font-weight:bold;color:' + resultColor + ';">' + resultText + '</td>' +
      '<td ' + TD + '">' + scoreText + '</td>' +
      '<td ' + TD + 'font-size:9pt;color:#666;">' + otTag + '</td>' +
      '<td ' + TD + 'font-size:9pt;color:#888;">' + recordText + '</td>' +
      '</tr>';
  }

  return '<h2 style="font-size:11pt;margin:0 0 12px 0;">' + heading + '</h2>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<thead>' + header + '</thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>';
}

getSeasonSchedule()
  .then(function (games) {
    document.getElementById('season-table').innerHTML = renderSeasonTable(games);
  })
  .catch(function () {
    document.getElementById('season-table').innerHTML =
      '<p style="opacity:0.5;font-size:10pt;">Failed to load schedule.</p>';
  });
