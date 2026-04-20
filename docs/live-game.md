1# Live Game Layout

Used in two contexts:
- **Live state**: full scoreboard shown below the mood headline, auto-refreshes every 30s
- **Sorover / Clinched / post-game**: finalized version of the same layout ("Final" instead of time remaining)

Data sources (via Cloudflare Worker proxy):
- `/v1/gamecenter/{gameId}/boxscore` — player stats, TOI, goalie stats
- `/v1/gamecenter/{gameId}/play-by-play` — goals, penalties, situation codes
- Game ID obtained from `/v1/score/now` → today's games list

---

## Scoreboard Header

Two teams side by side. Center column has game info.

```
[NYI logo]   5 – 3   [OPP logo]
NYI          3rd · 14:23          OPP
             April 18, 2026
             SOG: 28 – 22
             FO%: 51.3% – 48.7%
```

- Team logos from NHL assets CDN: `https://assets.nhle.com/logos/nhl/svg/{ABBREV}_light.svg`
- "Final" replaces period/time in post-game view
- SOG (shots on goal) and FO% (faceoff win %) shown as small text under game info

---

## Goals Table

Side-by-side columns, one per team. Rows are individual goals listed chronologically
within each team's column (rows do NOT correspond between teams).

| NYI Goals                          | OPP Goals                          |
|------------------------------------|------------------------------------|
| P1 · 8:23 · Lee (Dobson) · 5v5    | P1 · 2:15 · Pastrnak (…) · PPG    |
| P2 · 4:11 · Nelson · SHG          |                                    |

Situation codes: 5v5, PPG (power play goal), SHG (shorthanded goal), EN (empty net), PS (penalty shot)

---

## Penalties Table

Shown below goals, smaller font (10pt). Less visually prominent.

| NYI Penalties                      | OPP Penalties                      |
|------------------------------------|------------------------------------|
| P1 · 3:40 · Bahl · Hooking · 2min |                                    |

---

## Goalies

Shown above the skater performance section.
If a goalie was pulled, show current goalie first, then pulled goalie in a second row colored red.

| NYI                               | OPP                               |
|-----------------------------------|-----------------------------------|
| Sorokin — 32 SA · 29 SV · .906   | Ullmark — 28 SA · 23 SV · .821   |
| [red] Varlamov — 3 SA · 0 SV · .000 (pulled) |                      |

---

## Skater Performance — Top 3 / Bottom 3

Ranked by TOI by default. When goals are scored, points in this game factor in.
Per-team columns, side by side.

| NYI — Best                        | OPP — Best                        |
|-----------------------------------|-----------------------------------|
| Nelson · 0G 1A · 18:23 TOI        | Pastrnak · 2G 0A · 19:45 TOI     |
| Barzal · 1G 0A · 17:55 TOI        | ...                               |
| Lee · 1G 1A · 17:12 TOI           | ...                               |

| NYI — Worst                       | OPP — Worst                       |
|-----------------------------------|-----------------------------------|
| ...                               | ...                               |

---

## Situation Overlays

These modify the mood headline and image when a special game situation is active.
The scoreboard below is unaffected — only the mood section changes.

### Penalty Kill — NYI 4v5

Mood image: `assets/yapper100.gif`

| Score diff | Text |
|---|---|
| Leading +1  | "Yes. But we're killing a bullshit penalty."      |
| Leading +2  | "Yes! But we're killing a bullshit penalty."      |
| Leading +3  | "Yes!!! But we're killing a bullshit penalty."    |
| Leading +4+ | "Yes! Yes! Yes! But we're killing a bullshit penalty." |
| Tied        | "Not yet, and we're killing a bullshit penalty."  |
| Trailing -1 | "No, and we're killing a bullshit penalty."       |
| Trailing -2 | "Nope, and we're killing a bullshit penalty."     |
| Trailing -3 | "Nooo, and we're killing a bullshit penalty."     |
| Trailing -4+ | "Next home game: {nextHomeGame}" (dominant) + small footnote: "(Also, we're killing a bullshit penalty)" |

### Double Penalty Kill — NYI 3v5

Mood image: two copies of `assets/yapper200.gif` side by side.

Same score-diff text as 4v5 but penalty suffix becomes:
> "…and we're killing off two bullshit penalties in this rigged league —
> [click here to donate money to Bettman](https://www.cnib.ca/en)" ← link to blind/deaf charity
> (callback to "I'm blind, I'm deaf, I wanna be a ref" chant)

### Power Play — NYI 5v4

Mood image: 3×3 grid of `assets/barzal-the-muse.png`
TODO: replace with Barzal spin-on-half-wall gif when sourced.

| Score diff | Text |
|---|---|
| Leading     | "[Yes / Yes! / Yes!!! / Yes! Yes! Yes!]. And we're on the power play!" |
| Tied        | "Not yet, but we're on the power play."       |
| Trailing    | "[No / Nope / Nooo], but we're on the power play." |

Sub-headline (small text): "We are on the New York Islanders Power Play (...can we decline?)"

### Double Power Play — NYI 5v3

Text: "We're 5-on-3 so we've GOT to score here, right? Right?"
Image: TBD

### 4v4 (Coincidental minors)

Both teams penalized simultaneously. Modifier TBD.

### 4v3 (Regulation — rare)

Possible in regulation: a 4v4 situation where one team takes an additional penalty.
They drop to 3 skaters (the NHL floor); the other team stays at 4.
Current code will mislabel this as `doublePK`/`doublePP` (which expects 3v5/5v3).
Known gap — spec and flavor text TBD.

### 3v3 (Regulation — very rare)

Possible: a 4v3 situation where the 4-skater team takes another penalty — both sides
are now at the 3-skater floor. Very rare, not meaningfully different from OT 3v3 in feel.
Current code returns `null` (no overlay) since neither side has more skaters than the other.
Known gap — spec TBD; probably just treat like 4v4 (coincidentals flavor).

### Overtime — Regular Season (3v3)

Special "overtime" mood state. Full spec TBD.

### Overtime — Playoffs (5v5)

Spec TBD. Distinguish from regular season OT.

### Shootout

Replaces entire page content — no mood section, no persistent section.
- Page says "SHOOTOUT" in large text
- Live shootout board: checks (✓) and crosses (✗) for each team's attempts
- Updates on each API poll (30s refresh)
- Returns to win/loss state when `gameState = "FINAL"`

### Goal Scored Transition

Detected via event ID tracking: on each poll, compare play-by-play goal events
against `_lastSeenGoalEventId`. New NYI goals trigger a 5-second overlay, then
return to normal live state. Opponent goals are ignored for now.

Detection is skipped on the first scoreboard load (sets baseline, no transition).
`_goalTransitionActive` flag blocks `detectAndRenderState` during the 5 seconds.

Four cases based on situation code at time of goal:

| Situation | Headline | Image |
|---|---|---|
| 5v5 (or EN) | GOAL! | `red-blue-siren-siren.gif` flanking each side of text |
| 5v4 or 5v3 (PP) | POWER PLAY GOAL! | same siren layout |
| 4v5 (SHG) | SHORTIE! | random image from `assets/short-king/`, alternates every 1s |
| 3v5 (double SHG) | DOUBLE SHORTIE!!! | two random short-king images side by side, alternating every 1s |

Sub-headline (small text): "[Lastname] with the [shotType]!" if both are available.
Shot type from `play.details.shotType` (e.g. "backhand", "wrist-shot" → "wrist shot").
Assists are unreliable at goal-time — not shown.

Short-king images: `assets/short-king/pager34-1.png`, `assets/short-king/pager34-2.jpg`

### Empty Net

Opponent pulled their goalie (6v5 for NYI). Modifier TBD.

### Goal Under Review

When NHL API indicates a goal is under review. Show "UNDER REVIEW" overlay. Spec TBD.

### Intermission

Between periods during a live game. Show period summary stats instead of live clock.
Spec TBD.
