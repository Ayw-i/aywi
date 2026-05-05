// Shared game-cell tooltip: viewport-aware positioning, hide, and clamp.
// Usage: var tt = makeGameTooltip('my-tt', function() { return _expandedCell; });
//        tt.move(event)  — call from onmousemove
//        tt.hide()       — call from onmouseout
//        tt.clamp()      — call after injecting expanded content
function makeGameTooltip(tooltipId, getExpandedCell) {
  function move(e) {
    if (getExpandedCell()) return;
    var tt = document.getElementById(tooltipId);
    tt.style.left = '-9999px';
    tt.style.top  = '-9999px';
    tt.style.display = 'block';
    var ttW = tt.offsetWidth, ttH = tt.offsetHeight;
    var vw  = window.innerWidth, vh = window.innerHeight;
    var x = (e.clientX + 14 + ttW > vw) ? e.clientX - 14 - ttW : e.clientX + 14;
    var y = (e.clientY + 14 + ttH > vh) ? e.clientY - 14 - ttH : e.clientY + 14;
    tt.style.left = x + 'px';
    tt.style.top  = y + 'px';
  }

  function hide() {
    if (getExpandedCell()) return;
    document.getElementById(tooltipId).style.display = 'none';
  }

  function clamp() {
    var tt   = document.getElementById(tooltipId);
    var top  = parseInt(tt.style.top,  10) || 0;
    var left = parseInt(tt.style.left, 10) || 0;
    var vh = window.innerHeight, vw = window.innerWidth;
    if (top  + tt.offsetHeight > vh) tt.style.top  = Math.max(0, vh - tt.offsetHeight - 4) + 'px';
    if (left + tt.offsetWidth  > vw) tt.style.left = Math.max(0, vw - tt.offsetWidth  - 4) + 'px';
  }

  return { move: move, hide: hide, clamp: clamp };
}
