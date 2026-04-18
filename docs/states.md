# State System

The top section of index.html is a state renderer. JS detects the current state and swaps
the entire top section content, background color, and audio. Detection runs on page load.

---

## Season State Priority Order

```
1. Playoff game scheduled today (gameType 03)       → Outside In
2. clinchIndicator = "e" for NYI                    → Sorover
3. clinchIndicator = "x" / "y" / "z" for NYI       → Clinched
4. Preseason (gameType 01) active                   → Pre-season + counter  [TODO]
5. Live game in progress (gameState LIVE / CRIT)    → Live (scoreboard)
6. Game today, not started (gameState FUT / PRE)    → Pre-game
7. Game today, final (gameState OFF / FINAL)        → Win / Loss / Loser Point
8. No game today, regular season                    → Persist last Win/Loss state
9. No games in API                                  → Off-season (counter only)  [TODO]
```

---

## State Specs

| State       | Background | Image                        | Text                                  | Audio                        | Fades? |
|-------------|------------|------------------------------|---------------------------------------|------------------------------|--------|
| Outside In  | #000000    | now_im_on_the_outside.png    | "OUTSIDE IN" (link to playoffs.html)  | None                         | No     |
| Sorover     | #2bae66    | sorover.png                  | "IT'S SOROVER"                        | only posers fall in love.mp3 | Yes    |
| Clinched    | #000000    | roblox engvall.png           | "Clinched."                           | None                         | Yes    |
| Pre-season  | TBD        | TBD                          | Counter + regular layout              | TBD                          | Yes    |
| Live        | #000000    | None (scoreboard layout)     | See response-text.md                  | TBD                          | Yes    |
| Pre-game    | #000000    | TBD                          | "Game today."                         | TBD                          | Yes    |
| Win         | #000000    | lee.png (30% width)          | See response-text.md                  | TBD                          | Yes    |
| Loss        | #000000    | pov_sasha_daet_tebe_L.png    | See response-text.md                  | TBD                          | Yes    |
| Off-season  | #000000    | None                         | "Days until preseason: X"             | None                         | Yes    |

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

---

## Open Decisions

- Background color and image for pregame / preseason states
- Audio files for win / loss / live / preseason states
- Whether to rotate multiple win/loss images randomly
- Does off-season state show the persistent section (news/roster) or just the counter?
  RESOLVED: show news table only, no roster stats during off-season.
