# Notes & Deferred Decisions

Running log of API quirks, known issues, and things to revisit later.

---

## YouTube Widget — Intermittent Failures via dev.js

The YouTube hover widget on the Goal Under Review overlay is unreliable when
triggered through dev.js. Symptoms: widget sometimes doesn't load, mousing over
shows no track title, and play/pause doesn't respond. Other times it works fine.

Likely cause: the YouTube IFrame API's `onReady` callback timing is
unpredictable when the overlay is triggered programmatically right after page
load, before the YT player is fully initialized. In a real live game the review
overlay would only appear after the page has been alive for 30+ seconds, so the
player has time to settle.

Not fixing now — dev-only issue.

---

## Live Game — Goalie Shutout Highlight Field Name

The shutout gold highlight uses `g.goalsAgainst === 0` from the boxscore
playerByGameStats data. The exact NHL API field name needs to be verified
against a live game — if it's named differently (e.g. `goalsAllowed`) the
highlight will silently never trigger.

---

## Playoffs Page — Bracket Seed Order (Left vs Right)

Currently the higher seed is displayed on the left in head-to-head matchups.
This may be backwards: in hockey, the home team is conventionally shown on the
right (score displays, TV graphics, etc.), and the higher seed is the home team
for more games in the 2-2-1-1-1 format (games 1, 2, 5, 7). If that convention
holds for brackets too, higher seed should be on the right.

Not changing this without verifying — no strong consensus on left/right bracket
conventions in general, and it's possible this doesn't matter. Revisit.

---

## Playoffs Page — Goal Line Format

The current format groups goals by period (period header centered, then
two columns for each team's goals). Something about it still feels off —
revisit the layout, typography, or information density at a later date.

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

---

## NHL API — "now" Endpoints Serve Last Season's Data in the Off-Season

The single biggest source of wrong-season bugs. `/v1/standings/now` keeps
serving the **previous season's final table** until the new season's first games
are played. In September 2026 it returned `seasonId: 20252026`,
`date: 2026-04-17`, `clinchIndicator: "e"` — i.e. "NYI eliminated", which is
true of last season and meaningless for the season actually underway.

This caused three separate bugs:

1. **Sorover rendering in September.** The clinch indicator drove the mood
   state, so a stale `"e"` meant "eliminated" forever.
2. **Preseason game states overridden.** `CLINCH_STATE_OVERRIDES` replaced real
   win/loss/live states with Sorover.
3. **playoffs.html skipping the "Playoffs?!" panel.** A stale `"e"` reads as
   "fate settled", so it tried to render a bracket that doesn't exist yet.

**Rule:** never trust a `now` endpoint's payload to describe the season you're
displaying. Validate it — `/v1/standings/now` rows carry their own `seasonId`,
so compare that against `getSelectedSeason()` and treat a mismatch as "no data".
`js/state.js` additionally gates clinch moods by month (config.json
`stateMonthGates`) as a backstop.

---

## NHL API — Roster Endpoint Is Not Historical

`/v1/roster/NYI/{season}` returns the **current organizational roster**, not the
roster as it was that season. Players who have since left are missing entirely.
For 2025-26 it returned only Sorokin and Varlamov — omitting Rittich (28 starts)
and Hogberg — which left season.html's Goalie column blank for 28 games.

**Rule:** for "who played for this team that season", use
`/v1/club-stats/{team}/{season}/{gameType}`. It lists everyone who actually
appeared, and conveniently excludes players who never played. Note the ID field
there is `playerId`, not `id`.

---

## NHL API — Endpoints That 404 on an Unplayed Season

Not all endpoints degrade gracefully for a season with no games yet:

- `/v1/club-stats/NYI/{season}/2` → returns clean empty arrays
  (`{"skaters":[],"goalies":[]}`). Safe to parse.
- `/v1/goalie-stats-leaders/{season}/2` → **404 with an HTML body.** Calling
  `.json()` on it throws, which will take down an entire page's `try` block if
  unguarded (this is why sorokin.html showed "Failed to load data"). Check
  `res.ok` before parsing.

---

## Polymarket — Identifying Which Season a Market Belongs To

Market slugs are not derivable (`nhl-2024-25-vezina-trophy` doesn't exist —
Polymarket had no 2024-25 Vezina market at all), so `polymarketVezinaSlug` in
config.json is updated by hand and may point at a stale season indefinitely.

The market's own `endDate` identifies its season: it's the scheduled resolution
(the award is handed out in June of the season's end year) and is set at
**creation**, months before the market closes. The 2025-26 market was created
2025-10-22 with `endDate: 2026-06-30`, and actually closed 2026-06-06 — during
the playoffs, 8 days before the Final ended, since it resolves when the award is
announced. So `endDate` year 2026 => season 2025-26. Compare against
`getSelectedSeason()` to detect a past-season market.

Resolution is exposed three ways: event/market `closed: true`,
`umaResolutionStatus: "resolved"`, and `outcomePrices` (`["0","1"]` for a
resolved-No, `["1","0"]` for resolved-Yes, with `outcomes: ["Yes","No"]`).

---

## NHL API — Listed Start Time vs. Puck Drop

The listed `startTimeUTC` is not puck drop. Observed live on 2026-09-22 (NYI @ NYR
preseason, listed 7:00 PM ET, game `2026010027`, polled every 20s):

| Time (ET)  | `gameState`   | Period / clock           | Play-by-play                  |
|------------|---------------|--------------------------|-------------------------------|
| 6:45       | `PRE`         | none (no `clock` object) | 0 events                      |
| 7:00       | `PRE`         | none                     | 0 events                      |
| ~7:07      | `LIVE`        | 1st, 20:00, not running  | 1 event: `period-start`       |
| ~7:09      | `LIVE`        | 1st, clock running       | 2 events: + first `faceoff`   |

- The game stays `PRE` well past the listed time (anthems, intros), then flips to
  `LIVE` about 2 minutes **before** the opening faceoff, with the clock stopped at
  20:00. `boxscore` and `score/now` flipped together.
- The NHL logs `period-start` at the flip; the first `faceoff` event (or the clock
  running) is the real puck-drop signal.
- Listed start to actual puck drop was ~9 minutes (the site's hover note says 7-12).
- How the site handles each stretch: "Any minute now." / "Puck drop any minute" past
  the listed time while still `PRE` (state.js, `buildPregameHeader`), and "Puck drop
  any minute" on the live scoreboard while it's the 1st at a stopped 20:00
  (`buildLiveHeader`). A stopped 20:00 in any later period, or 19:58 in the 1st, is a
  real stoppage and shows the normal clock.
- One sample so far (a preseason game). Regular-season and playoff games may have
  longer pregame ceremonies; worth re-checking against an opening-night game.

---

## Live Refresh Lag (Worker cache vs. refresh interval)

The live view re-fetches every 30s (`detectAndRenderState`), but the Worker sends
`Cache-Control: public, max-age=60` on `/v1/` responses, so the browser can serve
the previous response for up to 60s. Net effect: the page can trail the NHL by up to
~90s. Seen on 2026-09-22: the page still said "Puck drop any minute" about a minute
after the opening faceoff, then caught up on its own.

Trade-off if changing it: dropping `max-age` to ~25s (under the 30s refresh) makes
every refresh fresh, but roughly doubles Worker requests per viewer (~5 → ~10 per
minute during a live game), which halves how many viewers the free plan's 100k
requests/day covers. See the capacity discussion before changing it.


---

## NHL API — `delayed-penalty` eventOwnerTeamId Is Unreliable

On `delayed-penalty` events, `details.eventOwnerTeamId` does **not** consistently
mean the same team. Two games, opposite meanings:

| Game        | Delayed penalty at | eventOwnerTeamId | Penalty actually taken by        |
|-------------|--------------------|------------------|----------------------------------|
| 2026010027  | 1st 03:58          | NYR              | Palmieri (NYI), 4s later         |
| 2026010008  | 1st 15:12          | NJD              | Steeves (NJD), 28s later         |

So the live feed never uses it. `delayedPenaltyAgainst()` in live-scoreboard.js
instead takes the team from the actual `penalty` event recorded at the whistle
(first `penalty` after it, before the next `faceoff` — a penalty event's own
`eventOwnerTeamId` *is* the penalized team in both samples), and while the delay
is still running, from the empty net in `situationCode` (the team that pulled its
goalie drew the penalty). With neither, it shows no team rather than guessing.
