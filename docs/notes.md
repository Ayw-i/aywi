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

**Recommended starting point:** daily cron Worker that appends to a JSON file in
the repo via the GitHub API, then a hand-drawn SVG or canvas graph on the page.
