# Notes & Deferred Decisions

Running log of API quirks, known issues, and things to revisit later.

---

## NHL API — Live Feed Duplicate Plays

During live games, the NHL play-by-play API sometimes temporarily inserts duplicate
penalty entries (same player, same infraction, same timestamp) that are cleaned up
once the game goes final.

Observed: Dennis Gilbert, two cross-checking penalties at 3rd 20:00 during the
OTT-CAR game (ID 2025030131) — absent from the final play-by-play.

**Potential fix:** Deduplicate plays by `eventId` before rendering.
Deferred — rare enough to not be worth addressing immediately.

---

## Sorokin Page — Vezina Odds History Graph

Add a line graph to sorokin.html showing how Sorokin's Polymarket Vezina odds
have moved throughout a given season.

**What's needed:**
- A data store for historical odds snapshots (date + probability). Options:
  - A JSON file in the repo (e.g. `data/sorokin-odds-YYYY.json`) updated manually
    or via a scheduled Cloudflare Worker cron job that polls the Gamma API daily.
  - Polymarket's own candlestick/history endpoint if it exposes per-market history.
- A charting solution compatible with the no-framework constraint. Options:
  - Hand-rolled SVG polyline (no dependencies, fits the lo-fi aesthetic).
  - A single-file library like Chart.js loaded from CDN (breaks the no-CDN rule
    unless vendored locally).
  - Inline `<canvas>` drawn with the 2D API (vanilla JS, no deps).
- Season selector if we want multi-year support.

**Recommended approach:** Cloudflare Worker cron trigger + KV storage.
- Add a cron trigger to the existing Worker (runs once daily).
- Cron handler fetches Sorokin's Polymarket odds and writes `{ date, probability }`
  to Cloudflare KV — free tier is more than sufficient for one entry per day.
- Add a `/sorokin-odds-history` route to the Worker that reads all KV entries
  and returns them as JSON.
- sorokin.html fetches that route and draws the graph (hand-rolled canvas or SVG,
  no library needed).
- No git noise, no GitHub Actions, everything stays in Cloudflare.

---

## Player Bio Hover (Settings Feature)

### Concept
A gear icon (fixed position, like the sound toggle) opens a small per-page dropdown
of settings. On game pages (live or final scoreboard), one setting is "Enable player
bios" — hovering a player name shows a small popup with:
- Draft info: e.g. "Drafted 2015, 3rd round, 77th overall"
- Career-best season (skaters): e.g. "Best year: 2022 — 12G, 22A, 34P"
- Career-best season (defensemen): points or +/- (TBD — +/- is flawed, points may
  be more meaningful)
- Career-best season (goalies): best SV% or GAA season

Data source: NHL API `/v1/player/{playerId}/landing` — returns `draftDetails` and
`seasonTotals` (full career year by year). Career best is computed by finding the
peak season in the relevant stat.

### Loading strategy
Fetch all *displayed* players (goal scorers, penalty takers, best/worst skaters,
goalies — roughly 15-20 players) in parallel via `Promise.all` when the setting is
toggled on. Cache results in a JS object (`playerId → bioData`) so toggling off and
on doesn't re-fetch. Show a small "loading bios..." indicator while fetching.

Don't fetch all 40-50 roster players — only those visible in the scoreboard.

### Persistent caching across visitors (Cloudflare KV)
Player bio data barely changes mid-season (draft info never changes; career bests
only change if the player has a better season). Re-fetching live every time is
wasteful.

**Recommended approach:** Add a KV-backed cache layer to the Worker.
- Worker checks KV for `player:{id}` before hitting the NHL API.
- On a miss: fetch from NHL API, store result in KV (TTL: end of season or ~7 days),
  return to browser.
- First request per player is normal speed; every subsequent request (from any
  visitor) is served from KV instantly.
- No repo noise, no GitHub Actions, benefits all visitors from the first fetch onward.

Alternatives considered:
- `localStorage`: per-device only, not shared across visitors. Fine as a secondary
  layer but not a substitute.
- JSON file in repo + GitHub Action: transparent but creates daily commits and
  requires Action setup.
