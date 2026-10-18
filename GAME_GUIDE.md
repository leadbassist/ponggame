# Brick Breaker — Developer Guide

A single-page, keyboard-controlled brick breaker game with 50 levels, 12 power-ups, a hidden god mode, a high-score table and four visual themes. This document is the one-stop reference for how the game works and how to change it.

---

## 1. Overview

| Item | Value |
|---|---|
| Name | Brick Breaker |
| Tech | Vanilla HTML + CSS + JavaScript, HTML5 `<canvas>` (2D) |
| Libraries / frameworks | **None.** No npm, no bundler, no build step |
| Run it | Open `index.html` in a browser (double-click works; no server needed) |
| Persistence | Browser `localStorage` |
| Input | Keyboard only (mouse and touch cannot move the bat) |
| Levels | 50. Clearing stage 50 wins the game |
| Ball speed | Constant. It never speeds up as you progress |

There are no dependencies. The only browser features relied on are Canvas 2D (including `CanvasRenderingContext2D.roundRect`), `localStorage`, `requestAnimationFrame`, CSS custom properties and `backdrop-filter`. A recent Chrome, Edge, Firefox or Safari is required.

---

## 2. File layout

```
index.html    Markup: game area, welcome screen (menu / scores / tabbed options), god panel
style.css     All page styling, incl. per-theme CSS overrides (body[data-theme=...])
levels.js     The 50 level layouts (grid data only)
themes.js     Theme definitions + ALL canvas drawing code (bricks, bat, ball, icons, backdrop)
script.js     Game logic: state, physics, power-ups, scoring, input, high-score storage, guide
welcome.js    Welcome screen, High Scores / Options views, animated demo, BOOT CODE
favicon.png   Tab icon
```

### Script load order (important)

`index.html` loads four classic (non-module) scripts, in this order:

1. `levels.js`
2. `themes.js`
3. `script.js`
4. `welcome.js`

Classic scripts share one global scope, so files use each other's top-level `const`/`let`/`function` names directly. Rules that follow from this:

- Don't redeclare a global in another file (for example `context`, `theme`, `roundedRect` live only in `themes.js`).
- Cross-file references are resolved at **call time**, so a function in an earlier file may use data from a later one as long as it runs after all scripts load.
- Code that runs at load time can only use things from files already loaded. `welcome.js` is last on purpose, because it contains the **boot code** (it calls `showWelcome()` and starts the demo loop, which need everything else).
- Each file begins with `'use strict'`.

---

## 3. Architecture

### 3.1 Main loop (`script.js`)

`animate(timestamp)` runs on `requestAnimationFrame`:

1. Compute `delta` = elapsed time in 60 fps frames (capped at 2 so a lag spike can't tunnel the ball).
2. Unless the welcome screen is open (`welcomeOpen`): move the bat from held keys, run `update(delta)` if `state === 'playing'`, and `render()`.
3. If the power-ups guide is open, redraw its animated icons.

`welcome.js` has a separate loop, `demoLoop`, which only does work while `welcomeOpen` is true. So only one of the two loops draws at a time.

### 3.2 Game states

`state` is one of:

| State | Meaning | Overlay shown |
|---|---|---|
| `intro` | New game / start of run, stage intro | "GET READY – STAGE nn", LAUNCH |
| `ready` | Ball lost, waiting for serve | "BACK IN PLAY", CONTINUE |
| `playing` | Simulation running | none |
| `paused` | Paused | "TAKE A BREATHER", RESUME |
| `levelclear` | Stage cleared | "NICE WORK", NEXT STAGE |
| `entry` | Typing high-score initials | "TOP TEN!", input + SAVE |
| `gameover` | Out of lives | "GAME OVER", PLAY AGAIN |
| `won` | Stage 50 cleared | "YOU WIN!", PLAY AGAIN |

`setState(next)` updates the status label, enables/disables the Pause button and rewrites the overlay. `startOrResume()` is the single handler for "Space / click the overlay button" and branches on the current state.

### 3.3 Rendering

The canvas is 480×640 logical pixels (CSS scales it). `render()` draws, in order: backdrop → bricks → safety net → falling items → particles → bat → balls → active-effect badges along the bottom.

All draw functions live in `themes.js` and read the active `theme` object, so switching theme mid-game just changes how the next frame is drawn. They draw to the global `context`. `withContext(ctx, fn)` temporarily swaps that global so the same functions can draw on another canvas (the welcome background and the power-up guide icons).

Bricks do **not** store a color. `brickColor(brick)` derives it from the brick's kind, remaining hits and the current theme palette, which is what makes live theme switching work.

### 3.4 Coordinate and layout constants (`script.js`)

| Constant | Value | Notes |
|---|---|---|
| `WIDTH` × `HEIGHT` | 480 × 640 | from the canvas |
| `BASE_PADDLE_WIDTH` | 86 | bat width before effects |
| `PADDLE_HEIGHT`, `PADDLE_Y` | 10, `HEIGHT-39` | |
| `BALL_RADIUS` | 6 | |
| `BASE_BALL_SPEED` | 5.8 | px per 60 fps frame; the **only** speed |
| `MAX_LIVES` | 5 | extra lives are capped here |
| `MAX_BALLS` | 3 | |
| `TOTAL_LEVELS` | 50 | |
| `FIRE_DURATION` | 480 frames (~8 s) | |
| `ITEM_FALL_SPEED` | 1.6 | |
| `BRICK_HEIGHT`, `BRICK_GAP`, `SIDE_MARGIN`, `GRID_TOP` | 16, 4, 20, 60 | |
| `NET_Y` | `PADDLE_Y + PADDLE_HEIGHT + 5` | Safety Net height |

---

## 4. Gameplay

### 4.1 Rules

- You start with **3 lives**. Missing the ball (or, with several balls, missing *all* of them) costs one life.
- Clear every brick to finish the stage. All effects and falling items are cleared when a stage ends or a life is lost.
- Clear stage 50 to win. Running out of lives ends the run.
- Ball speed is constant (5.8). Only the Faster/Slower Ball power-ups change it (±20%), temporarily.

### 4.2 Controls

| Key | Action |
|---|---|
| `←` / `→` or `A` / `D` | Move bat |
| `Space` | Launch the ball / start; release a stuck ball (Sticky Bat); otherwise pause/resume |
| `P` or `Esc` | Pause / resume |
| `Esc` (menus) | Back to the welcome main menu; from the main menu, back to the running game |
| `M` | Open the menu (pauses the game) |
| `Enter` | Confirm initials in the high-score box |
| Typing `godmode` | Toggle god mode (see section 8) |

The bat follows keys only. The old mouse/touch handlers were removed on purpose.

Hitting the ball with different parts of the bat changes its angle (center = straight up, edges = up to ~1.05 rad). Wobble, bat reflection and speed normalisation all keep the ball's speed at exactly the current speed.

### 4.3 Scoring

Points per brick are listed below; the score is `000000` formatted. A **best score** (single number) is saved separately from the high-score table.

### 4.4 Brick types (`BRICK_TYPES`)

| Kind | Hits | Points | Base color key | Behavior |
|---|---|---|---|---|
| `normal` | 1 | 50 | coral | Standard |
| `reinforced` | 2 | 100 | gold | Changes to a normal-looking brick after 1 hit |
| `steel` ("Armored") | 3 | 200 | violet | Fades through reinforced → normal as it's hit |
| `bonus` | 1 | 150 | blue | Extra points |
| `item` | 1 | 75 | green | Marked "?"; drops a power-up when destroyed |
| `blast` | 1 | 100 | orange | Marked "✱"; destroys all bricks in the surrounding 3×3 cells (chain reactions possible) |

Brick kinds are placed by `brickKindAt(row, column, stage)`, a deterministic hash, so a stage's brick-type pattern is repeatable. Which items drop is random per play.

### 4.5 Levels (`levels.js`)

- A level is a 12 × 12 grid (`GRID_COLUMNS`, `GRID_ROWS`) of 0/1 values (1 = brick present).
- `LEVEL_GRIDS` has exactly 50 entries: `interleave(ASCII_ART.map(gridFromAscii), SHAPES.map(gridFromShape))`.
  - `ASCII_ART` — 25 hand-drawn pixel-art shapes (smiley, ice cream, tennis racket, etc.), written as 12-character strings where `#` is a brick.
  - `SHAPES` — 25 shapes generated by math functions (diamonds, rings, checkerboards, waves, two-block layouts, corner squares, etc.) via `gridFromShape`.
  - `interleave` alternates the two lists so stages mix styles.
- All 50 are unique, including when mirrored or flipped. Difficulty does **not** rise with the stage; only the shape changes.
- To add or change a level, edit the arrays in `levels.js`. If you change the count, update `TOTAL_LEVELS` in `script.js` and any "50 stages" text in `index.html`/`script.js`.

Verification script idea: load `levels.js`, check `LEVEL_GRIDS.length === 50` and that no grid equals another (also compare reversed rows/columns).

---

## 5. Power-ups

Some `item` bricks drop a falling capsule. The bat must catch it. Effects last **until the stage is completed or a life is lost** (Fireball is timed to ~8 s). Falling items are cleared at the same moments.

### 5.1 Balance rule

`assignDrops(bricks)` guarantees every stage has an **even number of item bricks (min. 4)**, with **exactly half assigned a good drop and half a bad drop**. If a stage naturally has fewer than 4 item bricks, normal bricks are converted; if the count is odd, one is turned back to normal. Within the good or bad pool, a type is chosen by `weight`. Drops are shuffled across the item bricks.

### 5.2 Stacking and caps

`effects = { width, speed, sticky, fire, net, wobble }`. Width and speed are `-1 | 0 | 1`:

- **One step each way only.** Two Wider Bats do not stack; the bat is just +20%.
- **Opposites cancel.** Wider + Smaller returns to normal. Faster + Slower returns to normal.
- Different kinds stack freely (for example Wider + Sticky + Fireball).

### 5.3 The 12 power-ups (`ITEM_TYPES`)

| Key | Name | Good/Bad | Weight | Effect |
|---|---|---|---|---|
| `widen` | Wider Bat | Good | 20 | Bat +20% width (once) |
| `sticky` | Sticky Bat | Good | 20 | Ball sticks to the bat; press Space to release; it re-sticks on return |
| `slow` | Slower Ball | Good | 20 | Ball speed −20% (once) |
| `multi` | Extra Ball | Good | 20 | Adds a ball, max 3. A life is lost only when **all** balls are missed |
| `fire` | Fireball | Good | 14 | ~8 s: ball destroys bricks without bouncing; leaves a flame trail |
| `net` | Safety Net | Good | 14 | A net under the bat bounces one missed ball back, then disappears |
| `life` | Extra Life | Good | 4 | +1 life (max 5). Rare |
| `narrow` | Smaller Bat | Bad | 20 | Bat −20% width (once) |
| `fast` | Faster Ball | Bad | 20 | Ball speed +20% (once) |
| `unstick` | Unstick Bat | Bad | 20 | Removes Sticky Bat and releases any stuck ball |
| `wobble` | Ball Wobble | Bad | 16 | Ball path curves/wobbles |
| `regrow` | Brick Regrow | Bad | 16 | Up to 3 destroyed bricks grow back as normal bricks |

Each entry has `name`, `good`, `color` (a **palette key**, not a hex value), `weight` and `info` (the text shown in the guide).

### 5.4 Implementation notes

- `applyItem(type)` is the single switch that applies a caught power-up.
- **Speed:** `currentSpeed()` = `5.8 × (1.2 | 0.8 | 1)`. Every ball move renormalises velocity to this speed, so speed can never drift.
- **Fireball:** `moveBall` calls `destroyBrick` for every brick it touches and skips the bounce. `effects.fire` is a frame counter reduced by `delta`.
- **Safety Net:** when `effects.net` is set and a ball moving down reaches `NET_Y`, it bounces and `effects.net` is cleared.
- **Wobble:** each frame the velocity vector is rotated by `sin(time*0.006 + x*0.02) * 0.035 * delta`, then renormalised.
- **Regrow:** `destroyedLog` records destroyed brick positions (reset on level load). Regrow picks up to 3 spots, skipping spots that are already occupied or within 8 px of a ball.
- **Sticky:** a stuck ball keeps a `stickOffset` along the bat so it moves with it. `releaseBalls()` launches it at an angle based on that offset.
- **Extra ball:** balls live in the `balls` array. `loseLife()` is called only when the array becomes empty.
- Active effects are drawn as small icons along the bottom of the canvas (`drawEffects`). Cancelled pairs vanish because the effect value is 0.

### 5.5 Power-ups guide

The **POWER-UPS** tab in Options lists all 12 with an animated icon, a GOOD/BAD tag and the `info` text. It is built from `ITEM_TYPES`, so a new power-up appears there automatically. Icons are drawn with `drawItemIcon` into 64×64 canvases, redrawn each frame while the tab is visible.

### 5.6 Adding a new power-up

1. Add an entry to `ITEM_TYPES` in `script.js` (good ones before bad ones keeps the guide ordered). Use a palette key for `color`.
2. Handle it in `applyItem` (and in `update` / `moveBall` / `render` if it needs per-frame logic).
3. Reset it in `clearEffects` (add a field to `effects`).
4. Add a drawing branch for its animated icon in `drawItemIcon` (`themes.js`).
5. Re-check the good/bad balance (it's automatic as long as `good` is set).

---

## 6. Screens and UI

### 6.1 Welcome screen (`#welcome`, `welcome.js`)

Shown on load and when you press **M** during a game. It sits above the game and has an animated background canvas (`#welcome-bg`): about 7 balls with trails bounce off the walls and a field of random bricks drawn in the current theme. Hits reduce brick hits, spawn particles, and destroyed bricks respawn after 4–8 s with a fade-in. It re-lays out on window resize.

Buttons: **Start Game** (starts a fresh run, so this is also how you restart), **High Scores**, **Options**, plus **Resume Game** (only shown when a run is active). The sub-views (`#view-main`, `#view-scores`, `#view-options`) are toggled by `showView(name)`. `Esc` goes back to the main view, and from the main view returns to a running game. Opening the welcome screen from a running game pauses it.

**Options** is a vertical list of buttons. Clicking one opens just that section (`showOptionsSection` in `welcome.js`); BACK or `Esc` returns to the list, and again to the main menu:

| Section | Content |
|---|---|
| THEME | The four theme cards |
| CONTROLS | Mission text and all keys |
| BRICKS | Brick legend (swatches use the `--c-*` theme colors) and tips |
| POWER-UPS | The animated power-up guide (`#guide-list`, built from `ITEM_TYPES`) |

### 6.2 Main game screen

Only the game area is shown, with nothing around it: the "machine" containing the status label, HUD (score, stage, lives), the canvas with its overlay, and the best score. It is sized to fit the window height. The **god panel** appears only when god mode is on (see section 8). There are no on-screen buttons; use **M** for the menu and **P/Esc** to pause.

The overlay (`#overlay`) is a single card whose text is rewritten by `setState`. Clicking it (pointerdown on the dimmed area) or pressing Space starts/resumes.

### 6.3 HUD

`updateHud()` writes score, stage and lives. Lives use the theme's two glyphs (filled and empty) — ◆/◇, █/░, 🐾/○ or ♥/♡. At least 3 slots are always shown.

---

## 7. High scores and settings

### 7.1 High scores

- Stored under `localStorage['neon-breaker-scores']` as a JSON array of `{ name, score, level }`, sorted descending, max 10 entries.
- After **every** run (win or lose) `finishRun(endState)` checks whether `score > 0` **and** the score makes the top 10 (`qualifiesForScores`). If so the state becomes `entry`: the player types 3 characters (A–Z, 0–9; auto-uppercased; padded with `-`), then presses **SAVE** or Enter (`submitEntry`). Afterwards the normal game-over / win screen shows.
- If the score doesn't qualify (or is 0), initials aren't asked.
- The **High Scores** view (`renderScores`) always shows 10 rows, using `---` for empty slots, with the score and the level reached.
- A separate key `neon-breaker-best` stores the single best score shown in the footer of the game panel.
- The key names still contain the original working title `neon-breaker`; keeping them preserves existing players' saved data.

### 7.2 Options / themes

The **Options** view lists the themes as buttons with palette dots, a name and a one-line description. Selecting one calls `applyTheme(name)`, which saves it to `localStorage['neon-breaker-theme']` and restores it on the next load. Switching works mid-game.

| Key | Label in Options | Look |
|---|---|---|
| `normal` | **DEFAULT** | Glowing neon on a dark blue starfield; rounded glowing bricks, orb ball |
| `retro` | **RETRO** | Early-90s arcade: black background, green/yellow, hard pixel bricks, square ball, scanlines, no rounded corners, flickering pixel stars |
| `cat` | **FELINE** | Warm orange/brown with a purple field. Bricks are cat heads (ears, eyes, nose, whiskers); bat has ears; yarn-ball; trails of paw prints in the game; paw-print page pattern; 🐾 on the logo and menu buttons |
| `glossy` | **GLOSSY** | Bright: off-white, pink and khaki background, glassy blurred panels, shiny pill buttons, semi-transparent glossy bricks, bubble ball, sparkles |

The game name is **BRICK BREAKER** in every theme.

### 7.3 How a theme is applied

`applyTheme(name)` (in `script.js`):

1. Sets `theme = THEMES[name]` (used by all canvas drawing).
2. Sets `document.body.dataset.theme` (activates CSS rules `body[data-theme='...']` in `style.css`).
3. Writes each palette entry to a CSS variable `--c-<key>` on `<html>` (the legend swatches use these).
4. Updates the logo icon (`theme.mark`) and brand word (`theme.brand`) in the header and welcome title.
5. Saves the choice and refreshes the HUD.

### 7.4 Theme object reference (`THEMES` in `themes.js`)

Each theme defines:

| Field | Purpose |
|---|---|
| `label`, `blurb`, `brand`, `mark` | Option title/description, brand word, logo glyph |
| `lives` | `[filled, empty]` HUD glyphs |
| `palette` | 12 named colors: coral, gold, blue, violet, cyan, green, orange, pink, red, lime, teal, white |
| `bg`, `glowRgb`, `glowAlpha`, `star`, `gridStep`, `gridColor`, `backdrop` | Backdrop gradient, glow, stars, grid lines and the backdrop style (`stars`, `pixel`, `paws`, `sparkle`) |
| `brick`, `paddle`, `ball`, `capsule` | Which drawing style each element uses (for example `neon`, `pixel`, `cat`, `gloss`; ball: `orb`, `square`, `yarn`, `bubble`) |
| `paddleColors`, `stickyColor`, `paddleGlow`, `ballColor`, `ballGlow`, `netColor` | Colors for bat, ball, net |
| `iconBg`, `ink`, `font` | Icon background, text color on bricks/icons, canvas font |

`BRICK_TYPES[...].color` and `ITEM_TYPES[...].color` hold **palette keys**; themes turn them into real colors.

### 7.5 Adding a theme

1. Add an entry to `THEMES` and its key to `THEME_ORDER` in `themes.js`.
2. If it needs new looks, add branches in `drawBrick`, `drawPaddle`, `drawBall`, `drawCapsule`, and `drawBackdrop` for new `brick`/`paddle`/`ball`/`capsule`/`backdrop` values (unrecognised values fall back to the default neon style).
3. Add `body[data-theme='yourkey'] { ... }` overrides in `style.css` for the page chrome (buttons, panels, welcome screen).

---

## 8. God mode (developer/testing feature)

A hidden mode for the owner. There is no UI button.

- **Toggle:** type `godmode` on the keyboard (any time, even on the welcome screen). Typing it again turns it off.
- **Effects while on:** unlimited lives (lives never decrease), and **`N`** completes the current stage instantly (then Space for the next).
- It stays on across levels and restarts until turned off.
- A pink panel (`#god-panel`, bottom-left of the page) lists the abilities and how to turn it off.
- Implementation: `godMode` flag and `codeBuffer` in `script.js` (`GOD_CODE`), checked in `handleKeyDown` and in `loseLife` / the `N` shortcut.
- Scores earned in god mode still count toward high scores.

---

## 9. Persistence summary

| localStorage key | Content |
|---|---|
| `neon-breaker-scores` | Top-10 array `[{ name, score, level }]` |
| `neon-breaker-best` | Best score (number) |
| `neon-breaker-theme` | Selected theme key |

Access is wrapped in `readStorage` / `writeStorage` with try/catch, so the game still runs if storage is blocked (for example private mode).

---

## 10. Code map (`script.js`)

| Area | Functions |
|---|---|
| Storage | `readStorage`, `writeStorage`, `loadBestScore`, `saveBestScore`, `loadScores`, `qualifiesForScores`, `saveScore`, `loadTheme`, `applyTheme` |
| Level building | `brickKindAt`, `createBricks`, `weightedPick`, `setBrickKind`, `assignDrops`, `loadLevel` |
| HUD / overlay | `updateHud`, `showOverlay`, `setState`, `finishRun`, `submitEntry`, `formatScore` |
| Items / effects | `currentSpeed`, `refreshPaddleWidth`, `clearEffects`, `spawnItem`, `addBall`, `releaseBalls`, `regrowBricks`, `applyItem`, `updateItems` |
| Run control | `resetRun`, `startNewGame`, `placeBallOnPaddle`, `startOrResume`, `completeLevel`, `togglePause`, `addScore`, `loseLife` |
| Simulation | `movePaddleWithKeys`, `moveBall`, `destroyBrick`, `circleHitsRectangle`, `burst`, `update` |
| Render | `drawNet`, `drawEffects`, `render`, `animate` |
| Guide | `buildGuide`, `renderGuide` |
| Input | `handleKeyDown`, `handleKeyUp`, DOM listeners at the bottom |

### `themes.js`

`withContext`, `shade`, `roundedRect`, `itemColor`, `brickColor`, `drawPaw`, `drawSparkle`, `drawBackdrop`, `drawBrick`, `drawPaddle`, `drawBall`, `drawParticleList`, `drawArrow`, `drawHeart`, `drawCapsule`, `drawItemIcon`.

### `welcome.js`

`showView`, `showWelcome`, `hideWelcome`, `renderScores`, `renderThemes`, `resizeDemo`, `buildDemoBricks`, `stepDemo`, `drawDemo`, `demoLoop`, and the boot code at the end of the file.

---

## 11. Physics details

- **Ball vs walls:** reflected on left, right and top; falling past the bottom removes the ball.
- **Ball vs bat:** only when moving down and crossing the bat's top edge; outgoing angle depends on where it hits.
- **Ball vs bricks:** circle-vs-rectangle test; the bounce axis is chosen by whether the previous Y position was clearly above/below the brick (vertical face) or not (side face). One brick is handled per frame per ball (except with Fireball).
- **Minimum vertical speed:** a ball can't travel nearly horizontally; `dy` is clamped to at least 25% of the speed so levels can't stall.
- **Frame-rate independence:** movement is scaled by `delta` (normalised to 60 fps, capped at 2).

---

## 12. Testing and verification

There is no test framework. Useful checks:

- Syntax: `node --check levels.js` (repeat for `themes.js`, `script.js`, `welcome.js`).
- Levels: load `levels.js` in Node and assert 50 grids and uniqueness (see section 4.5).
- Drop balance: build each stage's bricks and assert equal numbers of good and bad drops.
- Manual: open `index.html`, switch every theme, play a stage, catch every power-up from the guide, turn god mode on and press `N` through stage 50 to see the win screen and the initials prompt.

---

## 13. Known limitations and design decisions

- Keyboard only: touch devices cannot move the bat.
- Initials are asked only when the score is above 0 and makes the top 10.
- The `neon-breaker-*` storage keys and the internal title in code comments reflect the original name; only the user-visible name changed.
- No sound.
- No automated tests or build tooling.
