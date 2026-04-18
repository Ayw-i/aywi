// --- Sound toggle ---

const audio  = document.getElementById('bg-audio');
const toggle = document.getElementById('sound-toggle');

function syncToggle() {
  toggle.innerHTML = audio.paused ? '&#9654;' : '&#9646;&#9646;';
}

audio.addEventListener('play',  syncToggle);
audio.addEventListener('pause', syncToggle);

toggle.addEventListener('click', function () {
  if (audio.paused) { audio.play(); } else { audio.pause(); }
});

// --- Fade / intersection observer ---
// _uiObserver and _uiObserving are globals referenced by showGameSection() in state.js.

var _uiObserver  = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      _uiObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

var _uiObserving = false;

function startObserving() {
  if (!_uiObserving) {
    _uiObserving = true;
    document.querySelectorAll('.fade-section').forEach(function (section) {
      _uiObserver.observe(section);
    });
  }
}

// Header fades in on first scroll or mouseover; also kicks off section observer.
var siteHeader = document.getElementById('site-header');

function revealHeader() {
  siteHeader.classList.add('visible');
  startObserving();
}

window.addEventListener('scroll',     revealHeader, { once: true });
siteHeader.addEventListener('mouseenter', revealHeader, { once: true });

// Mouseover on any fade section reveals it immediately.
document.querySelectorAll('.fade-section').forEach(function (section) {
  section.addEventListener('mouseenter', function () {
    section.classList.add('visible');
    _uiObserver.unobserve(section);
  }, { once: true });
});

// --- Initialise ---

detectAndRenderState();
loadNews();
loadRosterStats();
