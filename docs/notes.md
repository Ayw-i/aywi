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
