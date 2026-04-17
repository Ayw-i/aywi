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
- MoneyPuck playoff odds JSON (public feed)
- Hosted on Cloudflare Pages via GitHub

## NY Islanders

- NHL API team abbreviation: NYI
- NHL API team ID: 2

---

## File Structure

```
/
├── CLAUDE.md
├── index.html        ← Main page: dynamic mood section + persistent section
├── season.html       ← Season record, standings, playoff odds
├── schedule.html     ← Upcoming games, last 5 results
├── stats.html        ← Skater and goalie season stats
├── about.html        ← What this site is
└── assets/           ← Images, GIFs, audio files
    ├── sorover.png
    └── only posers fall in love.mp3
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

## Front Page — State System

The top section of index.html is a state renderer. JS detects the current
state and swaps the entire top section content, background color, and audio.
The bottom persistent section is always shown regardless of state.

### States

| State      | Background | Image          | Headline         | Audio                            |
|------------|------------|----------------|------------------|----------------------------------|
| eliminated | #2bae66    | sorover.png    | IT'S SOROVER     | only posers fall in love.mp3     |
| win        | #000000    | win image TBD  | ISLES WIN        | TBD                              |
| loss       | #000000    | loss image TBD | ISLES LOSE       | TBD                              |
| live       | TBD        | (scoreboard)   | (live layout)    | TBD                              |
| pregame    | TBD        | TBD            | GAME TODAY       | TBD                              |
| offseason  | TBD        | TBD            | TBD              | TBD                              |

### Elimination trigger
State = "eliminated" when NHL API standings show clinchIndicator = "e" for NYI.
Source: https://api-web.nhle.com/v1/standings/now → standings[] → teamAbbrev.default === "NYI"
MoneyPuck is NOT needed — the official API provides elimination status directly.

---

## Live Game State Layout

When a game is in progress, the top section renders a full two-column
scoreboard (not image + headline). Uses HTML tables for layout.

Sections:
1. Teams + score + period/time remaining
2. Goals side-by-side: scorer, assists, time, situation (5v5 / PPG / SHG / EN / PS)
3. Top 3 / Bottom 3 players side-by-side by TOI (default metric — revisit later)
4. Goalie stats side-by-side: SA / SV / SV%

Auto-refresh every 30 seconds during live games.
Switch to win/loss state only when API confirms gameState = "FINAL".

---

## Persistent Front Page Section (all states)

Always rendered below the mood section:

1. NEWS AGGREGATE TABLE
   Columns: Headline | Site | Link
   Phase 1: manually maintained HTML
   Phase 5+: Cloudflare Worker RSS proxy

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

- Each HTML file is self-contained
- JS lives in a <script> tag at the bottom of each page
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
| 3     | MoneyPuck: playoff odds + elimination detection             |
| 4     | Live game state: two-column scoreboard, auto-refresh        |
| 5     | Pre-game state                                              |
| 6     | News aggregate (manual first, RSS proxy later)              |
| 7+    | Additional states, audio, GIFs, enhancements               |

---

## Ideas & Backlog

- Randomize win/loss images (multiple alternates)
- Animated GIF dividers between sections (source: gifcities.org)
- "Suffering index" — visual arc of the season's emotional history
- Historical game log page
- Sound effects on state change
- Automated news via RSS proxy (Cloudflare Worker)
- MoneyPuck NOT needed — elimination detected via NHL API clinchIndicator field
- Top/bottom player metric: revisit TOI default, consider in-game points
- GSAx for goalies: fetch from MoneyPuck (unofficial stat, research endpoint)
- Before public release: add Worker-level caching (Cloudflare Cache API) so all visitors share one cached NHL API response instead of each triggering a fresh fetch
- Color-code skater/goalie stats by league ranking:
    Gold = 1st in league
    Silver = 2nd in league
    Bright green = top 5
    Regular green = top 10
    (below that TBD — possibly red for bottom rankings)
  Applies to: GAA, SV%, +/-, GSAx (goalies); +/- (skaters)
  Requires fetching league-wide stats for all players to determine rank
  Research: NHL API skater/goalie stats leaders endpoints

---

## Response Text Logic (Regular Season)

All response strings live in `config.json` and are loaded at runtime so they
can be edited without touching JS code.

### During a live game (goal differential = NYI minus opponent)

| Situation        | Differential | Text                              |
|------------------|-------------|-----------------------------------|
| Leading          | +1          | "Yes."                            |
| Leading          | +2          | "Yes!"                            |
| Leading          | +3          | "Yes!!!"                          |
| Leading          | +4 or more  | "Yes! Yes! Yes!"                  |
| Tied             | 0           | "Not yet."                        |
| Trailing         | -1          | "No."                             |
| Trailing         | -2          | "Nope."                           |
| Trailing         | -3          | "Nooo."                           |
| Trailing         | -4 or more  | "Next home game: {nextHomeGame}"  |

### After a game ends (same day, game is final)

| Result                  | Text                          |
|-------------------------|-------------------------------|
| Win (any)               | "We won!"                     |
| Loss — regulation       | "We lost."                    |
| Loss — OT or SO         | "We won... a loser point!"    |

OT/SO loss detected via NHL API `lossType` field on the completed game.

### Between games (no game today)

| Last result | Text |
|---|---|
| Win  | "Yes, and we'll win again {nextGameDay}." |
| Loss | "No, but we'll win {nextGameDay}."        |

`{nextGameDay}` resolves at runtime:
- "tomorrow" if the next NYI game is the following calendar day
- "on [day of week]" otherwise (e.g. "on Monday")

`{nextHomeGame}` resolves at runtime to the date of the next scheduled home game.
Format: "Saturday, April 19th" — full day name, full month name, day with ordinal suffix (1st/2nd/3rd/4th etc).

Between games, the mood image persists from the last result (lee.png after a win, loss image after a loss).

### Pre-season

Same live/postgame/between-games logic applies during preseason games.
Record displayed during preseason should reflect preseason record only
(not mixed with regular season). Other preseason-specific tweaks TBD.
A persistent banner above the persistent section reads:
"Days until Isles hockey begins for real: X"

### Off-season

No game logic. Single centered line only:
"Days until Isles hockey begins (preseason): X"
Counter calculated from first NYI preseason game in upcoming season schedule.
No persistent section shown.

---

## Season State Priority Order

```
1. Playoff game scheduled today (gameType 03)  → Outside In
2. MoneyPuck NYI = 0%, no playoffs yet         → Sorover
3. Preseason (gameType 01) active              → Pre-season + counter
4. Live game in progress                       → Live (scoreboard)
5. Game today, not started                     → Pre-game
6. Game today, final                           → Win / Loss / Loser Point
7. No game today, regular season               → Persist last Win/Loss state
8. No games in API                             → Off-season (counter only)
```

### State specs

| State       | Background | Image                        | Text                        | Audio                          | Fades? |
|-------------|------------|------------------------------|-----------------------------|--------------------------------|--------|
| Outside In  | #000000    | now_im_on_the_outside.png    | "OUTSIDE IN" (link to playoffs.html) | None              | No     |
| Sorover     | #2bae66    | sorover.png                  | "IT'S SOROVER"              | only posers fall in love.mp3   | Yes    |
| Pre-season  | TBD        | TBD                          | Counter + regular layout    | TBD                            | Yes    |
| Live        | TBD        | (scoreboard layout)          | See response text logic     | TBD                            | Yes    |
| Pre-game    | TBD        | TBD                          | TBD                         | TBD                            | Yes    |
| Win         | #000000    | lee.png                      | See response text logic     | TBD                            | Yes    |
| Loss        | #000000    | pov_sasha_daet_tebe_L.png    | See response text logic     | TBD                            | Yes    |
| Off-season  | #000000    | None                         | Days until preseason: X     | None                           | Yes    |

---

## Open Decisions

- Background color and image for live / pregame / preseason states
- Audio files for win / loss / live / preseason states
- Exact stat columns shown in live game player tables
- Domain name: custom domain vs. Cloudflare Pages subdomain (free)
- Whether to rotate multiple win/loss images randomly
- Does off-season state show the persistent section (news/roster) or just the counter? RESOLVED: show news table only, no roster stats during off-season.

## Assets Checklist

| File                              | Status       |
|-----------------------------------|--------------|
| assets/sorover.png                | Ready        |
| assets/only posers fall in love.mp3 | Ready      |
| assets/lee.png                    | Win image (primary)  |
| assets/pov_sasha_daet_tebe_L.png  | Loss image (primary) |
| Live game image (if any)          | TBD          |
| Pre-game image                    | TBD          |
| Off-season image                  | TBD          |
| Animated GIF dividers             | TBD          |
| Favicon                           | TBD          |
