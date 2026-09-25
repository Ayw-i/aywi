// --- YouTube player ---
// Only needed for the goal-review overlay and the Rangers win songs, which are
// rare, so YouTube's player script isn't loaded with the page — ytPlayVideo()
// fetches it the first time a video starts. (Loading it up front cost a big
// download on every visit and filled the console with YouTube's own
// [Violation] warnings.)

var _ytPlayer = null;
var _ytReady  = false;   // true once the player can take commands
var _ytMode   = false;
var _ytApiRequested = false;
var _ytPendingVideo = null;  // video to start once the player is ready
var _ytVolume  = 50;
var _ytMusicId = null;       // the song ytPlayMusic() is playing, if any
var _ytWaitingForClick = false;  // song was blocked from autoplaying

function ytPlayVideo(videoId, volume) {
  _ytVolume = volume || 50;
  // The hover panel: this video's thumbnail, and its title once it loads
  document.getElementById('yt-cover').src = 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg';
  document.getElementById('yt-title').textContent = '';
  if (_ytReady && _ytPlayer) {
    _ytPlayer.setVolume(_ytVolume);
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
        _ytPlayer.setVolume(_ytVolume);
        // Still on the review overlay / win screen? (It may have ended while the player loaded.)
        if (_ytMode && _ytPendingVideo) _ytPlayer.loadVideoById(_ytPendingVideo);
        _ytPendingVideo = null;
        syncToggle();
      },
      onStateChange: function (e) {
        var data = _ytPlayer.getVideoData();
        var titleEl = document.getElementById('yt-title');
        if (titleEl && data && data.title) titleEl.textContent = data.title;
        if (e.data === 1) _ytWaitingForClick = false;   // it's playing
        // Ended: start the song over (the player's own loop setting only
        // covers the review video it was created with)
        if (e.data === 0 && _ytMode) {
          _ytPlayer.seekTo(0);
          _ytPlayer.playVideo();
        }
        syncToggle();
      },
      // 101 / 150 = the video's owner doesn't allow it to play on other
      // sites; 100 = removed or private
      onError: function (e) {
        console.warn('[youtube] Video ' + (_ytMusicId || _ytPendingVideo || '') +
          ' won\'t play here — YouTube error ' + e.data);
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

// Fades in the ▶/⏸ button (and its hover panel) that controls the YouTube player
function ytShowWidget() {
  var ytWidget = document.getElementById('yt-widget');
  if (!ytWidget) return;
  ytWidget.style.opacity = '0';
  ytWidget.style.display = 'block';
  requestAnimationFrame(function () { ytWidget.style.opacity = '1'; });
}

function ytStop() {
  _ytMode = false;
  _ytMusicId = null;
  _ytWaitingForClick = false;
  if (_ytPlayer && _ytReady) _ytPlayer.pauseVideo();
  var ytWidget = document.getElementById('yt-widget');
  if (ytWidget) ytWidget.style.display = 'none';
}

// A YouTube video as the page's music (the Rangers win songs), quieter than
// the review video. Starts right away if the browser allows it; if not, the
// first click, tap or key press anywhere on the page starts it (see below).
// Already playing this song? It keeps going rather than starting over.
function ytPlayMusic(videoId) {
  if (_ytMode && _ytMusicId === videoId) return;
  _ytMode = true;
  _ytMusicId = videoId;
  _ytWaitingForClick = true;
  ytShowWidget();
  ytPlayVideo(videoId, 30);
  syncToggle();
}

// Browsers won't play sound until the visitor has interacted with the page.
// When a song was blocked, the first interaction starts it. Scrolling doesn't
// work for this — browsers don't count a scroll as interacting. Clicks on the
// ▶ button itself are left to the button, or both would toggle at once.
function ytStartOnInteraction(e) {
  if (!_ytWaitingForClick || !_ytMode) return;
  if (e.target.closest && e.target.closest('#yt-widget')) return;
  _ytWaitingForClick = false;
  // Player still loading? It starts the song itself once ready, and the
  // interaction has already unlocked sound by then.
  if (_ytPlayer && _ytReady && _ytPlayer.getPlayerState() !== 1) _ytPlayer.playVideo();
}

['pointerdown', 'keydown', 'touchend'].forEach(function (type) {
  document.addEventListener(type, ytStartOnInteraction, true);
});

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
