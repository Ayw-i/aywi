// Extended season stats for stats.html.

function statsMakeSortable(table) {
  var headers = table.querySelectorAll('thead th');
  headers.forEach(function (th, colIndex) {
    th.innerHTML =
      '<span>' + th.textContent + '</span>' +
      '<span class="sort-ind"></span>';
    th.style.cursor     = 'pointer';
    th.style.whiteSpace = 'nowrap';

    th.addEventListener('click', function () {
      var tbody = table.querySelector('tbody');
      var rows  = Array.from(tbody.querySelectorAll('tr'));
      var dir   = th.dataset.dir === 'desc' ? 'asc' : 'desc';

      headers.forEach(function (h) {
        h.dataset.dir = '';
        h.querySelector('.sort-ind').textContent = '';
      });

      th.dataset.dir = dir;
      th.querySelector('.sort-ind').textContent = dir === 'asc' ? ' ▲' : ' ▼';

      rows.sort(function (a, b) {
        var aVal = a.cells[colIndex].dataset.sort !== undefined
          ? a.cells[colIndex].dataset.sort
          : a.cells[colIndex].textContent.trim();
        var bVal = b.cells[colIndex].dataset.sort !== undefined
          ? b.cells[colIndex].dataset.sort
          : b.cells[colIndex].textContent.trim();
        var aNum = parseFloat(String(aVal).replace('+', '').replace('%', ''));
        var bNum = parseFloat(String(bVal).replace('+', '').replace('%', ''));
        var result = (!isNaN(aNum) && !isNaN(bNum))
          ? aNum - bNum
          : String(aVal).localeCompare(String(bVal));
        return dir === 'asc' ? result : -result;
      });

      rows.forEach(function (row) { tbody.appendChild(row); });
    });
  });
}

function parseTOIMinutes(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val / 60;
  if (typeof val === 'string' && val.includes(':')) {
    var parts = val.split(':');
    return parseInt(parts[0] || 0) + (parseInt(parts[1] || 0) / 60);
  }
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n / 60;
}

function fmtTOI(val) {
  if (!val) return '—';
  if (typeof val === 'number') {
    var mins = Math.floor(val / 60);
    var secs = Math.round(val % 60);
    return mins + ':' + String(secs).padStart(2, '0');
  }
  return String(val);
}

function fmtShotPct(val) {
  if (val === undefined || val === null) return '—';
  return (val * 100).toFixed(1) + '%';
}

function fmtP60(points, gamesPlayed, avgToi) {
  var toiMin   = parseTOIMinutes(avgToi);
  var totalMin = toiMin * (gamesPlayed || 0);
  if (!totalMin) return null;
  return ((points / totalMin) * 60).toFixed(2);
}

function td(val, sortVal) {
  var attr = (sortVal !== undefined && sortVal !== null)
    ? ' data-sort="' + sortVal + '"'
    : '';
  return '<td' + attr + '>' + (val !== undefined && val !== null ? val : '—') + '</td>';
}

function renderSkaterTable(tbodyId, players) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  players.forEach(function (p) {
    var name  = p.firstName.default + ' ' + p.lastName.default;
    var pim   = p.penaltyMinutes !== undefined ? p.penaltyMinutes : (p.pim !== undefined ? p.pim : '—');
    var ppg   = p.powerPlayGoals !== undefined ? p.powerPlayGoals : '—';
    var shots = p.shots          !== undefined ? p.shots          : '—';
    var toiRaw  = p.avgTimeOnIcePerGame;
    var toiDisp = fmtTOI(toiRaw);
    var toiSort = parseTOIMinutes(toiRaw);

    var sPctRaw  = p.shootingPctg;
    var sPctDisp = sPctRaw !== undefined ? fmtShotPct(sPctRaw) : '—';
    var sPctSort = sPctRaw !== undefined ? (sPctRaw * 100) : -1;

    var p60Raw  = fmtP60(p.points, p.gamesPlayed, toiRaw);
    var p60Disp = p60Raw !== null ? p60Raw : '—';
    var p60Sort = p60Raw !== null ? parseFloat(p60Raw) : -1;

    var row = document.createElement('tr');
    row.innerHTML =
      td(name) +
      td(p.positionCode) +
      td(p.gamesPlayed) +
      td(p.goals) +
      td(p.assists) +
      td(p.points) +
      td(formatPlusMinus(p.plusMinus), p.plusMinus) +
      td(pim) +
      td(ppg) +
      td(shots) +
      td(sPctDisp, sPctSort) +
      td(toiDisp, toiSort) +
      td(p60Disp, p60Sort);
    tbody.appendChild(row);
  });
}

function renderGoalieTable(tbodyId, goalies) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  goalies.forEach(function (g) {
    var name = g.firstName.default + ' ' + g.lastName.default;
    if (g.lastName.default === 'Sorokin') {
      name = '<a href="sorokin.html">' + name + '</a>';
    }
    var otl = g.overtimeLosses !== undefined ? g.overtimeLosses : '—';
    var so  = g.shutouts       !== undefined ? g.shutouts       : '—';
    var sa  = g.shotsAgainst   !== undefined ? g.shotsAgainst   : '—';

    var row = document.createElement('tr');
    row.innerHTML =
      td(name) +
      td(g.gamesPlayed) +
      td(g.wins) +
      td(g.losses) +
      td(otl) +
      td(so) +
      td(formatGAA(g.goalsAgainstAverage)) +
      td(formatSVP(g.savePercentage), g.savePercentage) +
      td(sa);
    tbody.appendChild(row);
  });
}

async function loadStatsPage() {
  try {
    var res  = await fetch(WORKER + '/v1/club-stats/NYI/20252026/2');
    var data = await res.json();

    var forwards = (data.skaters || [])
      .filter(function (p) { return ['C', 'L', 'R'].includes(p.positionCode); })
      .sort(function (a, b) { return b.points - a.points; });

    var defensemen = (data.skaters || [])
      .filter(function (p) { return p.positionCode === 'D'; })
      .sort(function (a, b) { return b.points - a.points; });

    var goalies = (data.goalies || [])
      .sort(function (a, b) { return b.wins - a.wins; });

    renderSkaterTable('forwards-tbody',   forwards);
    renderSkaterTable('defensemen-tbody', defensemen);
    renderGoalieTable('goalies-tbody',    goalies);

    ['forwards-table', 'defensemen-table', 'goalies-table'].forEach(function (id) {
      var t = document.getElementById(id);
      if (t) statsMakeSortable(t);
    });

    document.getElementById('footer').textContent =
      'Last updated: ' + new Date().toLocaleString();

  } catch (err) {
    console.error('Stats page failed:', err);
    ['forwards-tbody', 'defensemen-tbody', 'goalies-tbody'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '<tr><td colspan="13">Could not load data.</td></tr>';
    });
  }
}

loadStatsPage();
