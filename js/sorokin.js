// Sorokin player page — Vezina odds + goalie ranking tables.

var SOROKIN_LAST_NAME = 'Sorokin';

function getGoalieName(g) {
  var first = typeof g.firstName === 'object' ? (g.firstName.default || '') : (g.firstName || '');
  var last  = typeof g.lastName  === 'object' ? (g.lastName.default  || '') : (g.lastName  || '');
  return (first + ' ' + last).trim() || '?';
}

function findSorokinIdx(goalies) {
  for (var i = 0; i < goalies.length; i++) {
    var last = typeof goalies[i].lastName === 'object'
      ? (goalies[i].lastName.default || '')
      : (goalies[i].lastName || '');
    if (last === SOROKIN_LAST_NAME) return i;
  }
  return -1;
}

function getRankStyle(rank) {
  if (rank === 1) return 'background-color:#7a6000;color:#FFD700;font-weight:bold;';
  if (rank === 2) return 'background-color:#505050;color:#E0E0E0;font-weight:bold;';
  if (rank <= 5)  return 'background-color:#1a5c3a;color:#90EE90;font-weight:bold;';
  if (rank <= 10) return 'background-color:#1a3a2a;color:#7dc99b;font-weight:bold;';
  return 'background-color:#3d3228;color:#D2B48C;font-weight:bold;';
}

function getVezinaMoodImage(prob, images) {
  if (!images || !images.length) return null;
  if (prob === null || prob === undefined) return images[images.length - 1].image;
  for (var i = 0; i < images.length; i++) {
    if (prob > images[i].threshold) return images[i].image;
  }
  return images[images.length - 1].image;
}

function buildRankTable(goalies, label, formatVal, sorokinIdx) {
  var total = goalies.length;
  var start, end;

  if (sorokinIdx < 0 || total === 0) {
    start = 0;
    end   = Math.min(5, total);
  } else {
    start = Math.max(0, sorokinIdx - 2);
    end   = start + 5;
    if (end > total) {
      end   = total;
      start = Math.max(0, end - 5);
    }
  }

  var rows = '';
  for (var i = start; i < end; i++) {
    var g     = goalies[i];
    var rank  = i + 1;
    var name  = getGoalieName(g);
    var val   = formatVal(g.value);
    var style = (i === sorokinIdx) ? ' style="' + getRankStyle(rank) + '"' : '';
    rows += '<tr' + style + '><td>' + rank + '</td><td>' + name + '</td><td>' + val + '</td></tr>';
  }

  if (!rows) {
    rows = '<tr><td colspan="3" style="opacity:0.5;">No data</td></tr>';
  }

  return '<table width="100%">' +
    '<thead>' +
      '<tr><th colspan="3">' + label + (sorokinIdx < 0 ? ' (Sorokin not ranked)' : '') + '</th></tr>' +
      '<tr><th style="font-size:8pt;">#</th><th style="font-size:8pt;">Goalie</th><th style="font-size:8pt;">Stat</th></tr>' +
    '</thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>';
}

async function loadSorokinPage() {
  try {
    var config = await getConfig();
    var slug   = config.polymarketVezinaSlug || 'nhl-2025-26-vezina-trophy';

    var polyPromise = fetch(WORKER + '/polymarket/events?slug=' + slug)
      .catch(function () { return null; });

    var nhlPromise = fetch(WORKER + '/v1/goalie-stats-leaders/20252026/2?limit=50');

    var results   = await Promise.all([polyPromise, nhlPromise]);
    var polyRes   = results[0];
    var nhlRes    = results[1];

    // --- Polymarket odds ---
    var sorokinProb = null;
    var marketUrl   = config.polymarketVezinaUrl || ('https://polymarket.com/event/' + slug);

    if (polyRes && polyRes.ok) {
      try {
        var polyData = await polyRes.json();
        var event    = Array.isArray(polyData) ? polyData[0] : polyData;
        var markets  = (event && event.markets) || [];
        var sorokinMarket = markets.find(function (m) {
          return m.groupItemTitle && m.groupItemTitle.indexOf(SOROKIN_LAST_NAME) !== -1;
        });
        if (sorokinMarket && sorokinMarket.outcomePrices) {
          var prices  = JSON.parse(sorokinMarket.outcomePrices);
          sorokinProb = parseFloat(prices[0]);
        }
      } catch (e) {
        console.warn('Polymarket parse error:', e);
      }
    }

    var oddsEl = document.getElementById('vezina-odds');
    if (sorokinProb !== null) {
      var pct = (sorokinProb * 100).toFixed(1) + '%';
      oddsEl.innerHTML =
        'Live Vezina odds: <a href="' + marketUrl + '" target="_blank" style="color:white;">' + pct + '</a>';
    } else {
      oddsEl.textContent = 'Live Vezina odds: N/A';
    }

    // --- Mood image ---
    var imgSrc = getVezinaMoodImage(sorokinProb, config.vezinaMoodImages);
    if (imgSrc) {
      document.getElementById('vezina-image').innerHTML =
        '<img src="' + imgSrc + '" alt="" style="max-height:600px;max-width:80%;display:block;margin:20px auto;">';
    }

    // --- NHL goalie rankings ---
    var nhlData = await nhlRes.json();
    var wins = nhlData.wins                || [];
    var gaa  = nhlData.goalsAgainstAverage || [];
    var svp  = nhlData.savePctg            || [];

    var wIdx = findSorokinIdx(wins);
    var gIdx = findSorokinIdx(gaa);
    var sIdx = findSorokinIdx(svp);

    var tablesEl = document.getElementById('vezina-tables');
    tablesEl.innerHTML =
      '<table width="100%" style="border:none;">' +
      '<tr>' +
      '<td width="33%" valign="top" style="border:none;padding:0 4px 0 0;">' +
        buildRankTable(wins, 'Wins', function (v) { return Math.round(v); }, wIdx) +
      '</td>' +
      '<td width="33%" valign="top" style="border:none;padding:0 4px;">' +
        buildRankTable(gaa, 'GAA', function (v) { return formatGAA(v); }, gIdx) +
      '</td>' +
      '<td width="33%" valign="top" style="border:none;padding:0 0 0 4px;">' +
        buildRankTable(svp, 'SV%', function (v) { return formatSVP(v); }, sIdx) +
      '</td>' +
      '</tr></table>';

    document.getElementById('footer').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

  } catch (err) {
    console.error('Sorokin page load failed:', err);
    document.getElementById('vezina-odds').textContent = 'Failed to load data.';
  }
}

loadSorokinPage();
