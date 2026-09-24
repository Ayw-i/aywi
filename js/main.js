// --- YouTube player ---
// Only needed for the goal-review overlay, which is rare, so YouTube's player
// script isn't loaded with the page — ytPlayVideo() fetches it the first time
// a review starts. (Loading it up front cost a big download on every visit and
// filled the console with YouTube's own [Violation] warnings.)

var _ytPlayer = null;
var _ytReady  = false;   // true once the player can take commands
var _ytMode   = false;
var _ytApiRequested = false;
var _ytPendingVideo = null;  // video to start once the player is ready

function ytPlayVideo(videoId) {
  if (_ytReady && _ytPlayer) {
    _ytPlayer.loadVideoById(videoId);
    return;
  }
  _ytPendingVideo = videoId;
  if (_ytApiRequested) return;
  _ytApiRequested = true;
  var script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';  // calls onYouTubeIframeAPIReady when loaded
  document.head.appendChild(script);
}

window.onYouTubeIframeAPIReady = function () {
  _ytPlayer = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: 'GDP4ds-ozOI' },
    events: {
      onReady: function () {
        _ytReady = true;
        _ytPlayer.setVolume(50);
        // Still on the review overlay? (It may have ended while the player loaded.)
        if (_ytMode && _ytPendingVideo) _ytPlayer.loadVideoById(_ytPendingVideo);
        _ytPendingVideo = null;
        syncToggle();
      },
      onStateChange: function (e) {
        if (e.data === 1 || e.data === 5) {
          var data = _ytPlayer.getVideoData();
          var titleEl = document.getElementById('yt-title');
          if (titleEl && data && data.title) titleEl.textContent = data.title;
        }
        syncToggle();
      },
    },
  });

  function ytToggle() {
    if (!_ytPlayer || !_ytReady) return;
    if (_ytPlayer.getPlayerState() === 1) {
      _ytPlayer.pauseVideo();
    } else {
      _ytPlayer.playVideo();
    }
  }

  var ytBare = document.getElementById('yt-bare');
  if (ytBare) ytBare.addEventListener('click', ytToggle);
};

// --- Sound toggle ---

const audio  = document.getElementById('bg-audio');
const toggle = document.getElementById('sound-toggle');

function syncToggle() {
  var playing = _ytMode
    ? (_ytPlayer && _ytReady && _ytPlayer.getPlayerState() === 1)
    : !audio.paused;
  var icon = playing ? '&#9208;' : '&#9654;';
  toggle.innerHTML = icon;
  var ytBare = document.getElementById('yt-bare');
  if (ytBare) ytBare.innerHTML = icon;
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
