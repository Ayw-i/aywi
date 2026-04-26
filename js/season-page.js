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

// --- Goalie fatigue ---

function goalieColor(shortLoad, longLoad, isB2B) {
  var shortHeavy = isB2B || shortLoad >= 4;  // B2B or 4 starts in 5 days
  var longHeavy  = longLoad >= 18;           // 18 starts in 30 days (~every 1.7 days)
  if (shortHeavy && longHeavy) return '#AA1111';
  if (shortHeavy)              return '#CC4400';
  if (longHeavy)               return '#CC8800';
  return '';
}

function fetchGoalieMap() {
  var now       = new Date();
  var startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  var season    = startYear + '' + (startYear + 1);

  return fetch(WORKER + '/v1/roster/NYI/' + season)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var goalies = d.goalies || [];
      return Promise.all(goalies.map(function (g) {
        return fetch(WORKER + '/v1/player/' + g.id + '/game-log/' + season + '/2')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            return { lastName: g.lastName.default, log: d.gameLog || [] };
          });
      }));
    })
    .then(function (goalieData) {
      // Collect all NYI starts sorted by date
      var allStarts = [];
      goalieData.forEach(function (goalie) {
        goalie.log.forEach(function (entry) {
          if (entry.teamAbbrev !== 'NYI' || !entry.gamesStarted) return;
          allStarts.push({ gameId: entry.gameId, date: entry.gameDate, lastName: goalie.lastName });
        });
      });
      allStarts.sort(function (a, b) { return a.date < b.date ? -1 : 1; });

      // For each start compute rolling windows and B2B
      var map = {};
      allStarts.forEach(function (start, idx) {
        var d    = new Date(start.date + 'T12:00:00');
        var d5   = new Date(d.getTime() - 4 * 86400000);
        var d30  = new Date(d.getTime() - 29 * 86400000);
        var prev = new Date(d.getTime() - 86400000);
        var prevStr = prev.getFullYear() + '-' +
          String(prev.getMonth() + 1).padStart(2, '0') + '-' +
          String(prev.getDate()).padStart(2, '0');

        var shortLoad = 0, longLoad = 0, isB2B = false;
        allStarts.forEach(function (s) {
          if (s.lastName !== start.lastName) return;
          var sd = new Date(s.date + 'T12:00:00');
          if (sd >= d5 && sd <= d) shortLoad++;
          if (sd >= d30 && sd <= d) longLoad++;
          if (s.date === prevStr) isB2B = true;
        });

        map[start.gameId] = {
          lastName:  start.lastName,
          shortLoad: shortLoad,
          longLoad:  longLoad,
          isB2B:     isB2B,
        };
      });

      return map;
    });
}

// --- Render ---

function renderSeasonTable(games, goalieMap) {
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
    '<th ' + TH + '>Goalie</th>' +
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

    var dc        = dateColor(regGames, i);
    var dateStyle = dc ? 'color:' + dc + ';' : '';
    var time      = formatGameTime(g.startTimeUTC, g.easternUTCOffset);
    var dateCell  = formatSeasonDate(g.gameDate) +
      '<br><span style="font-size:8pt;opacity:0.6;">' + time + '</span>';

    var prefix  = isHome ? 'vs ' : '@ ';
    var oppCell = prefix + logoImg(opp.abbrev) + opp.abbrev;
    var rowBg   = i % 2 === 1 ? 'background-color:#0d0d0d;' : '';

    var goalieData  = goalieMap ? (goalieMap[g.id] || null) : null;
    var goalieText  = goalieData ? goalieData.lastName : '';
    var goalieClr   = goalieData ? goalieColor(goalieData.shortLoad, goalieData.longLoad, goalieData.isB2B) : '';
    var goalieStyle = goalieClr ? 'color:' + goalieClr + ';' : 'color:#888;';

    var TD = 'style="padding:3px 8px;font-size:10pt;';
    rows += '<tr style="' + rowBg + '">' +
      '<td style="padding:3px 6px;text-align:right;font-size:9pt;color:#444;">' + (i + 1) + '</td>' +
      '<td ' + TD + dateStyle + '">' + dateCell + '</td>' +
      '<td ' + TD + '">' + oppCell + '</td>' +
      '<td ' + TD + 'font-weight:bold;color:' + resultColor + ';">' + resultText + '</td>' +
      '<td ' + TD + '">' + scoreText + '</td>' +
      '<td ' + TD + 'font-size:9pt;color:#666;">' + otTag + '</td>' +
      '<td ' + TD + 'font-size:9pt;color:#888;">' + recordText + '</td>' +
      '<td ' + TD + 'font-size:9pt;' + goalieStyle + '">' + goalieText + '</td>' +
      '</tr>';
  }

  return '<h2 style="font-size:11pt;margin:0 0 12px 0;">' + heading + '</h2>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<thead>' + header + '</thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>';
}

Promise.all([getSeasonSchedule(), fetchGoalieMap()])
  .then(function (results) {
    var el = document.getElementById('season-table');
    el.style.opacity = '';
    el.style.fontSize = '';
    el.innerHTML = renderSeasonTable(results[0], results[1]);
  })
  .catch(function () {
    document.getElementById('season-table').innerHTML =
      '<p style="opacity:0.5;font-size:10pt;">Failed to load schedule.</p>';
  });
