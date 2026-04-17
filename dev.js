// dev.js — State switcher for local testing
// Remove the <script src="dev.js"> tag from index.html before going to production

const DEV_STATES = {
  // --- Season states ---
  'Sorover': {
    background: '#2bae66',
    image: 'assets/sorover.png',
    headline: "IT'S SOROVER",
    headlineLink: null,
    audioSrc: 'assets/only%20posers%20fall%20in%20love.mp3',
  },
  'Outside In': {
    background: '#000000',
    image: 'assets/now_im_on_the_outside.png',
    headline: 'OUTSIDE IN',
    headlineLink: 'playoffs.html',
    audioSrc: null,
  },
  'Off-Season': {
    background: '#000000',
    image: null,
    headline: 'Days until Isles hockey begins (preseason): 127',
    headlineLink: null,
    audioSrc: null,
  },

  // --- Post-game ---
  'Win': {
    background: '#000000',
    image: 'assets/lee.png',
    headline: 'We won!',
    headlineLink: null,
    audioSrc: null,
  },
  'Loss (regulation)': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: 'We lost.',
    headlineLink: null,
    audioSrc: null,
  },
  'Loss (OT/SO)': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: 'We won... a loser point!',
    headlineLink: null,
    audioSrc: null,
  },

  // --- Between games ---
  'Between (last W)': {
    background: '#000000',
    image: 'assets/lee.png',
    headline: "Yes, and we'll win again on Thursday.",
    headlineLink: null,
    audioSrc: null,
  },
  'Between (last L)': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: "No, but we'll win on Thursday.",
    headlineLink: null,
    audioSrc: null,
  },

  // --- Live game ---
  'Live +1': {
    background: '#000000',
    image: 'assets/lee.png',
    headline: 'Yes.',
    headlineLink: null,
    audioSrc: null,
  },
  'Live +2': {
    background: '#000000',
    image: 'assets/lee.png',
    headline: 'Yes!',
    headlineLink: null,
    audioSrc: null,
  },
  'Live +3': {
    background: '#000000',
    image: 'assets/lee.png',
    headline: 'Yes!!!',
    headlineLink: null,
    audioSrc: null,
  },
  'Live +4': {
    background: '#000000',
    image: 'assets/lee.png',
    headline: 'Yes! Yes! Yes!',
    headlineLink: null,
    audioSrc: null,
  },
  'Live tied': {
    background: '#000000',
    image: null,
    headline: 'Not yet.',
    headlineLink: null,
    audioSrc: null,
  },
  'Live -1': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: 'No.',
    headlineLink: null,
    audioSrc: null,
  },
  'Live -2': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: 'Nope.',
    headlineLink: null,
    audioSrc: null,
  },
  'Live -3': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: 'Nooo.',
    headlineLink: null,
    audioSrc: null,
  },
  'Live -4': {
    background: '#000000',
    image: 'assets/pov_sasha_daet_tebe_L.png',
    headline: 'Next home game: Saturday, April 19th',
    headlineLink: null,
    audioSrc: null,
  },
};

// Groups for panel layout
const DEV_GROUPS = [
  { label: 'Season',       states: ['Sorover', 'Outside In', 'Off-Season'] },
  { label: 'Post-Game',    states: ['Win', 'Loss (regulation)', 'Loss (OT/SO)'] },
  { label: 'Between',      states: ['Between (last W)', 'Between (last L)'] },
  { label: 'Live',         states: ['Live +1', 'Live +2', 'Live +3', 'Live +4', 'Live tied', 'Live -1', 'Live -2', 'Live -3', 'Live -4'] },
];

// Render a state using the shared renderMoodState() from index.html,
// then make everything visible immediately (dev panel bypasses fades).
function devSetState(name) {
  const state = DEV_STATES[name];
  if (!state) return;

  renderMoodState(name, state);

  // Always show everything immediately in dev mode
  document.getElementById('site-header').classList.add('visible');
  document.querySelectorAll('.fade-section').forEach(function (el) {
    el.classList.add('visible');
  });

  // Highlight active button
  document.querySelectorAll('.dev-btn').forEach(function (btn) {
    btn.style.fontWeight = btn.dataset.state === name ? 'bold' : 'normal';
    btn.style.textDecoration = btn.dataset.state === name ? 'underline' : 'none';
  });
}

// Build the panel
function buildDevPanel() {
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.style.cssText = [
    'position: fixed',
    'top: 0',
    'right: 0',
    'width: 160px',
    'background: rgba(0,0,0,0.85)',
    'border-left: 1px solid #555',
    'border-bottom: 1px solid #555',
    'font-family: Helvetica, Arial, sans-serif',
    'font-size: 10px',
    'color: #ccc',
    'z-index: 9999',
    'padding: 0',
  ].join(';');

  // Header / toggle
  const header = document.createElement('div');
  header.style.cssText = 'padding:5px 8px;background:#222;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #555;';
  header.innerHTML = '<span style="font-weight:bold;color:white;letter-spacing:1px;">DEV</span><span id="dev-chevron">▼</span>';

  const body = document.createElement('div');
  body.id = 'dev-body';
  body.style.cssText = 'padding: 8px;';

  header.addEventListener('click', function () {
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    document.getElementById('dev-chevron').textContent = isOpen ? '▶' : '▼';
  });

  DEV_GROUPS.forEach(function (group) {
    const label = document.createElement('div');
    label.textContent = group.label;
    label.style.cssText = 'color:#888;margin:8px 0 3px 0;text-transform:uppercase;font-size:9px;letter-spacing:1px;';
    body.appendChild(label);

    group.states.forEach(function (name) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.dataset.state = name;
      btn.className = 'dev-btn';
      btn.style.cssText = [
        'display:block',
        'width:100%',
        'text-align:left',
        'background:none',
        'border:none',
        'color:#ccc',
        'cursor:pointer',
        'padding:2px 0',
        'font-size:10px',
        'font-family:Helvetica,Arial,sans-serif',
      ].join(';');
      btn.addEventListener('mouseenter', function () { btn.style.color = 'white'; });
      btn.addEventListener('mouseleave', function () { btn.style.color = '#ccc'; });
      btn.addEventListener('click', function () { devSetState(name); });
      body.appendChild(btn);
    });
  });

  panel.appendChild(header);
  panel.appendChild(body);
  document.body.appendChild(panel);
}

buildDevPanel();
