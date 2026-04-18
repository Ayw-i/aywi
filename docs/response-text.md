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

| Result             | Text                        |
|--------------------|-----------------------------|
| Win (any)          | "We won!"                   |
| Loss — regulation  | "We lost."                  |
| Loss — OT or SO    | "We won... a loser point!"  |

OT/SO loss detected via NHL API `gameOutcome.lastPeriodType` field.

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

Same live/postgame/between-games logic applies. Record shown is preseason-only.
Persistent banner above persistent section: "Days until Isles hockey begins for real: X"

## Off-season

Single centered line: "Days until Isles hockey begins (preseason): X"
Counter calculated from first NYI preseason game in upcoming season schedule.
