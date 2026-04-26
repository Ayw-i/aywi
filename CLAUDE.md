# Are Ya Winning, Isles?

A read-only mood dashboard for NY Islanders fans. Gives fans an instant
emotional read on the current game or most recent result, plus season
health at a glance. Personal learning project — also intended to go public
via Cloudflare Pages.

---

## Cloudflare Worker — NHL API Proxy

All NHL API calls go through this Worker (avoids CORS):
https://nhl-proxy.aywi.workers.dev/v1/...

Example: https://nhl-proxy.aywi.workers.dev/v1/club-stats/NYI/20252026/2
Worker source is in nhl-proxy-worker.js (for reference — edited in Cloudflare dashboard).

---

## Tech Stack

- Plain HTML5, CSS3, Vanilla JavaScript only
- No frameworks, no npm, no build tools
- NHL API: https://api-web.nhle.com/v1/
- Hosted on Cloudflare Pages via GitHub

## NY Islanders

- NHL API team abbreviation: NYI
- NHL API team ID: 2

---

## File Structure

```
/
├── CLAUDE.md
├── index.html          ← Main page: mood section + persistent section
├── season.html         ← Season record, standings, playoff odds
├── schedule.html       ← Upcoming games, last 5 results
├── stats.html          ← Skater and goalie season stats
├── about.html          ← What this site is
├── config.json         ← Response strings and news sources (edited without touching JS)
├── dev.js              ← DEV ONLY state switcher (remove before production)
├── nhl-proxy-worker.js ← Worker source reference
├── assets/             ← Images, GIFs, audio files
├── js/
│   ├── utils.js        ← Pure formatting helpers (dates, +/-, GAA, SV%)
│   ├── state.js        ← State definitions, rendering, detection pipeline
│   ├── live-game.js    ← Live scoreboard layout (in progress)
│   ├── news.js         ← News feed loading
│   ├── roster.js       ← Roster stats loading and sortable tables
│   └── main.js         ← Audio, fade/observer setup, initialization calls
└── docs/
    ├── states.md       ← State machine: priority order, specs, trigger conditions
    ├── live-game.md    ← Live layout spec and all situation overlays
    └── response-text.md ← All text strings and their conditions
```

---

## Design Rules

- 90s Geocities aesthetic — lo-fi, old internet, no modern CSS effects
- No rounded corners, no shadows, no gradients
- No Google Fonts, no icon libraries
- Use `<table>` for all data and side-by-side layouts (period accurate)
- Navigation: plain text link bar at the top of every page
- Layout: centered single column, max-width ~800px
- Sound toggle: fixed top-left, Unicode symbol only (▶ / ⏸)

---

## Persistent Front Page Section

Always rendered below the mood section (except off-season: news only, no roster):

1. NEWS AGGREGATE TABLE — Headline | Site | Link
2. ROSTER STATS TABLES (from NHL API)
   - Forwards: Name | GP | G | A | PTS | +/-
   - Defensemen: Name | GP | G | A | PTS | +/-
   - Goalies: Name | GP | W | L | GAA | SV%

---

## Sound Toggle

- Fixed position, top-left corner
- Unicode only: ▶ to play, ⏸ to pause
- Only rendered when current state has an audio file
- Audio loops continuously
- Browser autoplay is blocked until first user interaction — the toggle
  button is the intended first interaction. Do not add workarounds.

---

## Coding Style

- JS is split into files under js/ and loaded via script tags
- No external libraries or CDN imports
- Prefer readable over clever — this is a learning project
- One small working thing at a time

---

## What NOT To Do

- Do not introduce React, Vue, Svelte, or any JS framework
- Do not add npm, package.json, or any build step
- Do not use CSS frameworks (Bootstrap, Tailwind, etc.)
- Do not add a backend
- Do not use CSS flexbox or grid for layout — use tables
- Do not add features beyond what is asked for in the current task

---

## Build Phases

| Phase | Focus                                                       |
|-------|-------------------------------------------------------------|
| 0     | Setup: VS Code, Git, GitHub repo, Cloudflare Pages          |
| 1     | Static shell: sorover state + hardcoded persistent section  |
| 2     | NHL API: roster tables live; win/loss state from last game  |
| 3     | State detection via NHL API (clinch, elimination, playoffs) |
| 4     | JS refactor into js/ files; docs/ spec files                |
| 5     | Live game scoreboard layout                                 |
| 6     | Situation overlays (PK, PP, OT, shootout, goal transition)  |
| 7     | Pre-game state, off-season state                            |
| 8+    | Audio, GIFs, news RSS, enhancements                         |

---

## High Priority — Planned Features

- **Live skater situation display:** Add a small line near the period/time display showing the
  current on-ice skater counts. Usually "5v5". If a penalty is active: "5v4 2:00" or "4v5 2:00"
  (skater count from away team's perspective vs. home team's, time remaining on penalty).
  Handle 4v4, 5v3, 3v5, and extra attacker (goalie pulled, e.g. 6v5) situations. Right now the
  only way to know we're not at 5v5 is the mood headline, which gets overridden a lot — this
  gives a persistent, unambiguous skater-count indicator.

- **Playoff background tiers:** Live game state should be aware of playoff context and set
  background color accordingly (no mood image in these states). Priority order (highest wins):
  1. **Game 7** — bright orange `#FF8C00` (matches series.html away OT win color)
  2. **Elimination game** (NYI must win or season ends) — dark burnt orange `#CC5500`
     (matches series.html away reg win color)
  3. **Playoff OT** — royal blue `#003B99` (brighter than standard playoff bg); keep jon_bois
     image + "OVERTIME. PLAYOFF. ISLANDERS. HOCKEY." header; just swap background color
  4. **Any playoff live game** — dark navy `#0a0f2c` (already used), header
     "PLAYOFF.<br>ISLANDERS.<br>HOCKEY.", no mood image
  Note: Game 6 Beauvillier overlay is already built and can stay as-is (it's OT + elimination
  context combined). These tiers only affect background color + fallback behavior.

- **Live game skater stats redesign:** Replace the current "best 3 / worst 3 by points/TOI"
  panel with a full per-team skater table showing all players sorted by TOI, with additional
  columns: shots, blocked shots, hits, faceoff %, takeaways, giveaways, +/-. Layout TBD
  (collapsible vs. always expanded). Data is already available in `playerByGameStats` per player.

---

## Ideas & Backlog

- **Revisit goalie fatigue algorithm (season.html):** Current thresholds: shortHeavy = B2B or
  4 starts in 5 days; longHeavy = 18 starts in 30 days. Colors: amber (long only), orange
  (short only), red (both). Works per-goalie correctly. May need tuning — thresholds were
  loosened from initial values that were too aggressive. Consider whether the rolling windows
  and/or thresholds better reflect actual workload concerns.

- **Schedule page — trip/stand summary:** Above the calendar, show a compact table of homestands
  and road trips (2+ consecutive same-location games) grouped by start month. Columns: Type
  (Homestand/Road Trip) | Dates | Games | W-L-OTL. Single games between stretches are skipped.
  Month-spanning trips filed under start month. See conversation 2026-04-25 for full brainstorm.

- Randomize win/loss images (multiple alternates)
- Animated GIF dividers between sections (source: gifcities.org)
- "Suffering index" — visual arc of the season's emotional history
- Historical game log page
- Sound effects on state change
- Automated news via RSS proxy (Cloudflare Worker)
- GSAx for goalies: fetch from MoneyPuck (unofficial stat, research endpoint)
- Before public release: add Worker-level caching (Cloudflare Cache API)
- Live event feed: rolling log of last 5–8 play-by-play events (shots, saves, blocks, hits) below the scoreboard during live state. Data already fetched via play-by-play endpoint. Consider tightening refresh interval (10s?) for this feature.
- Color-code skater/goalie stats by league ranking (gold/silver/green/red)
  Requires fetching league-wide stats leaders endpoints
- Barzal spin gif for power play state (replace barzal-the-muse.png placeholder)
- **Revisit playoffs bracket UX:** (1) The "dim unstarted rounds" logic (opacity:0.5 if no wins yet) is a rough heuristic — think through edge cases like round just starting with 0-0 records. (2) Take another look at emoji spacing in the series card — the nested mini-table approach works but may still feel off at certain sizes.
- **Hat trick logic (partial):** Series expand view scorer list shows 🧢 suffix on 3rd goal, 🧢++ on 4th, etc.; hat trick scorer name shown in gold. Not yet surfaced in win state headline. Remaining ideas: (1) Special live celebration when hat trick detected — transparent hat PNGs raining down the page (CSS animation, confetti-style). (2) 🧢 stamp on the game cell in the series bar — requires per-player goal data which isn't in the schedule feed, only in the boxscore; would need to either fetch all boxscores on page load or stamp lazily on first expand (already tried lazy stamp, felt wrong — revisit).

---

## Assets Checklist

| File                                | Status                |
|-------------------------------------|-----------------------|
| assets/sorover.png                  | Ready                 |
| assets/only posers fall in love.mp3 | Ready                 |
| assets/lee.png                      | Win image (primary)   |
| assets/pov_sasha_daet_tebe_L.png    | Loss image (primary)  |
| assets/now_im_on_the_outside.png    | Playoffs state        |
| assets/roblox engvall.png           | Clinched state        |
| assets/barzal-the-muse.png          | PP state placeholder  |
| assets/yapper100.gif                | PK (4v5) image        |
| assets/yapper200.gif                | PK (3v5) image        |
| Pre-game image                      | TBD                   |
| Off-season image                    | TBD                   |
| Geocities siren gif (goal scored)   | TBD                   |
| Animated GIF dividers               | TBD                   |
| Favicon                             | TBD                   |
