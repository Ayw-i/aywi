var CAL_COLORS = {
  homeWin:      '#0047AB',
  awayWin:      '#CC5500',
  homeLoss:     '#000B20',
  awayLoss:     '#200800',
  homeUnplayed: '#0A1530',
  awayUnplayed: '#1E0A00',
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function cellColor(isHome, isPlayed, won) {
  if (!isPlayed) return isHome ? CAL_COLORS.homeUnplayed : CAL_COLORS.awayUnplayed;
  if (won)       return isHome ? CAL_COLORS.homeWin      : CAL_COLORS.awayWin;
  return                 isHome ? CAL_COLORS.homeLoss     : CAL_COLORS.awayLoss;
}

function renderCalMonth(year, month, gamesByDate, todayStr) {
  var MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
  var DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var firstDow    = new Date(year, month, 1).getDay();

  var dayHeaders = '<tr>';
  for (var d = 0; d < 7; d++) {
    dayHeaders += '<th style="padding:4px 2px;font-size:8pt;color:#555;text-align:center;' +
      'border:1px solid #1a1a1a;font-weight:normal;">' + DAY_NAMES[d] + '</th>';
  }
  dayHeaders += '</tr>';

  var rows = '';
  var col  = firstDow;
  var row  = '<tr>';

  // Empty cells before the 1st
  for (var e = 0; e < firstDow; e++) {
    row += '<td style="border:1px solid #1a1a1a;padding:0;width:14.28%;height:60px;vertical-align:top;"></td>';
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr = year + '-' + pad2(month + 1) + '-' + pad2(day);
    var game    = gamesByDate[dateStr] || null;
    var isToday = dateStr === todayStr;

    var cellStyle = 'border:1px solid #1a1a1a;padding:0;width:14.28%;height:60px;vertical-align:top;';
    if (isToday) cellStyle += 'outline:2px solid #555;outline-offset:-2px;';

    var inner = '';

    if (game) {
      var isHome   = game.homeTeam.abbrev === 'NYI';
      var nyi      = isHome ? game.homeTeam : game.awayTeam;
      var opp      = isHome ? game.awayTeam : game.homeTeam;
      var isPlayed = game.gameState === 'OFF' || game.gameState === 'FINAL';
      var isLive   = game.gameState === 'LIVE' || game.gameState === 'CRIT';
      var won      = isPlayed && nyi.score > opp.score;

      var bg = cellColor(isHome, isPlayed || isLive, won);
      cellStyle += 'background-color:' + bg + ';';

      var prefix = isHome ? '' : '@ ';
      var oppLine = '<div style="font-size:9pt;font-weight:bold;padding:2px 4px 0;">' +
        prefix + opp.abbrev + '</div>';

      var infoLine = '';
      if (isLive) {
        infoLine = '<div style="font-size:8pt;color:#FFD700;padding:1px 4px;">LIVE ' +
          nyi.score + '–' + opp.score + '</div>';
      } else if (isPlayed) {
        var lastPeriod = (game.gameOutcome || {}).lastPeriodType || 'REG';
        var resultChar = won ? 'W' : (lastPeriod === 'OT' ? 'OTL' : lastPeriod === 'SO' ? 'SOL' : 'L');
        var tag        = lastPeriod !== 'REG' ? ' ' + lastPeriod : '';
        infoLine = '<div style="font-size:8pt;padding:1px 4px;">' +
          resultChar + ' ' + nyi.score + '–' + opp.score + tag + '</div>';
      }

      inner = '<div style="font-size:8pt;color:#aaa;text-align:right;padding:2px 4px 0;">' + day + '</div>' +
        oppLine + infoLine;
    } else {
      inner = '<div style="font-size:8pt;color:#333;text-align:right;padding:2px 4px 0;">' + day + '</div>';
    }

    row += '<td style="' + cellStyle + '">' + inner + '</td>';
    col++;

    if (col === 7) {
      row += '</tr>';
      rows += row;
      row = '<tr>';
      col = 0;
    }
  }

  // Pad last row
  if (col > 0) {
    for (var p = col; p < 7; p++) {
      row += '<td style="border:1px solid #1a1a1a;padding:0;width:14.28%;height:60px;"></td>';
    }
    row += '</tr>';
    rows += row;
  }

  return '<div style="margin-bottom:32px;">' +
    '<div style="font-size:11pt;font-weight:bold;margin-bottom:6px;text-transform:uppercase;">' +
      MONTH_NAMES[month] + ' ' + year +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">' +
      '<thead>' + dayHeaders + '</thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';
}

function renderScheduleCalendar(games) {
  var regGames = games.filter(function (g) { return g.gameType === 2; });
  if (!regGames.length) return '<p style="opacity:0.5;font-size:10pt;">No games found.</p>';

  // Index games by date
  var gamesByDate = {};
  regGames.forEach(function (g) { gamesByDate[g.gameDate] = g; });

  // Determine month range
  var dates     = regGames.map(function (g) { return g.gameDate; }).sort();
  var firstDate = new Date(dates[0] + 'T12:00:00');
  var lastDate  = new Date(dates[dates.length - 1] + 'T12:00:00');

  var today    = new Date();
  var todayStr = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());

  var html = '';
  var y = firstDate.getFullYear();
  var m = firstDate.getMonth();

  while (y < lastDate.getFullYear() || (y === lastDate.getFullYear() && m <= lastDate.getMonth())) {
    html += renderCalMonth(y, m, gamesByDate, todayStr);
    m++;
    if (m === 12) { m = 0; y++; }
  }

  return html;
}

getSeasonSchedule()
  .then(function (games) {
    var el = document.getElementById('schedule-cal');
    el.style.opacity = '';
    el.style.fontSize = '';
    el.innerHTML = renderScheduleCalendar(games);
  })
  .catch(function () {
    document.getElementById('schedule-cal').innerHTML =
      '<p style="opacity:0.5;font-size:10pt;">Failed to load schedule.</p>';
  });
