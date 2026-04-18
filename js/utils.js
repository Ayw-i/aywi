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
