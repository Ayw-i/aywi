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
  'Mock: Clinched': {
    standings: mockStandings('x'),
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
  { label: 'Season',    states: ['Mock: Sorover', 'Mock: Clinched', 'Mock: Outside In'] },
  { label: 'Post-Game', states: ['Mock: Win today', 'Mock: Loss today (reg)', 'Mock: Loss today (OT)'] },
  { label: 'Between',   states: ['Mock: Between (last W)', 'Mock: Between (last L)'] },
  { label: 'Pre-Game',  states: ['Mock: Pre-game'] },
  { label: 'Live',      states: ['Mock: Live +1', 'Mock: Live +2', 'Mock: Live +3', 'Mock: Live +4',
                                  'Mock: Live tied', 'Mock: Live -1', 'Mock: Live -2',
                                  'Mock: Live -3', 'Mock: Live -4'] },
];

var _devLastMockName = null;
var _devLastGameId   = null;

// Goal transition dev triggers — bypass API, call showGoalTransition directly
// situationCode format: awayGoalie|awaySkaters|homeSkaters|homeGoalie
// NYI = home (teamId 2) in all these mocks
const DEV_GOAL_SITUATIONS = {
  'Goal: 5v5':         { code: '1551', label: '5v5 — GOAL!'            },
  'Goal: PP':          { code: '1451', label: '5v4 — POWER PLAY GOAL!' },
  'Goal: Shortie':     { code: '1541', label: '4v5 — SHORTIE!'         },
  'Goal: Dbl Shortie': { code: '1531', label: '3v5 — DOUBLE SHORTIE!!!' },
};

function devTriggerGoalTransition(key) {
  const sit = DEV_GOAL_SITUATIONS[key];
  if (!sit || typeof showGoalTransition === 'undefined') return;

  // Reset any active transition so the guard doesn't block us
  if (typeof _goalTransitionActive !== 'undefined') _goalTransitionActive = false;
  if (typeof _shortKingAltTimer  !== 'undefined' && _shortKingAltTimer) {
    clearInterval(_shortKingAltTimer);
    _shortKingAltTimer = null;
  }

  // Fake play event — NYI (home, teamId 2) scored
  const fakePlay = {
    eventId: 99999,
    situationCode: sit.code,
    details: {
      eventOwnerTeamId: 2,
      scoringPlayerId: 8478483,
      shotType: 'backhand',
    },
  };
  const fakeRosterMap = { 8478483: 'Anders Lee' };

  function devRestore() {
    if (_devLastMockName) devSetMockState(_devLastMockName);
    if (_devLastGameId)   fetchAndRenderScoreboard(_devLastGameId, { nextHomeGame: '—' });
  }
  showGoalTransition(fakePlay, fakeRosterMap, true /* nyiIsHome */, 2 /* homeTeamId */, devRestore);
  highlightActiveBtn(key);
}

// Shootout dev triggers — bypass API, call buildShootoutBoard directly
// NYI (home, id=2) vs CAR (away, id=12) in all mocks

function devMakeSOPlay(typeDescKey, teamId, playerId) {
  var isGoal = typeDescKey === 'goal';
  return {
    typeDescKey: typeDescKey,
    periodDescriptor: { periodType: 'SO' },
    details: {
      eventOwnerTeamId: teamId,
      scoringPlayerId:  isGoal ? playerId : undefined,
      shootingPlayerId: isGoal ? undefined : playerId,
    },
  };
}

const DEV_SO_BASE_BOXSCORE = {
  gameState: 'LIVE',
  homeTeam: { id: 2,  abbrev: 'NYI', score: 2 },
  awayTeam: { id: 12, abbrev: 'CAR', score: 2 },
  periodDescriptor: { periodType: 'SO', number: 5 },
  playerByGameStats: {
    homeTeam: { goalies: [{ name: { default: 'Ilya Sorokin' },       toi: '65:00', goalsAgainst: 2, saves: 30, shotsAgainst: 32, savePctg: 0.938 }] },
    awayTeam: { goalies: [{ name: { default: 'Frederik Andersen' }, toi: '65:00', goalsAgainst: 2, saves: 28, shotsAgainst: 30, savePctg: 0.933 }] },
  },
};

const DEV_SO_ROSTER = {
  rosterSpots: [
    { playerId: 101, firstName: { default: 'Mathew' },   lastName: { default: 'Barzal'     } },
    { playerId: 102, firstName: { default: 'Anders' },   lastName: { default: 'Lee'         } },
    { playerId: 103, firstName: { default: 'Brock' },    lastName: { default: 'Nelson'      } },
    { playerId: 201, firstName: { default: 'Sebastian'}, lastName: { default: 'Aho'         } },
    { playerId: 202, firstName: { default: 'Andrei' },   lastName: { default: 'Svechnikov'  } },
    { playerId: 203, firstName: { default: 'Jordan' },   lastName: { default: 'Martinook'   } },
  ],
};

const DEV_SHOOTOUT_SCENARIOS = {
  'SO: Start': {
    plays: [],
  },
  'SO: R2 (no msg)': {
    plays: [
      devMakeSOPlay('shot-on-goal', 12, 201),  // CAR R1 miss
      devMakeSOPlay('missed-shot',   2, 101),  // NYI R1 miss
      devMakeSOPlay('goal',         12, 202),  // CAR R2 scores — NYI R2 pending
    ],
  },
  'SO: R3 NYI needs goal': {
    plays: [
      devMakeSOPlay('goal',         12, 201),  // CAR R1 scores
      devMakeSOPlay('missed-shot',   2, 101),  // NYI R1 miss
      devMakeSOPlay('shot-on-goal', 12, 202),  // CAR R2 miss
      devMakeSOPlay('missed-shot',   2, 102),  // NYI R2 miss
      devMakeSOPlay('shot-on-goal', 12, 203),  // CAR R3 miss — NYI must score to continue
    ],
  },
  'SO: R3 NYI wins w/ goal': {
    plays: [
      devMakeSOPlay('shot-on-goal', 12, 201),  // CAR R1 miss
      devMakeSOPlay('goal',          2, 101),  // NYI R1 scores
      devMakeSOPlay('goal',         12, 202),  // CAR R2 scores
      devMakeSOPlay('missed-shot',   2, 102),  // NYI R2 miss
      devMakeSOPlay('shot-on-goal', 12, 203),  // CAR R3 miss — NYI scores to win
    ],
  },
  'SO: SD, NYI needs goal': {
    plays: [
      devMakeSOPlay('goal',          12, 201),  // CAR R1 scores
      devMakeSOPlay('missed-shot',    2, 101),  // NYI R1 miss
      devMakeSOPlay('shot-on-goal',  12, 202),  // CAR R2 miss
      devMakeSOPlay('goal',           2, 102),  // NYI R2 scores
      devMakeSOPlay('shot-on-goal',  12, 203),  // CAR R3 miss
      devMakeSOPlay('missed-shot',    2, 103),  // NYI R3 miss — tied, sudden death
      devMakeSOPlay('goal',          12, 201),  // CAR R4 scores — NYI must respond
    ],
  },
};

function devTriggerShootout(key) {
  var scenario = DEV_SHOOTOUT_SCENARIOS[key];
  if (!scenario || typeof buildShootoutBoard === 'undefined') return;

  if (typeof _inShootoutMode !== 'undefined') _inShootoutMode = true;
  document.querySelectorAll('.fade-section').forEach(function (el) { el.style.display = 'none'; });
  var moodImg = document.getElementById('mood-image');
  if (moodImg) moodImg.style.display = 'none';
  var moodSub = document.getElementById('mood-sub');
  if (moodSub) moodSub.style.display = 'none';
  var moodHL = document.getElementById('mood-headline');
  if (moodHL) { moodHL.innerHTML = ''; moodHL.style.fontSize = ''; }

  var mockPbP = Object.assign({}, DEV_SO_ROSTER, { plays: scenario.plays });
  var container = document.getElementById('live-scoreboard');
  if (container) container.innerHTML = buildShootoutBoard(DEV_SO_BASE_BOXSCORE, mockPbP);

  highlightActiveBtn(key);
}

function devSetMockState(name) {
  const mockData = DEV_MOCK_SCENARIOS[name];
  if (!mockData) return;

  // Exit shootout mode if active
  if (typeof _inShootoutMode !== 'undefined' && _inShootoutMode) {
    _inShootoutMode = false;
    document.querySelectorAll('.fade-section').forEach(function (el) { el.style.display = ''; });
  }

  // Call the real detection function with mock data — exercises the full pipeline
  _devLastMockName = name;
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

  function addBtn(body, label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.state = label;
    btn.className = 'dev-btn';
    btn.style.cssText = [
      'display:block', 'width:100%', 'text-align:left',
      'background:none', 'border:none', 'color:#ccc', 'cursor:pointer',
      'padding:2px 0', 'font-size:10px', 'font-family:Helvetica,Arial,sans-serif',
    ].join(';');
    btn.addEventListener('mouseenter', function () { btn.style.color = 'white'; });
    btn.addEventListener('mouseleave', function () { btn.style.color = '#ccc'; });
    btn.addEventListener('click', onClick);
    body.appendChild(btn);
  }

  function addGroupLabel(body, text) {
    const label = document.createElement('div');
    label.textContent = text;
    label.style.cssText = 'color:#888;margin:8px 0 3px 0;text-transform:uppercase;font-size:9px;letter-spacing:1px;';
    body.appendChild(label);
  }

  DEV_MOCK_GROUPS.forEach(function (group) {
    addGroupLabel(body, group.label);
    group.states.forEach(function (name) {
      addBtn(body, name.replace('Mock: ', ''), function () { devSetMockState(name); });
    });
  });

  addGroupLabel(body, 'Situation Overlay');
  var SIT_OVERLAYS = [
    { label: 'PK +1',       fn: function () { applyMoodOverlay(buildPKOverlay( 1, false, 'Apr 23')); } },
    { label: 'PK -1',       fn: function () { applyMoodOverlay(buildPKOverlay(-1, false, 'Apr 23')); } },
    { label: 'PK -4+',      fn: function () { applyMoodOverlay(buildPKOverlay(-4, false, 'Apr 23')); } },
    { label: 'Double PK',   fn: function () { applyMoodOverlay(buildPKOverlay( 1, true,  'Apr 23')); } },
    { label: 'PP +1',       fn: function () { applyMoodOverlay(buildPPOverlay( 1, false)); } },
    { label: 'PP -1',       fn: function () { applyMoodOverlay(buildPPOverlay(-1, false)); } },
    { label: 'PP 5v3',      fn: function () { applyMoodOverlay(buildPPOverlay( 1, true )); } },
  ];
  SIT_OVERLAYS.forEach(function (s) { addBtn(body, s.label, s.fn); });

  addGroupLabel(body, 'Goal Transition');
  Object.keys(DEV_GOAL_SITUATIONS).forEach(function (key) {
    addBtn(body, DEV_GOAL_SITUATIONS[key].label, function () { devTriggerGoalTransition(key); });
  });

  addGroupLabel(body, 'Shootout');
  Object.keys(DEV_SHOOTOUT_SCENARIOS).forEach(function (key) {
    addBtn(body, key, function () { devTriggerShootout(key); });
  });

  addGroupLabel(body, 'Load Game');
  const gameIdRow = document.createElement('div');
  gameIdRow.style.cssText = 'display:flex;gap:4px;margin-top:2px;';
  const gameIdInput = document.createElement('input');
  gameIdInput.type = 'text';
  gameIdInput.placeholder = 'Game ID';
  gameIdInput.style.cssText = 'flex:1;background:#111;border:1px solid #555;color:#ccc;font-size:10px;padding:2px 4px;';
  const gameIdBtn = document.createElement('button');
  gameIdBtn.textContent = 'Load';
  gameIdBtn.style.cssText = 'background:#333;border:1px solid #555;color:#ccc;font-size:10px;cursor:pointer;padding:2px 6px;';
  gameIdBtn.addEventListener('click', function () {
    const id = gameIdInput.value.trim();
    if (!id) return;
    _devLastGameId = id;
    fetchAndRenderScoreboard(id, { nextHomeGame: '—' });
  });
  gameIdInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') gameIdBtn.click(); });
  gameIdRow.appendChild(gameIdInput);
  gameIdRow.appendChild(gameIdBtn);
  body.appendChild(gameIdRow);

  panel.appendChild(header);
  panel.appendChild(body);
  document.body.appendChild(panel);
}

buildDevPanel();
