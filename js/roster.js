function makeSortable(table) {
  const headers = table.querySelectorAll('thead th');
  headers.forEach(function (th, colIndex) {
    th.innerHTML =
      '<span class="col-label">' + th.textContent + '</span>' +
      '<span class="sort-ind"></span>';
    th.style.cursor     = 'pointer';
    th.style.whiteSpace = 'nowrap';

    th.addEventListener('click', function () {
      const tbody = table.querySelector('tbody');
      const rows  = Array.from(tbody.querySelectorAll('tr'));
      const dir   = th.dataset.dir === 'desc' ? 'asc' : 'desc';

      headers.forEach(function (h) {
        h.dataset.dir = '';
        h.querySelector('.sort-ind').textContent = '';
      });

      th.dataset.dir = dir;
      th.querySelector('.sort-ind').textContent = dir === 'asc' ? '▲' : '▼';

      rows.sort(function (a, b) {
        const aVal = a.cells[colIndex].textContent.trim();
        const bVal = b.cells[colIndex].textContent.trim();
        const aNum = parseFloat(aVal.replace('+', ''));
        const bNum = parseFloat(bVal.replace('+', ''));
        const result = (!isNaN(aNum) && !isNaN(bNum))
          ? aNum - bNum
          : aVal.localeCompare(bVal);
        return dir === 'asc' ? result : -result;
      });

      rows.forEach(function (row) { tbody.appendChild(row); });
    });
  });
}

function renderSkaterTable(tbodyId, players) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  players.forEach(function (p) {
    const row = document.createElement('tr');
    row.innerHTML =
      '<td>' + p.firstName.default + ' ' + p.lastName.default + '</td>' +
      '<td>' + p.gamesPlayed + '</td>' +
      '<td>' + p.goals + '</td>' +
      '<td>' + p.assists + '</td>' +
      '<td>' + p.points + '</td>' +
      '<td>' + formatPlusMinus(p.plusMinus) + '</td>';
    tbody.appendChild(row);
  });
}

function renderGoalieTable(goalies) {
  const tbody = document.getElementById('goalies-tbody');
  tbody.innerHTML = '';
  goalies.forEach(function (g) {
    const row = document.createElement('tr');
    row.innerHTML =
      '<td>' + g.firstName.default + ' ' + g.lastName.default + '</td>' +
      '<td>' + g.gamesPlayed + '</td>' +
      '<td>' + g.wins + '</td>' +
      '<td>' + g.losses + '</td>' +
      '<td>' + formatGAA(g.goalsAgainstAverage) + '</td>' +
      '<td>' + formatSVP(g.savePercentage) + '</td>';
    tbody.appendChild(row);
  });
}

async function loadRosterStats() {
  try {
    const res  = await fetch(WORKER + '/v1/club-stats/NYI/20252026/2');
    const data = await res.json();

    const forwards   = data.skaters
      .filter(function (p) { return ['C', 'L', 'R'].includes(p.positionCode); })
      .sort(function (a, b) { return b.points - a.points; });

    const defensemen = data.skaters
      .filter(function (p) { return p.positionCode === 'D'; })
      .sort(function (a, b) { return b.points - a.points; });

    const goalies    = data.goalies
      .sort(function (a, b) { return b.wins - a.wins; });

    renderSkaterTable('forwards-tbody',   forwards);
    renderSkaterTable('defensemen-tbody', defensemen);
    renderGoalieTable(goalies);

    ['forwards-tbody', 'defensemen-tbody', 'goalies-tbody'].forEach(function (id) {
      makeSortable(document.getElementById(id).closest('table'));
    });

    document.getElementById('footer').textContent =
      'Last updated: ' + new Date().toLocaleString();

  } catch (err) {
    console.error('Failed to load roster stats:', err);
    ['forwards-tbody', 'defensemen-tbody', 'goalies-tbody'].forEach(function (id) {
      document.getElementById(id).innerHTML =
        '<tr><td colspan="6">Could not load data.</td></tr>';
    });
  }
}
