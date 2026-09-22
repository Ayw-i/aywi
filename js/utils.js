// Link color for links sitting inside muted gray (#aaa) scoreboard label text —
// a purple/pink-tinted gray, so it reads as a link without jumping to bright
// white. Tweak here.
const LINK_TINT = '#c0a8c8';

function ordinalSuffix(d) {
  if (d >= 11 && d <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][d % 10] || 'th';
}

function formatOrdinalDate(dateStr) {
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(dateStr + 'T12:00:00');
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' +
         d.getDate() + ordinalSuffix(d.getDate());
}

function formatNextGameDay(dateStr) {
  const game     = new Date(dateStr + 'T12:00:00');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (game.toDateString() === tomorrow.toDateString()) return 'tomorrow';
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return 'on ' + days[game.getDay()];
}

function formatPlusMinus(val) {
  if (val > 0) return '+' + val;
  return String(val);
}

function formatGAA(val) {
  return val.toFixed(2);
}

function formatSVP(val) {
  if (val >= 1) return '1.000';
  return '.' + val.toFixed(3).slice(2);
}

// --- State month-gate sanity checks ---
// (see config.json's stateMonthGates — a backstop against a state rendering
// in a month it shouldn't, e.g. Sorover showing up in September)

function isMonthAllowedForState(config, stateName, date) {
  var allowed = (config.stateMonthGates || {})[stateName];
  if (!allowed) return true; // no gate defined = no restriction
  var month = (date || new Date()).getMonth() + 1; // 1-12
  return allowed.indexOf(month) !== -1;
}

function checkMonthSanity(config, stateName) {
  if (!isMonthAllowedForState(config, stateName, new Date())) {
    console.warn('[state] "' + stateName + '" is rendering outside its expected ' +
      'months (see config.json stateMonthGates). Check state-detection logic.');
  }
}
