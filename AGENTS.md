# Are Ya Winning, Isles?

A read-only mood dashboard for NY Islanders fans. Gives fans an instant
emotional read on the current game or most recent result, plus season
health at a glance. Personal learning project — also intended to go public
via Cloudflare Pages.

---

## Cloudflare Worker — API Proxy

All external API calls go through this Worker (avoids CORS). Base:
https://nhl-proxy.aywi.workers.dev — available in JS as the `WORKER` const
(defined in js/nhl-schedule.js).

| Path            | Proxies to                          | Used for                     |
|-----------------|-------------------------------------|------------------------------|
| `/v1/...`       | https://api-web.nhle.com            | All NHL API calls            |
| `/polymarket/...` | https://gamma-api.polymarket.com | Vezina odds (sorokin.html) |
| `/feeds/{key}`  | RSS feed per key in the Worker      | News aggregate table         |

Example: https://nhl-proxy.aywi.workers.dev/v1/club-stats/NYI/20252026/2

`/polymarket/` only passes through the gamma-api paths listed in `POLYMARKET_PATHS`
(currently `/events` and `/public-search`) — add a path there to use a new endpoint.
The Worker only answers pages from `ALLOWED_ORIGINS` (the public site) and local
Live Server (localhost / 127.0.0.1, any port); requests from other sites get a 403.
A new domain for the site must be added to `ALLOWED_ORIGINS` or the site breaks.
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
├── AGENTS.md           ← This file: project instructions
├── CLAUDE.md           ← One-line pointer to AGENTS.md
├── index.html          ← Main page: mood section + persistent section
├── season.html         ← Game-by-game season table, special records, goalie starts
├── schedule.html       ← Month calendar of the season's games
├── stats.html          ← Extended skater and goalie season stats
├── playoffs.html       ← Today's playoff games + full bracket by conference/round
├── series.html         ← Season series vs. every opponent, grouped by division
├── game.html           ← Single game box score (?id={gameId})
├── sorokin.html        ← Sorokin page: Vezina odds + goalie ranking tables
├── knicks.html         ← Hardcoded 2025-26 NBA playoffs bracket (joke page)
├── swatches.html       ← Color swatch reference
├── about.html          ← What this site is
├── 404.html            ← Not-found page (Cloudflare serves it via wrangler.jsonc)
├── 403.html            ← Forbidden page (nothing routes here automatically)
├── config.json         ← Response strings, month gates, news sources (edit without touching JS)
├── fights.json         ← Fight records, used by the fight overlay
├── dev.js              ← DEV ONLY state switcher (remove before production)
├── nhl-proxy-worker.js ← Worker source reference
├── wrangler.jsonc      ← Cloudflare deploy config for the site (stops auto-setup guessing Hugo)
├── .assetsignore       ← Files kept off the public site (.git, docs, *.md, …)
├── assets/             ← Images, GIFs, video, audio (+ king-of-shutouts/, short-king/,
│                         sorokin-water/, "pondering maclean"/ subfolders); its
│                         index.html is a joke page shown instead of a folder listing
├── js/
│   ├── utils.js        ← Pure formatting helpers (dates, +/-, GAA, SV%), month-gate checks
│   ├── nhl-schedule.js ← WORKER const, season selection/picker, season schedule cache,
│   │                     shared schedule formatting (dates, times, logos, date colors)
│   ├── nav.js          ← Shared nav link bar
│   ├── tooltip.js      ← Shared game-cell tooltip positioning
│   ├── state.js        ← State definitions, rendering, detection pipeline
│   ├── main.js         ← Audio, YouTube widget, fade/observer setup, initialization
│   ├── live-game.js    ← Live game coordinator: shared state + fetch/render loop
│   ├── live-scoreboard.js ← Scoreboard section HTML builders (incl. skater situation)
│   ├── live-skaters.js ← Skater panel: GameScore ranking, best/worst tables
│   ├── live-overlays.js ← Situation overlay + fight HTML builders
│   ├── live-graph.js   ← Win probability line + situation strips
│   ├── news.js         ← News feed loading
│   ├── roster.js       ← Front page roster stats tables (sortable)
│   ├── stats.js        ← stats.html extended stats tables
│   ├── season-page.js  ← season.html table, special records, goalie fatigue
│   ├── schedule-page.js ← schedule.html month calendar
│   ├── playoffs.js     ← playoffs.html bracket, series cards, today's game cards
│   ├── series.js       ← series.html season series grid
│   ├── sorokin.js      ← sorokin.html Vezina odds + rankings
│   └── knicks.js       ← knicks.html hardcoded bracket
└── docs/
    ├── states.md       ← State machine: priority order, specs, trigger conditions, month gates
    ├── live-game.md    ← Live layout spec and all situation overlays
    ├── response-text.md ← All text strings and their conditions
    └── notes.md        ← API quirks, known issues, deferred decisions
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

Rendered below the mood section:

1. NEWS AGGREGATE TABLE — Headline | Site | Date | Link (always shown). Dates are
   relative ("12m ago", "3h ago", "Yesterday", then "Sep 18"). « Prev / Next » paging
   under the table: page 1 is balanced (≤ maxPerSource per feed), pages 2+ are the
   rest newest-first, up to maxPages — all from the articles already fetched, so
   paging makes no extra requests (settings in config.json `news`)
2. ROSTER STATS TABLES (from NHL API)
   - Forwards: Name | GP | G | A | PTS | +/-
   - Defensemen: Name | GP | G | A | PTS | +/-
   - Goalies: Name | GS | W | L | SO | GAA | SV%

The stats block (`#stats-section`) hides itself whenever the season has no stats
yet — club-stats returns empty arrays until the first regular-season game — so it
disappears during the off-season, preseason and schedule-out states without
needing to know which state is active. The season rolls over each September via
`getSelectedSeason()`; it is not pinned to a hardcoded season.

---

## Sound Toggle

- Fixed position, top-left corner
- Unicode only: ▶ to play, ⏸ to pause
- Only rendered when current state has an audio file
- Audio loops continuously
- Hovering the toggle shows a credit panel (cover, track, artist, link to where
  the song lives), styled to match the goal-review YouTube widget. Filled from
  the state's `audioCredit` in js/state.js; states without one get no panel
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
| 7     | Pre-game, off-season, post-finals, preseason, schedule-out  |
| 8     | Extra pages: playoffs, series, game, stats, sorokin         |
| 9     | Skater situation indicator, GameScore panel, fight overlay  |
| 10    | Season-rollover correctness + state month gates ← current   |
| 11+   | Audio, GIFs, news RSS, enhancements                         |

---

## High Priority — Planned Features

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

- **Live game skater stats expansion:** The best/worst panel now ranks by GameScore
  (`gameScore()` in js/live-skaters.js) and shows Name | G/A | TOI | +/- | GS. Still planned:
  a full per-team table of all skaters sorted by TOI with shots, blocked shots, hits and
  faceoff % columns. Layout TBD (collapsible vs. always expanded). Data is already available
  in `playerByGameStats` per player. Note TK/GV were deliberately dropped from the displayed
  columns (they still feed GameScore) — see the analytics-caution note before re-adding them.

- **Series page past-season team correctness:** The DIVISIONS and TEAM_NAMES tables in series.js
  are hardcoded for the current league. Past seasons need adjustments: (1) Seattle (SEA) didn't
  exist before 2021–22 — should be hidden or replaced for earlier seasons. (2) Vegas (VGK)
  didn't exist before 2017–18. (3) Utah (UTA) was Arizona Coyotes (ARI) through 2023–24 and
  didn't exist as Utah until 2024–25 — series vs. ARI should show as ARI for those seasons.
  Approach TBD: could be a season-aware DIVISIONS/TEAM_NAMES override, or filter out teams with
  0 games played against NYI that season.

---

## Ideas & Backlog

- **GameScore: PK credit via shift charts:** Reward skaters who participated in a successful
  penalty kill. Requires fetching `/v1/shift-charts/{gameId}` (one extra call, ~100KB) to get
  per-player shift start/end times, then cross-referencing with penalty windows from play-by-play
  that expired without a PP goal. A flat SH TOI approximation isn't viable — the boxscore only
  exposes total `toi`, no situational breakdown. Suggested weight: `+0.10` per successful PK
  minute of shift overlap, or a flat `+0.15` per kill.

- **Revisit goalie fatigue algorithm (season.html):** Current thresholds: shortHeavy = B2B or
  4 starts in 5 days; longHeavy = 18 starts in 30 days. Colors: amber (long only), orange
  (short only), red (both). Works per-goalie correctly. May need tuning — thresholds were
  loosened from initial values that were too aggressive. Consider whether the rolling windows
  and/or thresholds better reflect actual workload concerns.

- **Schedule page — break indicator:** Gray out the league-wide All-Star/Olympics break on the
  calendar. Approach: find the longest Jan–Feb gap in NYI's schedule, walk inward from each edge
  calling `/v1/schedule/{date}` until hitting days with zero league-wide games — that window is
  the true break. Adds ~4–7 extra API calls on page load.

- **Schedule page — trip/stand summary:** Above the calendar, show a compact table of homestands
  and road trips (2+ consecutive same-location games) grouped by start month. Columns: Type
  (Homestand/Road Trip) | Dates | Games | W-L-OTL. Single games between stretches are skipped.
  Month-spanning trips filed under start month. See conversation 2026-04-25 for full brainstorm.

- **season.html — "Show preseason games" checkbox:** schedule.html shows preseason
  (gameType 1, tagged "PRE"); season.html and series.html still skip it. Idea: a checkbox
  on season.html that reveals the preseason games. Watch for split-squad days (two games
  on one date, e.g. 2016-09-27) and keep them out of records and game numbers.

- Randomize win/loss images (multiple alternates)
- Animated GIF dividers between sections (source: gifcities.org)
- "Suffering index" — visual arc of the season's emotional history
- Historical game log page
- Sound effects on state change
- GSAx for goalies: fetch from MoneyPuck (unofficial stat, research endpoint)
- Before public release: add Worker-level caching (Cloudflare Cache API)
- Live event feed refresh interval: the feed shipped (`buildLiveFeed` in
  js/live-scoreboard.js) and now shows every play-by-play event, newest first, 15 per
  page with « Prev / Next » (the page survives the 30s rebuild via `_liveFeedPage`).
  A faster refresh alone won't help while the Worker sends `max-age=60` — see
  "Live Refresh Lag" in docs/notes.md for that trade-off first
- Color-code skater/goalie stats by league ranking (gold/silver/green/red)
  Requires fetching league-wide stats leaders endpoints
- Barzal spin gif for power play state (replace barzal-the-muse.png placeholder)
- **Revisit playoffs bracket UX:** (1) The "dim unstarted rounds" logic (opacity:0.5 if no wins yet) is a rough heuristic — think through edge cases like round just starting with 0-0 records. (2) Take another look at emoji spacing in the series card — the nested mini-table approach works but may still feel off at certain sizes.
- **Hat trick logic (partial):** Series expand view scorer list shows 🧢 suffix on 3rd goal, 🧢++ on 4th, etc.; hat trick scorer name shown in gold. Not yet surfaced in win state headline. Remaining ideas: (1) Special live celebration when hat trick detected — transparent hat PNGs raining down the page (CSS animation, confetti-style). (2) 🧢 stamp on the game cell in the series bar — requires per-player goal data which isn't in the schedule feed, only in the boxscore; would need to either fetch all boxscores on page load or stamp lazily on first expand (already tried lazy stamp, felt wrong — revisit).

- **Delayed penalty EA label:** Goals scored with an extra attacker during a delayed penalty could be labeled `DEL` instead of `EA`. Detection: for any EA goal, check if there's a penalty event against the defending team between the last stoppage and the goal with no intervening stoppage (delayed penalties have no whistle until the puck is touched by the penalized team). Requires passing the full plays array + goal index into `getSituationLabel` (both live-scoreboard.js and playoffs.js), or pre-tagging EA goals with a `_isDelayedEA` flag before the table is built.

- **"Not quite PP goal" label:** In goal displays (live event feed, series expand scorer list), mark goals scored within 15 seconds of a power play expiring with no intervening stoppage as something like "PPG*" or "PP+" — the "power play goal that technically isn't." Detection: in the play-by-play, check that the most recent penalty-expiry or power-play-end event precedes the goal by ≤15 seconds and no stoppage event appears between them. NHL broadcasters informally call these "power play carryover" goals — they count as even-strength in the box score but were clearly set up by the man advantage.

---

## Assets Checklist

| File                                | Status                |
|-------------------------------------|-----------------------|
| assets/sorover.png                  | Ready                 |
| assets/only posers fall in love.mp3 | Ready — actually track 4, "Tinder対現実 • ☹ •" (TVVIN_PINEZ_M4LL) |
| assets/only-posers-cover.jpg        | Album cover for the sound credit panel (150px, from Bandcamp) |
| assets/lee.png                      | Win image (primary)   |
| assets/pov_sasha_daet_tebe_L.png    | Loss image (primary)  |
| assets/now_im_on_the_outside.png    | Playoffs state        |
| assets/roblox engvall.png           | Clinched state        |
| assets/barzal-the-muse.png          | PP state placeholder  |
| assets/yapper100.gif                | PK (4v5) image        |
| assets/yapper200.gif                | PK (3v5) image        |
| assets/playoffs-questionmark-exclamationpoint.jpg | Jim Mora panel on playoffs.html |
| assets/king-of-shutouts/sort-of-happy.jpg | Vezina "new season" state (config: vezinaNewSeasonImage) |
| Pre-game image                      | TBD                   |
| Off-season image                    | TBD — state ships imageless by design |
| Preseason image                     | TBD — state ships imageless by design |
| Schedule Out image                  | Not planned — schedule table instead of an image |
| Geocities siren gif (goal scored)   | TBD                   |
| Animated GIF dividers               | TBD                   |
| Favicon                             | TBD                   |
