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
7. Preseason (gameType 01) active                           → Pre-season + counter  [TODO]
8. Live game in progress (gameState LIVE / CRIT)            → Live (scoreboard)
9. Game today, not started (gameState FUT / PRE)            → Pre-game
10. Game today, final (gameState OFF / FINAL)               → Win / Loss / Loser Point
11. No game today, regular season                           → Persist last Win/Loss state
12. No games in API                                         → Off-season (counter only)  [TODO]
```

---

## State Specs

| State                | Background | Image                        | Text                                  | Audio                        | Fades? |
|----------------------|------------|------------------------------|---------------------------------------|------------------------------|--------|
| Playoffs Active      | TBD        | TBD                          | See sub-states below                  | TBD                          | Yes    |
| Playoffs Eliminated  | TBD        | TBD                          | TBD                                   | TBD                          | Yes    |
| Outside In           | #000000    | now_im_on_the_outside.png    | "OUTSIDE IN" (link to playoffs.html)  | None                         | No     |
| Sorover              | #2bae66    | sorover.png                  | "IT'S SOROVER"                        | only posers fall in love.mp3 | Yes    |
| Clinched             | #000000    | roblox engvall.png           | "Clinched."                           | None                         | Yes    |
| Pre-season           | TBD        | TBD                          | Counter + regular layout              | TBD                          | Yes    |
| Live                 | #000000    | None (scoreboard layout)     | See response-text.md                  | TBD                          | Yes    |
| Pre-game             | #000000    | TBD                          | "Game today."                         | TBD                          | Yes    |
| Win                  | #000000    | lee.png (30% width)          | See response-text.md                  | TBD                          | Yes    |
| Loss                 | #000000    | pov_sasha_daet_tebe_L.png    | See response-text.md                  | TBD                          | Yes    |
| Off-season           | #000000    | None                         | "Days until preseason: X"             | None                         | Yes    |

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
- **Win / Loss / Between games**: mood headline only; game section hidden
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

## Open Decisions

- Background color and image for pregame / preseason states
- Audio files for win / loss / live / preseason states
- Whether to rotate multiple win/loss images randomly
- Does off-season state show the persistent section (news/roster) or just the counter?
  RESOLVED: show news table only, no roster stats during off-season.
- All TBD fields in Playoffs Active and Playoffs Eliminated above — revisit when Isles are in it.
