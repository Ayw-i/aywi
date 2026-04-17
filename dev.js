// dev.js — State switcher for local testing
// Remove the <script src="dev.js"> tag from index.html before going to production

// Helper: make a mock standings object for NYI
function mockStandings(clinchIndicator) {
  return {
    standings: [{
      teamAbbrev: { default: 'NYI' },
      clinchIndicator: clinchIndicator || null,
    }]
  };
}

// Helper: make a mock NYI game entry for today's schedule
function mockNYIGame(gameState, nyiScore, oppScore, lastPeriodType) {
  return {
    gameType: 2,
    gameState: gameState,
    awayTeam: { abbrev: 'NYI', score: nyiScore },
    homeTeam: { abbrev: 'BOS', score: oppScore },
    gameOutcome: lastPeriodType ? { lastPeriodType: lastPeriodType } : null,
  };
}

// Helper: make a mock month schedule entry
function mockScheduleGame(abbrev, gameState, nyiScore, oppScore, daysFromNow, isHome, lastPeriodType) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const dateStr = d.toISOString().slice(0, 10);
  return {
    gameDate: dateStr,
    gameState: gameState,
    gameType: 2,
    awayTeam: { abbrev: isHome ? abbrev : 'NYI', score: isHome ? oppScore : nyiScore },
    homeTeam: { abbrev: isHome ? 'NYI' : abbrev, score: isHome ? nyiScore : oppScore },
    gameOutcome: lastPeriodType ? { lastPeriodType: lastPeriodType } : null,
  };
}

// Mock data scenarios — each calls detectAndRenderState() with fake API data
// so the real detection logic is exercised, not just the visual renderer.
const DEV_MOCK_SCENARIOS = {
  // --- Season states ---
  'Mock: Sorover': {
    standings: mockStandings('e'),
    todayGames: [],
    monthGames: [],
  },
  'Mock: Outside In': {
    standings: mockStandings(null),
    todayGames: [{ gameType: 3, gameState: 'LIVE', awayTeam: { abbrev: 'BOS' }, homeTeam: { abbrev: 'TBL' } }],
    monthGames: [],
  },

  // --- Post-game (game finished today) ---
  'Mock: Win today': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('OFF', 4, 2, 'REG')],
    monthGames: [mockScheduleGame('PHI', 'FUT', 0, 0, 2, true, null)],
  },
  'Mock: Loss today (reg)': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('OFF', 1, 3, 'REG')],
    monthGames: [mockScheduleGame('PHI', 'FUT', 0, 0, 2, true, null)],
  },
  'Mock: Loss today (OT)': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('OFF', 2, 3, 'OT')],
    monthGames: [mockScheduleGame('PHI', 'FUT', 0, 0, 2, true, null)],
  },

  // --- Between games ---
  'Mock: Between (last W)': {
    standings: mockStandings(null),
    todayGames: [],
    monthGames: [
      mockScheduleGame('CAR', 'OFF', 4, 1, -2, false, 'REG'),
      mockScheduleGame('PHI', 'FUT', 0, 0, 2, true, null),
    ],
  },
  'Mock: Between (last L)': {
    standings: mockStandings(null),
    todayGames: [],
    monthGames: [
      mockScheduleGame('CAR', 'OFF', 1, 3, -2, false, 'REG'),
      mockScheduleGame('PHI', 'FUT', 0, 0, 2, true, null),
    ],
  },

  // --- Pre-game ---
  'Mock: Pre-game': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('FUT', 0, 0, null)],
    monthGames: [],
  },

  // --- Live game ---
  'Mock: Live +1': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 2, 1, null)],
    monthGames: [mockScheduleGame('WSH', 'FUT', 0, 0, 5, true, null)],
  },
  'Mock: Live +2': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 3, 1, null)],
    monthGames: [],
  },
  'Mock: Live +3': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 4, 1, null)],
    monthGames: [],
  },
  'Mock: Live +4': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 5, 1, null)],
    monthGames: [],
  },
  'Mock: Live tied': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 2, 2, null)],
    monthGames: [],
  },
  'Mock: Live -1': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 1, 2, null)],
    monthGames: [],
  },
  'Mock: Live -2': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 0, 2, null)],
    monthGames: [],
  },
  'Mock: Live -3': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 0, 3, null)],
    monthGames: [],
  },
  'Mock: Live -4': {
    standings: mockStandings(null),
    todayGames: [mockNYIGame('LIVE', 0, 4, null)],
    monthGames: [mockScheduleGame('WSH', 'FUT', 0, 0, 3, true, null)],
  },
};

const DEV_MOCK_GROUPS = [
  { label: 'Season',    states: ['Mock: Sorover', 'Mock: Outside In'] },
  { label: 'Post-Game', states: ['Mock: Win today', 'Mock: Loss today (reg)', 'Mock: Loss today (OT)'] },
  { label: 'Between',   states: ['Mock: Between (last W)', 'Mock: Between (last L)'] },
  { label: 'Pre-Game',  states: ['Mock: Pre-game'] },
  { label: 'Live',      states: ['Mock: Live +1', 'Mock: Live +2', 'Mock: Live +3', 'Mock: Live +4',
                                  'Mock: Live tied', 'Mock: Live -1', 'Mock: Live -2',
                                  'Mock: Live -3', 'Mock: Live -4'] },
];

function devSetMockState(name) {
  const mockData = DEV_MOCK_SCENARIOS[name];
  if (!mockData) return;

  // Call the real detection function with mock data — exercises the full pipeline
  detectAndRenderState(mockData);

  // Always show everything immediately in dev mode
  setTimeout(function () {
    document.getElementById('site-header').classList.add('visible');
    document.querySelectorAll('.fade-section').forEach(function (el) {
      el.classList.add('visible');
    });
  }, 50);

  highlightActiveBtn(name);
}

function highlightActiveBtn(name) {
  document.querySelectorAll('.dev-btn').forEach(function (btn) {
    btn.style.fontWeight    = btn.dataset.state === name ? 'bold' : 'normal';
    btn.style.textDecoration = btn.dataset.state === name ? 'underline' : 'none';
  });
}

function buildDevPanel() {
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.style.cssText = [
    'position:fixed', 'top:0', 'right:0', 'width:170px',
    'background:rgba(0,0,0,0.88)', 'border-left:1px solid #555',
    'border-bottom:1px solid #555', 'font-family:Helvetica,Arial,sans-serif',
    'font-size:10px', 'color:#ccc', 'z-index:9999', 'padding:0',
  ].join(';');

  const header = document.createElement('div');
  header.style.cssText = 'padding:5px 8px;background:#222;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #555;';
  header.innerHTML = '<span style="font-weight:bold;color:white;letter-spacing:1px;">DEV</span><span id="dev-chevron">▼</span>';

  const body = document.createElement('div');
  body.id = 'dev-body';
  body.style.cssText = 'padding:8px;max-height:90vh;overflow-y:auto;';

  header.addEventListener('click', function () {
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    document.getElementById('dev-chevron').textContent = isOpen ? '▶' : '▼';
  });

  DEV_MOCK_GROUPS.forEach(function (group) {
    const label = document.createElement('div');
    label.textContent = group.label;
    label.style.cssText = 'color:#888;margin:8px 0 3px 0;text-transform:uppercase;font-size:9px;letter-spacing:1px;';
    body.appendChild(label);

    group.states.forEach(function (name) {
      const btn = document.createElement('button');
      btn.textContent = name.replace('Mock: ', '');
      btn.dataset.state = name;
      btn.className = 'dev-btn';
      btn.style.cssText = [
        'display:block', 'width:100%', 'text-align:left',
        'background:none', 'border:none', 'color:#ccc', 'cursor:pointer',
        'padding:2px 0', 'font-size:10px', 'font-family:Helvetica,Arial,sans-serif',
      ].join(';');
      btn.addEventListener('mouseenter', function () { btn.style.color = 'white'; });
      btn.addEventListener('mouseleave', function () { btn.style.color = '#ccc'; });
      btn.addEventListener('click', function () { devSetMockState(name); });
      body.appendChild(btn);
    });
  });

  panel.appendChild(header);
  panel.appendChild(body);
  document.body.appendChild(panel);
}

buildDevPanel();
