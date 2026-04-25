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

## Ideas & Backlog

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
