# Response Text Logic

All base response strings live in `config.json` and are loaded at runtime.
Situation overlays (penalty kill, power play) are applied on top of base text by JS.

---

## Live Game (goal differential = NYI minus opponent, even strength)

| Situation  | Differential | Text                             |
|------------|--------------|----------------------------------|
| Leading    | +1           | "Yes."                           |
| Leading    | +2           | "Yes!"                           |
| Leading    | +3           | "Yes!!!"                         |
| Leading    | +4 or more   | "Yes! Yes! Yes!"                 |
| Tied       | 0            | "Not yet."                       |
| Trailing   | -1           | "No."                            |
| Trailing   | -2           | "Nope."                          |
| Trailing   | -3           | "Nooo."                          |
| Trailing   | -4 or more   | "Next home game: {nextHomeGame}" |

`{nextHomeGame}` — date of next scheduled NYI home game.
Format: "Saturday, April 19th" (full day, full month, ordinal suffix).

---

## Post-game (game finished today)

| Result             | Headline (above image)      | Line under the image / headline |
|--------------------|-----------------------------|---------------------------------|
| Win — regulation   | (no headline) `offsides_like_how_worf_rides_with_starfleet.gif` | "Oh, we're cruising through Long Island Sound." |
| Win — OT           | "OVERTIME WINNER!" + `schot_woll.gif` | "{SCORER} WITH THE DAGGER!!!" — last name, upper-cased; line left out until the scorer is in the data |
| Win — shootout     | "SHOOT! OUT! WIN!" (no image; the shootout chart is in the scoreboard below) | "(Two points is two points!)" (14pt) |
| Win — shutout      | Smaller line above (18pt): "Now that's the difference between first and last place." (`shutout_win_above`), then "Hey {their top goal scorer}..." + `hey-ovi-tell-me-how.jpg` — last name of the opponent's regular-season goals leader (`fetchOppLeadingScorer()`, club-stats). This season first; if it has no leader yet (stats empty until the first regular-season game, or nobody has scored), last season's leader; if neither, just "Hey...". Takes priority over OT/SO | — |
| Loss — regulation  | "We lost."                  | — |
| Loss — OT or SO    | "We won... a loser point!"  | — |

OT/SO detected via NHL API `gameOutcome.lastPeriodType` field. The OT scorer is the last
entry in the game's `goals` list from `/v1/score/now` (`otWinnerLastName()` in js/state.js).
All strings live in config.json `responses.postgame`.

---

## Between Games (no game today)

| Last result | Text                                      |
|-------------|-------------------------------------------|
| Win         | "Yes, and we'll win again {nextGameDay}." |
| Loss        | "No, but we'll win {nextGameDay}."        |

`{nextGameDay}`:
- "tomorrow" if the next NYI game is the following calendar day
- "on [day of week]" otherwise (e.g. "on Monday")

Between games: no mood image shown.

---

## Penalty Kill Modifier (NYI 4v5)

Applied on top of base live-game text. Base text determines Yes/No degree.

| Score situation | Modifier appended |
|-----------------|-------------------|
| Leading         | "But we're killing a bullshit penalty."       |
| Tied            | "and we're killing a bullshit penalty."       |
| Trailing -1/-2/-3 | "and we're killing a bullshit penalty."    |
| Trailing -4+    | Small footnote only: "(Also, we're killing a bullshit penalty)" |

Full examples:
- Leading +2: "Yes! But we're killing a bullshit penalty."
- Trailing -1: "No, and we're killing a bullshit penalty."

---

## Double Penalty Kill Modifier (NYI 3v5)

Same as 4v5 but penalty suffix is the longer Bettman rant:
> "…and we're killing off two bullshit penalties in this rigged league —
> [click here to donate money to Bettman](https://www.cnib.ca/en)"

---

## Power Play Modifier (NYI 5v4)

| Score situation | Modifier |
|-----------------|----------|
| Leading         | "[Yes degree]. And we're on the power play!" |
| Tied            | "Not yet, but we're on the power play."      |
| Trailing        | "[No degree], but we're on the power play."  |

Sub-headline: "We are on the New York Islanders Power Play (...can we decline?)"

---

## Power Play Modifier (NYI 5v3)

Text overrides all other text: "We're 5-on-3 so we've GOT to score here, right? Right?"

---

## Pre-season

Preseason games (gameType 1) count as real games for state detection — see
`isCountedGame()` in js/state.js — so the live / postgame / between-games logic
and text above all apply to them unchanged.

The `preseason` state itself is only the fallback for when preseason has begun but
there's no game data to show: single centered line, `responses.preseason` in
config.json ("Preseason. Real hockey soon."). Placeholder wording; no image or
audio yet.

Not built: the preseason-only record, and the "Days until Isles hockey begins for
real: X" banner above the persistent section.

## Schedule Out

Shown Aug/Sep once next season's schedule is published but preseason is still more
than `season.scheduleOutCutoffDays` away (or has no games listed yet).

Headline is hardcoded in the `STATES` map rather than config.json, since it takes
no parameters: "NEW YEAR, NEW ME". Below it, a bare #/Date/Opponent table of the
upcoming regular season (`renderScheduleOutTable()` in js/state.js).

## Off-season

Single centered line: "Days until Isles hockey begins (preseason): X"
Counter calculated from first NYI preseason game in upcoming season schedule,
falling back to `season.preseasonStartEstimateMonthDay` before that schedule is
published.

## Post-Finals

Single centered line, `responses.post_finals` — shown for
`season.postFinalsWindowDays` days after the Stanley Cup Final's last game.

## Vezina Odds (sorokin.html)

Not a mood state, but config-driven text. `vezinaResolvedText.won` / `.lost`
replace the live odds once the market resolves; `.newSeason` shows when the
configured market belongs to an earlier season than the one being viewed. See
docs/notes.md for how the season is derived.
