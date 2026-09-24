# State System

The top section of index.html is a state renderer. JS detects the current state and swaps
the entire top section content, background color, and audio. Detection runs on page load.

---

## Season State Priority Order

```
1. NYI has an active or completed game today (gameType 03)  → Playoffs Active (sub-states below)
2. No NYI game today, but NYI has an active playoff series  → Playoffs Active (between games)
3. NYI lost their most recent playoff series (eliminated)   → Playoffs Eliminated
4. Playoff games today but NYI is not in them               → Outside In
5. clinchIndicator = "e" for NYI                            → Sorover
6. clinchIndicator = "x" / "y" / "z" for NYI               → Clinched
7. Preseason (gameType 01) active                           → Pre-season + counter  [TODO — see note below]
8. Live game in progress (gameState LIVE / CRIT)            → Live (scoreboard)
9. Game today, not started (gameState FUT / PRE)            → Pre-game
10. Game today, final (gameState OFF / FINAL)               → Shutout Win / Shootout Win / OT Win / Win / Loss / Loser Point
    (checked in that order: a 1-0 OT win gets the shutout screen)
11. No game today, regular season                           → Persist last Win/Loss state
12. No NYI games this month AND Stanley Cup Final decided,
    < postFinalsWindowDays (config.json, default 7) since
    the Final's last game                                   → Post-Finals
13. No NYI games this month, Final decided, ≥ postFinalsWindowDays
    since, AND next season's schedule not yet published      → Off-season (estimate counter)
14. No NYI games this month, next season's schedule published,
    and today >= first preseason game's date                 → Preseason (placeholder)
15. No NYI games this month, next season's schedule published,
    <= scheduleOutCutoffDays (config.json, default 10) until
    the first preseason game                                 → Off-season (real counter)
16. No NYI games this month, next season's schedule published,
    month is Aug or Sep, and neither of the above two windows
    apply (still far from preseason, or no preseason games
    listed yet)                                               → Schedule Out (schedule table)
17. No NYI games this month AND Final not yet decided (or Final
    lookup failed) — persist last clinch mood (Sorover/Clinched)
    IF the current month is one of that mood's allowed months
    (config.json stateMonthGates); otherwise fall back to
    Preseason rather than trusting stale/absent clinch data.
```

Rules 12-16 apply regardless of whether NYI made the Final — they key off the
league-wide Final result (bracket series `O`), not NYI's own season outcome. This
is why they sit ahead of rule 17's "persist last clinch mood": once the whole
playoffs are over, the site shouldn't keep showing NYI's old Sorover/Clinched
mood indefinitely.

Rule 17's month-gate check exists specifically because of a real bug: in
September, `getStanleyCupFinalEndDate()` used to look up next year's playoff
bracket (fixed now — it derives the bracket year from the current date's own
month, not an off-by-one), so it always returned nothing, and the code fell
through to Sorover/Clinched with no sanity check at all. Rules 13-16 (and the
new Preseason/Schedule-Out states) close that gap with real logic; the rule 17
gate is a backstop in case that logic still can't resolve anything (e.g. a
live-fetch failure).

Rule 7's "Preseason" is currently only the bare-bones placeholder built for
rules 14/17 above (no image/audio, no per-game detail) — not a full detection
against today's actual preseason schedule. The fuller version (showing "Game N
of preseason today" etc.) is still `[TODO]`.

---

## State Specs

| State                | Background | Image                        | Text                                  | Audio                        | Fades? |
|----------------------|------------|------------------------------|---------------------------------------|------------------------------|--------|
| Playoffs Active      | TBD        | TBD                          | See sub-states below                  | TBD                          | Yes    |
| Playoffs Eliminated  | TBD        | TBD                          | TBD                                   | TBD                          | Yes    |
| Outside In           | #000000    | now_im_on_the_outside.png    | "OUTSIDE IN" (link to playoffs.html)  | None                         | No     |
| Post-Finals          | #000000    | now_im_on_the_outside.png    | "Congratulations to... who cares, not us." (link to playoffs.html) | None | No |
| Sorover              | #2bae66    | sorover.png                  | "IT'S SOROVER"                        | only posers fall in love.mp3 | Yes    |
| Clinched             | #000000    | roblox engvall.png           | "Clinched."                           | None                         | Yes    |
| Pre-season           | TBD        | TBD                          | Counter + regular layout (fuller version, still TODO) | TBD | Yes |
| Preseason (placeholder) | #000000 | None                       | "Preseason. Real hockey soon." (config.json)          | None | Yes |
| Schedule Out         | #000000    | None                          | "NEW YEAR, NEW ME" + #/Date/Opponent schedule table   | None | Yes |
| Live                 | #000000    | None (scoreboard layout)     | See response-text.md                  | TBD                          | Yes    |
| Pre-game             | #000000    | None (pregame preview)       | "Game today." → "Game in X hours Y minutes." within 3h of the listed start (pinned 28pt; under 1h, "X minutes" has a hover note about the 7-12 min real-start delay) → "Any minute now." once the listed start passes | TBD                          | Yes    |
| Win                  | #000000    | offsides_like_how_worf_rides_with_starfleet.gif, no headline, line under it | See response-text.md | TBD | Yes    |
| OT Win               | #000000    | schot_woll.gif, headline above it | See response-text.md ("{SCORER} WITH THE DAGGER!!!") | TBD | Yes    |
| Shootout Win         | #000000    | None (shootout chart in the scoreboard below) | See response-text.md | TBD | Yes    |
| Loss                 | #000000    | pov_sasha_daet_tebe_L.png    | See response-text.md                  | TBD                          | Yes    |
| Off-season           | #000000    | None                         | See response-text.md                  | None                         | Yes    |

---

## Schedule Out — State Spec

Shows the upcoming regular-season schedule (bare #/Date/Opponent table, no
results — nothing's been played yet) once the NHL has published next season's
schedule but it's still too early to start counting down to preseason.

**Trigger (all three must hold):**
1. Current month is August or September.
2. Next season's schedule is published (`getUpcomingSeasonSchedule()` finds
   any `gameType === 2` game — the API returns the full season at once, so
   any regular-season game found means Oct/Nov/Dec are in there too).
3. Either more than `config.json`'s `season.scheduleOutCutoffDays` (default
   10) days remain until the first preseason game, **or** no preseason
   (`gameType === 1`) games are listed yet at all.

Once within that cutoff window (or preseason has actually started), the
regular Off-season countdown / Preseason placeholder takes back over — see
priority rules 13-16 above.

---

## Month Gates (sanity-check backstop)

`config.json`'s `stateMonthGates` lists which calendar months (1=Jan...12=Dec)
each mood state is allowed to render in — e.g. Sorover/Clinched are gated to
Oct-Apr, since a team can't be realistically eliminated from (or clinch)
playoff contention in May-Sep. Checked via `isMonthAllowedForState()` /
`checkMonthSanity()` in `js/utils.js`.

This is a backstop, not the primary detection logic, and only applies to the
real-data path (`data.isMock` skips it entirely, so the dev.js state switcher
can preview any state regardless of the real-world month):

- **Hard block**: only at the final Sorover/Clinched fallback in `applyState()`
  (rule 17 above) — if the month gate rejects it, render Preseason instead of
  trusting stale/absent clinch data. This is the actual bug this backstop was
  built for.
- **Soft check** (warn-only, everywhere else): `outside_in`, `post_finals`,
  `offseason`, `preseason`, `schedule_out`, and the main win/loss/live/pregame
  render call — these are already driven by real API data for "today," so a
  gate failure here just logs a console warning for debugging rather than
  overriding what real data already determined.

---

## Elimination / Clinch Detection

Source: `GET /v1/standings/now` → `standings[]` → find `teamAbbrev.default === "NYI"`

| clinchIndicator | Meaning        | State    |
|-----------------|----------------|----------|
| `"e"`           | Eliminated     | Sorover  |
| `"x"`           | Clinched berth | Clinched |
| `"y"`           | Clinched div   | Clinched |
| `"z"`           | Clinched conf  | Clinched |
| `null`          | In the race    | (normal) |

---

## Game Section (below mood section)

- **Sorover / Clinched**: shows the previous game finalized scoreboard (see live-game.md)
- **Live**: mood headline + full live scoreboard below it (see live-game.md)
- **Pre-game**: mood headline + pregame preview in the scoreboard spot — logos, dashes for
  scores, puck drop in the viewer's time zone ("Warmups" once gameState is PRE), date and venue (one per line),
  PRESEASON tag for gameType 1. No team records (preseason still reports last season's).
  Once the listed start time passes (game still FUT/PRE), the clock line says "Puck drop any
  minute" and the headline "Any minute now." — see notes.md, "Listed Start Time vs. Puck Drop".
  Page re-checks state every 60s so the live scoreboard takes over at puck drop (live: every 30s).
  The live scoreboard also shows "Puck drop any minute" while it's the 1st period with the clock
  stopped at 20:00 (the NHL marks the game LIVE a couple of minutes before the opening faceoff).
- **Win / Loss (game finished today)**: mood headline + that game's finalized scoreboard
- **Between games (no game today)**: mood headline + "Previous game:" card. The next
  game's day in the headline ("on **Friday**" / "**tomorrow**") is a link that unfolds a
  "Next game:" card under it; clicking again folds it back. The click also fades in the
  header and on-screen sections the way the first scroll does. If the game section is
  already showing, the card slides open (pushing the page down) and fades in, and folds
  away the same way; otherwise it just arrives with the section's fade-in. "soon" (no
  next game this month) isn't a link.
- **Next game card** (`renderNextGameCard()` in js/state.js): same size as the previous
  game card — logos, dashes for scores, and Game N (or Preseason), date and puck drop in
  the viewer's time zone ("Time TBD" if the NHL hasn't set one) in the middle. Taken from
  the season schedule: the first NYI game whose start time is still ahead, skipping
  postponed/cancelled games
- **Outside In / Off-season / Pre-season**: game section hidden
- **Playoffs Active (between games / win / loss)**: game section shows previous playoff game scoreboard + series record
- **Playoffs Active (pregame / live)**: same as regular season pregame/live; game section hidden / replaced by scoreboard
- **Playoffs Eliminated**: game section shows final series result (last game scoreboard)

---

## Playoffs Active — Sub-states

When NYI is in the playoffs, the top-level `playoffs_active` umbrella wraps states that
parallel the regular season pattern, but with series context added throughout.

**Detection:** NYI appears in the current playoff bracket with an active series (neither
team has 4 wins) OR a completed playoff game today (gameType 3 with NYI). API source:
`/v1/playoff-bracket/{season}` or the series carousel endpoint.

### Sub-state: Between Playoff Games (no game today)

Parallel to regular season "between games" but shows series context.

| Last result | Headline (TBD)                                      |
|-------------|-----------------------------------------------------|
| Win         | TBD — something emphatic about being in the playoffs |
| Loss        | TBD — something grim but hopeful                    |

- Game section: finalized scoreboard from last game + series record (e.g. "Series tied 1–1")
- Round label shown (Round 1 / Second Round / Conference Finals / Stanley Cup Final)
- Link to playoffs.html

### Sub-state: Playoff Pregame

A playoff game is scheduled today (gameState FUT / PRE).

- Headline: TBD (something distinct from regular season "Game today.")
- Shows game number in series (e.g. "Game 4 today.")
- Shows current series record

### Sub-state: Playoff Live

Parallel to regular season Live — same scoreboard, 30s refresh, all overlays apply.

- Headline: same score-differential text as regular season
- Scoreboard header shows series record and game number (already implemented via `nyiGameNum`)
- All situation overlays (PK, PP, OT, EN, goal transition, review) apply unchanged
- Playoff OT overlay already has its own handling (see live-game.md)

### Sub-state: Playoff Win / Loss (game finished today)

Parallel to regular season win/loss.

| Result | Headline (TBD) |
|--------|----------------|
| Win    | TBD — varies by series record after the win (e.g. leading 3–1 vs advancing) |
| Loss   | TBD — varies by series record (e.g. now down 3–0) |

Series-clinching win (4th win) should feel different from a mid-series win. Elimination
game loss (4th loss) flows into Playoffs Eliminated state on next page load.

---

## Playoffs Eliminated — State Spec

NYI lost their playoff series. This is distinct from regular-season Sorover (`clinchIndicator = "e"`).

**Detection:** NYI appears in the bracket and their series is over with the opponent having 4 wins.

- Background: TBD (probably dark — not the green of Sorover)
- Image: TBD
- Headline: TBD — different energy from regular-season Sorover; playoff elimination hits different
- Audio: TBD
- Game section: finalized scoreboard from the series-ending game + "Series: [OPP] wins 4–X"
- Persistent section: shown normally (news + roster)

---

## Post-Finals / Off-season Detection

Runs only when no NYI game was found for the current month window (the existing
`!gameInfo` fallback) — a real fetch, skipped for dev mock data:

1. `GET /v1/playoff-bracket/{year}` → find `series.seriesLetter === 'O'` (the Final).
   If it doesn't exist yet, or neither side has 4 wins, the Final isn't over — fall
   through to the old behavior (persist clinch mood / Sorover default).
2. If the Final is over, fetch the winning team's full season schedule
   (`/v1/club-schedule-season/{abbrev}/{season}`) to find the actual date of the
   last Final game (the bracket API doesn't carry per-game dates itself).
3. `daysSinceFinal = today − thatDate`.
   - `< config.season.postFinalsWindowDays` (default 7) → **Post-Finals** state.
   - Otherwise → **Off-season** state, with a countdown to preseason.

For the Off-season countdown, next season's preseason opener is looked up from
`/v1/club-schedule-season/NYI/{nextSeason}` (first `gameType === 1` game). If the
NHL hasn't published that schedule yet, falls back to a fixed estimate —
`config.season.preseasonStartEstimateMonthDay` (default `09-21`).

---

## Open Decisions

- Background color and image for pregame / preseason / schedule-out states
  (all three currently render on plain black with no image)
- Audio files for win / loss / live / preseason states
- Whether to rotate multiple win/loss images randomly
- Does off-season state show the persistent section (news/roster) or just the counter?
  RESOLVED: news table only, no roster stats. IMPLEMENTED — but data-driven rather
  than state-driven: `#stats-section` hides itself whenever club-stats returns no
  stats for the season, which covers off-season, preseason and schedule-out alike.
- All TBD fields in Playoffs Active and Playoffs Eliminated above — revisit when Isles are in it.
- The fuller Pre-season state from priority item 7 (counter, preseason-only record,
  today's exhibition game) is still unbuilt; only the placeholder exists.
