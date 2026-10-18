'use strict';

const canvas = document.querySelector('#game');
const mainContext = canvas.getContext('2d');
context = mainContext;
const scoreElement = document.querySelector('#score');
const levelElement = document.querySelector('#level');
const livesElement = document.querySelector('#lives');
const bestElement = document.querySelector('#best-score');
const overlay = document.querySelector('#overlay');
const eyebrowElement = document.querySelector('#overlay-eyebrow');
const titleElement = document.querySelector('#overlay-title');
const copyElement = document.querySelector('#overlay-copy');
const startButton = document.querySelector('#start-button');
const pauseButton = document.querySelector('#pause-button');
const restartButton = document.querySelector('#restart-button');
const menuButton = document.querySelector('#menu-button');
const gameStatusLabel = document.querySelector('#game-status-label');
const godPanel = document.querySelector('#god-panel');
const guideButton = document.querySelector('#guide-button');
const guideModal = document.querySelector('#guide');
const guideList = document.querySelector('#guide-list');
const guideClose = document.querySelector('#guide-close');
const entryBox = document.querySelector('#entry');
const entryInput = document.querySelector('#entry-input');
const wordmarkIcon = document.querySelector('.wordmark-icon');
const brandElement = document.querySelector('#brand-a');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const BASE_PADDLE_WIDTH = 86;
const PADDLE_HEIGHT = 10;
const PADDLE_Y = HEIGHT - 39;
const NET_Y = PADDLE_Y + PADDLE_HEIGHT + 5;
const BALL_RADIUS = 6;
const BASE_BALL_SPEED = 5.8;
const MAX_LIVES = 5;
const MAX_BALLS = 3;
const TOTAL_LEVELS = 50;
const FIRE_DURATION = 480;
const ITEM_FALL_SPEED = 1.6;
const ITEM_WIDTH = 30;
const ITEM_HEIGHT = 15;
const BRICK_GAP = 4;
const SIDE_MARGIN = 20;
const BRICK_HEIGHT = 16;
const GRID_TOP = 60;
const STORAGE_KEY = 'neon-breaker-best';
const SCORES_KEY = 'neon-breaker-scores';
const THEME_KEY = 'neon-breaker-theme';

const BRICK_TYPES = {
  normal: { hits: 1, color: 'coral', points: 50 },
  reinforced: { hits: 2, color: 'gold', points: 100 },
  steel: { hits: 3, color: 'violet', points: 200 },
  bonus: { hits: 1, color: 'blue', points: 150 },
  item: { hits: 1, color: 'green', points: 75 },
  blast: { hits: 1, color: 'orange', points: 100 }
};

// Good power-ups first, then bad ones. `color` is a theme palette key.
const ITEM_TYPES = {
  widen: { name: 'Wider Bat', good: true, color: 'cyan', weight: 20, info: 'Your bat gets 20% bigger. Cancels Smaller Bat. Only works once.' },
  sticky: { name: 'Sticky Bat', good: true, color: 'gold', weight: 20, info: 'The ball sticks to your bat. Press SPACE to let go.' },
  slow: { name: 'Slower Ball', good: true, color: 'blue', weight: 20, info: 'The ball is 20% slower. Cancels Faster Ball. Only works once.' },
  multi: { name: 'Extra Ball', good: true, color: 'green', weight: 20, info: 'Adds another ball (up to 3). You lose a life only when ALL balls are missed.' },
  fire: { name: 'Fireball', good: true, color: 'red', weight: 14, info: 'The ball burns straight through bricks without bouncing for 8 seconds.' },
  net: { name: 'Safety Net', good: true, color: 'lime', weight: 14, info: 'A net appears under the bat and saves one missed ball.' },
  life: { name: 'Extra Life', good: true, color: 'pink', weight: 4, info: 'A rare heart that gives you one more life.' },
  narrow: { name: 'Smaller Bat', good: false, color: 'coral', weight: 20, info: 'Your bat gets 20% smaller. Cancels Wider Bat. Only works once.' },
  fast: { name: 'Faster Ball', good: false, color: 'orange', weight: 20, info: 'The ball is 20% faster. Cancels Slower Ball. Only works once.' },
  unstick: { name: 'Unstick Bat', good: false, color: 'violet', weight: 20, info: 'Removes the Sticky Bat power-up and lets go of a stuck ball.' },
  wobble: { name: 'Ball Wobble', good: false, color: 'teal', weight: 16, info: 'The ball curves and wobbles through the air.' },
  regrow: { name: 'Brick Regrow', good: false, color: 'white', weight: 16, info: 'Up to 3 broken bricks grow back.' }
};

// Game state --------------------------------------------------------------

let state = 'intro';
let score = 0;
let bestScore = loadBestScore();
let level = 1;
let lives = 3;
let newRecord = false;
let runActive = false;
let pendingEnd = 'gameover';
let welcomeOpen = false;
let paddleWidth = BASE_PADDLE_WIDTH;
let paddleX = (WIDTH - paddleWidth) / 2;

function makeBall(x = paddleX + paddleWidth / 2, dx = 0, dy = 0) {
  return { x, y: PADDLE_Y - BALL_RADIUS - 1, dx, dy, stuck: false, stickOffset: 0 };
}

let balls = [makeBall(WIDTH / 2)];
let bricks = [];
let destroyedLog = [];
let items = [];
let particles = [];
let lastFrame = 0;
const effects = { width: 0, speed: 0, sticky: 0, fire: 0, net: 0, wobble: 0 };
let animTime = 0;
let guideCanvases = [];
let themeName = 'normal';
const heldKeys = new Set();
const GOD_CODE = 'godmode';
let godMode = false;
let codeBuffer = '';

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('Unable to read saved data.', error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Unable to save data.', error);
  }
}

function loadBestScore() {
  const saved = Number(readStorage(STORAGE_KEY));
  return Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 0;
}

function saveBestScore() {
  writeStorage(STORAGE_KEY, String(bestScore));
}

function loadScores() {
  try {
    const list = JSON.parse(readStorage(SCORES_KEY) || '[]');
    return Array.isArray(list)
      ? list.filter((entry) => entry && Number.isFinite(entry.score)).slice(0, 10)
      : [];
  } catch (error) {
    return [];
  }
}

function qualifiesForScores(value) {
  const list = loadScores();
  return list.length < 10 || value > list[list.length - 1].score;
}

function saveScore(entry) {
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  writeStorage(SCORES_KEY, JSON.stringify(list.slice(0, 10)));
}

function loadTheme() {
  const saved = readStorage(THEME_KEY);
  return THEMES[saved] ? saved : 'normal';
}

function applyTheme(name) {
  themeName = THEMES[name] ? name : 'normal';
  theme = THEMES[themeName];
  document.body.dataset.theme = themeName;
  for (const [key, value] of Object.entries(theme.palette)) {
    document.documentElement.style.setProperty(`--c-${key}`, value);
  }
  wordmarkIcon.textContent = theme.mark;
  brandElement.textContent = theme.brand;
  const welcomeBrand = document.querySelector('#welcome-brand');
  if (welcomeBrand) welcomeBrand.textContent = theme.brand;
  writeStorage(THEME_KEY, themeName);
  updateHud();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Level construction ------------------------------------------------------

function brickKindAt(row, column, stage) {
  const h = (column * 7 + row * 11 + stage * 3) % 20;
  if (h <= 1) return 'item';
  if (h === 2) return 'blast';
  if (h <= 4) return 'reinforced';
  if (h === 5) return 'steel';
  if (h === 6) return 'bonus';
  return 'normal';
}

function createBricks(stage) {
  const grid = LEVEL_GRIDS[(stage - 1) % LEVEL_GRIDS.length];
  const brickWidth = (WIDTH - SIDE_MARGIN * 2 - BRICK_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const result = [];

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      if (!grid[row][column]) continue;
      const kind = brickKindAt(row, column, stage);
      result.push({
        x: SIDE_MARGIN + column * (brickWidth + BRICK_GAP),
        y: GRID_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width: brickWidth,
        height: BRICK_HEIGHT,
        row,
        column,
        kind,
        hits: BRICK_TYPES[kind].hits,
        points: BRICK_TYPES[kind].points
      });
    }
  }
  assignDrops(result);
  return result;
}

function weightedPick(names) {
  let roll = Math.random() * names.reduce((sum, name) => sum + ITEM_TYPES[name].weight, 0);
  for (const name of names) {
    roll -= ITEM_TYPES[name].weight;
    if (roll < 0) return name;
  }
  return names[0];
}

function setBrickKind(brick, kind) {
  Object.assign(brick, { kind, hits: BRICK_TYPES[kind].hits, points: BRICK_TYPES[kind].points });
}

// Every stage gets an even number of item bricks: half drop good items, half bad.
function assignDrops(result) {
  const itemBricks = result.filter((brick) => brick.kind === 'item');
  const normals = result.filter((brick) => brick.kind === 'normal');
  while (itemBricks.length < 4 && normals.length) {
    const brick = normals.splice(Math.floor(normals.length / 2), 1)[0];
    setBrickKind(brick, 'item');
    itemBricks.push(brick);
  }
  if (itemBricks.length % 2 === 1) setBrickKind(itemBricks.pop(), 'normal');

  const good = Object.keys(ITEM_TYPES).filter((name) => ITEM_TYPES[name].good);
  const bad = Object.keys(ITEM_TYPES).filter((name) => !ITEM_TYPES[name].good);
  const drops = [];
  for (let index = 0; index < itemBricks.length / 2; index += 1) {
    drops.push(weightedPick(good), weightedPick(bad));
  }
  for (let index = drops.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [drops[index], drops[swap]] = [drops[swap], drops[index]];
  }
  itemBricks.forEach((brick, index) => { brick.drop = drops[index]; });
}

function loadLevel(stage) {
  bricks = createBricks(stage);
  destroyedLog = [];
}

// HUD and overlays --------------------------------------------------------

function formatScore(value) {
  return String(value).padStart(6, '0');
}

function updateHud() {
  scoreElement.textContent = formatScore(score);
  levelElement.textContent = String(level).padStart(2, '0');
  const icons = theme ? theme.lives : ['◆', '◇'];
  livesElement.textContent = Array.from({ length: Math.max(3, lives) }, (_, index) => icons[index < lives ? 0 : 1]).join(' ');
  livesElement.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'}`);
  bestElement.textContent = `BEST ${formatScore(bestScore)}`;
}

function showOverlay(eyebrow, title, copy, buttonLabel, visible = true) {
  eyebrowElement.textContent = eyebrow;
  titleElement.innerHTML = title;
  copyElement.innerHTML = copy;
  startButton.firstChild.textContent = buttonLabel;
  entryBox.hidden = true;
  overlay.classList.toggle('is-hidden', !visible);
}

function setState(nextState) {
  state = nextState;
  pauseButton.disabled = nextState !== 'playing' && nextState !== 'paused';
  const statusLabels = {
    intro: 'READY',
    ready: 'SERVE',
    playing: 'IN PLAY',
    paused: 'PAUSED',
    levelclear: 'COMPLETE',
    entry: 'HIGH SCORE',
    gameover: 'GAME OVER',
    won: 'VICTORY'
  };
  gameStatusLabel.textContent = statusLabels[nextState];
  const recordLine = newRecord ? 'That is a new personal best.' : 'Ready to beat your best?';

  if (nextState === 'intro') {
    showOverlay('GET READY', `STAGE<br><span>${String(level).padStart(2, '0')}</span>`, 'Move the bat with ← → or A D.<br>Press SPACE to launch.', 'LAUNCH');
  } else if (nextState === 'ready') {
    showOverlay('BALL SERVED', 'BACK<br><span>IN PLAY</span>', 'The next serve is yours.<br>Keep the ball in the air.', 'CONTINUE');
  } else if (nextState === 'paused') {
    showOverlay('GAME PAUSED', 'TAKE A<br><span>BREATHER</span>', 'Your run is right where you left it.', 'RESUME GAME');
  } else if (nextState === 'levelclear') {
    showOverlay('GRID CLEARED', 'NICE<br><span>WORK</span>', `Stage ${String(level).padStart(2, '0')} is clear.<br>A new grid awaits.`, 'NEXT STAGE');
  } else if (nextState === 'entry') {
    showOverlay('NEW HIGH SCORE', 'TOP<br><span>TEN!</span>', `Score ${formatScore(score)}<br>Enter your 3 initials:`, 'SAVE');
    entryBox.hidden = false;
    entryInput.value = '';
    entryInput.focus();
  } else if (nextState === 'gameover') {
    showOverlay('RUN COMPLETE', 'GAME<br><span>OVER</span>', `Final score: ${formatScore(score)}<br>${recordLine}`, 'PLAY AGAIN');
  } else if (nextState === 'won') {
    showOverlay('ALL 50 STAGES CLEAR', 'YOU<br><span>WIN!</span>', `You beat every grid!<br>Final score: ${formatScore(score)}<br>${recordLine}`, 'PLAY AGAIN');
  } else {
    showOverlay('', '', '', '', false);
  }
}

function finishRun(endState) {
  runActive = false;
  pendingEnd = endState;
  setState(score > 0 && qualifiesForScores(score) ? 'entry' : endState);
}

function submitEntry() {
  if (state !== 'entry') return;
  const name = entryInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, '-');
  saveScore({ name, score, level });
  setState(pendingEnd);
}

// Items and effects -------------------------------------------------------

function currentSpeed() {
  return BASE_BALL_SPEED * (effects.speed > 0 ? 1.2 : effects.speed < 0 ? 0.8 : 1);
}

function refreshPaddleWidth() {
  const centre = paddleX + paddleWidth / 2;
  paddleWidth = BASE_PADDLE_WIDTH * (effects.width > 0 ? 1.2 : effects.width < 0 ? 0.8 : 1);
  paddleX = centre - paddleWidth / 2;
  clampPaddle();
}

function clearEffects() {
  for (const key of Object.keys(effects)) effects[key] = 0;
  items = [];
  refreshPaddleWidth();
}

function spawnItem(x, y, type) {
  items.push({ x, y, type });
}

function addBall() {
  if (balls.length >= MAX_BALLS) return;
  const speed = currentSpeed();
  const dx = (balls.length % 2 === 0 ? 1 : -1) * speed * 0.45;
  balls.push(makeBall(paddleX + paddleWidth / 2, dx, -Math.sqrt(speed * speed - dx * dx)));
}

function releaseBalls() {
  const speed = currentSpeed();
  for (const ball of balls) {
    if (!ball.stuck) continue;
    const offset = (ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
    let angle = offset * 1.05;
    if (Math.abs(angle) < 0.15) angle = (angle < 0 || (angle === 0 && Math.random() < 0.5) ? -1 : 1) * 0.15;
    ball.dx = Math.sin(angle) * speed;
    ball.dy = -Math.cos(angle) * speed;
    ball.stuck = false;
  }
}

function regrowBricks(count) {
  const free = destroyedLog.filter((spot) =>
    !bricks.some((brick) => brick.row === spot.row && brick.column === spot.column) &&
    !balls.some((ball) => circleHitsRectangle(ball, {
      x: spot.x - 8, y: spot.y - 8, width: spot.width + 16, height: spot.height + 16
    })));
  for (let index = free.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [free[index], free[swap]] = [free[swap], free[index]];
  }
  for (const spot of free.slice(0, count)) {
    destroyedLog.splice(destroyedLog.indexOf(spot), 1);
    bricks.push({ ...spot, kind: 'normal', hits: 1, points: BRICK_TYPES.normal.points });
    burst(spot.x + spot.width / 2, spot.y + spot.height / 2, theme.palette.white);
  }
}

// Increase/decrease effects are capped at one step each way and cancel each other out.
function applyItem(type) {
  if (type === 'life') {
    lives = Math.min(MAX_LIVES, lives + 1);
    updateHud();
  } else if (type === 'sticky') {
    effects.sticky = 1;
  } else if (type === 'unstick') {
    effects.sticky = 0;
    releaseBalls();
  } else if (type === 'multi') {
    addBall();
  } else if (type === 'fire') {
    effects.fire = FIRE_DURATION;
  } else if (type === 'net') {
    effects.net = 1;
  } else if (type === 'wobble') {
    effects.wobble = 1;
  } else if (type === 'regrow') {
    regrowBricks(3);
  } else if (type === 'widen' || type === 'narrow') {
    effects.width = clamp(effects.width + (type === 'widen' ? 1 : -1), -1, 1);
    refreshPaddleWidth();
  } else if (type === 'fast' || type === 'slow') {
    effects.speed = clamp(effects.speed + (type === 'fast' ? 1 : -1), -1, 1);
  }
}

function updateItems(delta) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    item.y += ITEM_FALL_SPEED * delta;
    const caught =
      item.y + ITEM_HEIGHT / 2 >= PADDLE_Y &&
      item.y - ITEM_HEIGHT / 2 <= PADDLE_Y + PADDLE_HEIGHT &&
      item.x + ITEM_WIDTH / 2 >= paddleX &&
      item.x - ITEM_WIDTH / 2 <= paddleX + paddleWidth;
    if (caught) {
      applyItem(item.type);
      burst(item.x, item.y, itemColor(item.type));
      items.splice(index, 1);
    } else if (item.y - ITEM_HEIGHT > HEIGHT) {
      items.splice(index, 1);
    }
  }
}

// Run control -------------------------------------------------------------

function resetRun() {
  score = 0;
  newRecord = false;
  level = 1;
  lives = 3;
  paddleX = (WIDTH - paddleWidth) / 2;
  clearEffects();
  loadLevel(level);
  particles = [];
  placeBallOnPaddle();
  updateHud();
}

function startNewGame() {
  resetRun();
  runActive = true;
  setState('intro');
}

function placeBallOnPaddle() {
  balls = [makeBall()];
}

function startOrResume() {
  if (state === 'paused') {
    togglePause();
    return;
  }
  if (state === 'gameover' || state === 'won') {
    startNewGame();
    return;
  }
  if (state === 'levelclear') {
    if (level >= TOTAL_LEVELS) return;
    level += 1;
    loadLevel(level);
    particles = [];
    placeBallOnPaddle();
    updateHud();
  } else if (state !== 'ready' && state !== 'intro') {
    return;
  }

  const direction = Math.random() < 0.5 ? -1 : 1;
  const speed = currentSpeed();
  balls[0].dx = direction * speed * 0.48;
  balls[0].dy = -Math.sqrt(speed * speed - balls[0].dx * balls[0].dx);
  setState('playing');
}

function releaseBall() {
  if (state === 'playing') releaseBalls();
}

function completeLevel() {
  clearEffects();
  if (level >= TOTAL_LEVELS) finishRun('won');
  else setState('levelclear');
}

function togglePause() {
  if (state === 'playing') {
    setState('paused');
  } else if (state === 'paused') {
    setState('playing');
  }
}

function addScore(points) {
  score += points;
  if (score > bestScore) {
    bestScore = score;
    newRecord = true;
    saveBestScore();
  }
  updateHud();
}

function clampPaddle() {
  paddleX = Math.max(0, Math.min(WIDTH - paddleWidth, paddleX));
}

function circleHitsRectangle(circle, rectangle) {
  const nearestX = Math.max(rectangle.x, Math.min(circle.x, rectangle.x + rectangle.width));
  const nearestY = Math.max(rectangle.y, Math.min(circle.y, rectangle.y + rectangle.height));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS;
}

function burst(x, y, color) {
  for (let index = 0; index < 7; index += 1) {
    const angle = (Math.PI * 2 * index) / 7;
    const speed = 0.7 + (index % 3) * 0.45;
    particles.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      life: 22,
      color
    });
  }
}

function movePaddleWithKeys(delta) {
  if (state === 'paused' || welcomeOpen) return;
  const paddleDirection = Number(heldKeys.has('ArrowRight') || heldKeys.has('d')) -
    Number(heldKeys.has('ArrowLeft') || heldKeys.has('a'));
  if (!paddleDirection) return;

  paddleX += paddleDirection * 7.5 * delta;
  clampPaddle();
  if (state !== 'playing') {
    balls[0].x = paddleX + paddleWidth / 2;
  }
}

// Simulation --------------------------------------------------------------

function destroyBrick(brick) {
  const index = bricks.indexOf(brick);
  if (index === -1) return;
  bricks.splice(index, 1);
  destroyedLog.push({ x: brick.x, y: brick.y, width: brick.width, height: brick.height, row: brick.row, column: brick.column });
  addScore(brick.points);
  burst(brick.x + brick.width / 2, brick.y + brick.height / 2, brickColor(brick));

  if (brick.drop) {
    spawnItem(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.drop);
  }
  if (brick.kind === 'blast') {
    for (const other of bricks.slice()) {
      if (Math.abs(other.row - brick.row) <= 1 && Math.abs(other.column - brick.column) <= 1) {
        destroyBrick(other);
      }
    }
  }
}

// Returns false when the ball has fallen out of play.
function moveBall(ball, delta) {
  const speed = currentSpeed();
  if (effects.wobble) {
    const turn = Math.sin(animTime * 0.006 + ball.x * 0.02) * 0.035 * delta;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    [ball.dx, ball.dy] = [ball.dx * cos - ball.dy * sin, ball.dx * sin + ball.dy * cos];
  }
  const magnitude = Math.hypot(ball.dx, ball.dy) || speed;
  ball.dx = (ball.dx / magnitude) * speed;
  ball.dy = (ball.dy / magnitude) * speed;
  const minVertical = speed * 0.25;
  if (Math.abs(ball.dy) < minVertical) {
    ball.dy = (ball.dy > 0 ? 1 : -1) * minVertical;
    ball.dx = (ball.dx < 0 ? -1 : 1) * Math.sqrt(speed * speed - minVertical * minVertical);
  }

  const previousY = ball.y;
  ball.x += ball.dx * delta;
  ball.y += ball.dy * delta;

  if (effects.fire > 0 && Math.random() < 0.5) {
    particles.push({
      x: ball.x, y: ball.y, dx: (Math.random() - 0.5) * 0.6, dy: (Math.random() - 0.5) * 0.6,
      life: 16, color: theme.palette.red
    });
  }

  if (ball.x < BALL_RADIUS) {
    ball.x = BALL_RADIUS;
    ball.dx = Math.abs(ball.dx);
  } else if (ball.x > WIDTH - BALL_RADIUS) {
    ball.x = WIDTH - BALL_RADIUS;
    ball.dx = -Math.abs(ball.dx);
  }
  if (ball.y < BALL_RADIUS) {
    ball.y = BALL_RADIUS;
    ball.dy = Math.abs(ball.dy);
  }

  if (
    ball.dy > 0 &&
    previousY + BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT &&
    ball.y + BALL_RADIUS >= PADDLE_Y &&
    ball.x + BALL_RADIUS >= paddleX &&
    ball.x - BALL_RADIUS <= paddleX + paddleWidth
  ) {
    ball.y = PADDLE_Y - BALL_RADIUS - 1;
    if (effects.sticky > 0) {
      ball.stuck = true;
      ball.stickOffset = clamp(ball.x - paddleX, 0, paddleWidth);
      ball.dx = 0;
      ball.dy = 0;
      return true;
    }
    const offset = (ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
    const angle = offset * 1.05;
    ball.dx = Math.sin(angle) * speed;
    ball.dy = -Math.cos(angle) * speed;
  }

  if (effects.net && ball.dy > 0 && ball.y + BALL_RADIUS >= NET_Y) {
    ball.y = NET_Y - BALL_RADIUS;
    ball.dy = -Math.abs(ball.dy);
    effects.net = 0;
    burst(ball.x, NET_Y, theme.netColor);
  }

  if (ball.y - BALL_RADIUS > HEIGHT) return false;

  for (const brick of bricks.slice()) {
    if (!bricks.includes(brick) || !circleHitsRectangle(ball, brick)) continue;

    if (effects.fire > 0) {
      destroyBrick(brick);
      continue;
    }

    const crossedVerticalFace =
      previousY + BALL_RADIUS <= brick.y || previousY - BALL_RADIUS >= brick.y + brick.height;
    if (crossedVerticalFace) {
      ball.dy *= -1;
    } else {
      ball.dx *= -1;
    }

    brick.hits -= 1;
    if (brick.hits <= 0) {
      destroyBrick(brick);
    } else {
      burst(ball.x, ball.y, brickColor(brick));
    }
    break;
  }
  return true;
}

function loseLife() {
  if (!godMode) lives -= 1;
  clearEffects();
  updateHud();
  if (lives <= 0) {
    finishRun('gameover');
  } else {
    placeBallOnPaddle();
    setState('ready');
  }
}

function update(delta) {
  if (effects.fire > 0) effects.fire = Math.max(0, effects.fire - delta);
  for (const ball of balls) {
    if (ball.stuck) {
      ball.stickOffset = Math.min(ball.stickOffset, paddleWidth);
      ball.x = paddleX + ball.stickOffset;
      ball.y = PADDLE_Y - BALL_RADIUS - 1;
    }
  }
  balls = balls.filter((ball) => ball.stuck || moveBall(ball, delta));
  if (balls.length === 0) {
    loseLife();
    return;
  }

  updateItems(delta);
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.dx * delta;
    particle.y += particle.dy * delta;
    particle.life -= delta;
    if (particle.life <= 0) particles.splice(index, 1);
  }

  if (bricks.length === 0) completeLevel();
}

// Rendering ---------------------------------------------------------------

function drawNet() {
  context.save();
  context.fillStyle = theme.netColor;
  context.globalAlpha = 0.9;
  if (theme.brick !== 'pixel') {
    context.shadowColor = theme.netColor;
    context.shadowBlur = 10;
  }
  context.fillRect(8, NET_Y, WIDTH - 16, 3);
  context.globalAlpha = 0.35;
  for (let x = 14; x < WIDTH - 10; x += 12) context.fillRect(x, NET_Y + 3, 1, 5);
  context.restore();
}

function drawEffects() {
  const active = [];
  if (effects.width) active.push(effects.width > 0 ? 'widen' : 'narrow');
  if (effects.speed) active.push(effects.speed > 0 ? 'fast' : 'slow');
  if (effects.sticky) active.push('sticky');
  if (effects.fire > 0) active.push('fire');
  if (effects.net) active.push('net');
  if (effects.wobble) active.push('wobble');
  active.forEach((name, index) => drawItemIcon(name, 14 + index * 22, HEIGHT - 11, 0.6, animTime));
}

function render() {
  drawBackdrop(WIDTH, HEIGHT, animTime);
  for (const brick of bricks) drawBrick(brick);
  if (effects.net) drawNet();
  for (const item of items) drawItemIcon(item.type, item.x, item.y, 1, animTime + item.x * 7);
  drawParticleList(particles);
  drawPaddle(paddleX, PADDLE_Y, paddleWidth, PADDLE_HEIGHT, effects.sticky > 0);
  for (const ball of balls) drawBall(ball.x, ball.y, effects.fire > 0);
  drawEffects();
}

function animate(timestamp) {
  animTime = timestamp;
  const delta = lastFrame ? Math.min((timestamp - lastFrame) / (1000 / 60), 2) : 1;
  lastFrame = timestamp;
  if (!welcomeOpen) {
    movePaddleWithKeys(delta);
    if (state === 'playing') update(delta);
    render();
  }
  if (!guideModal.hidden) renderGuide();
  window.requestAnimationFrame(animate);
}

// Power-ups guide ---------------------------------------------------------

function buildGuide() {
  guideCanvases = Object.entries(ITEM_TYPES).map(([name, type]) => {
    const row = document.createElement('div');
    row.className = 'guide-row';
    const icon = document.createElement('canvas');
    icon.width = 64;
    icon.height = 64;
    const text = document.createElement('div');
    const tag = type.good ? '<span class="tag tag-good">GOOD</span>' : '<span class="tag tag-bad">BAD</span>';
    text.innerHTML = `<strong>${type.name}</strong> ${tag}<p>${type.info}</p>`;
    row.append(icon, text);
    guideList.append(row);
    return { name, ctx: icon.getContext('2d') };
  });
}

function renderGuide() {
  for (const { name, ctx } of guideCanvases) {
    ctx.clearRect(0, 0, 64, 64);
    withContext(ctx, () => drawItemIcon(name, 32, 34, 1.5, animTime));
  }
}

function setGuideOpen(open) {
  guideModal.hidden = !open;
  if (open && state === 'playing') togglePause();
}

// Input -------------------------------------------------------------------

function handleKeyDown(event) {
  if (event.target instanceof HTMLInputElement) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!guideModal.hidden) {
    if (key === 'Escape') setGuideOpen(false);
    return;
  }

  // Secret: type "godmode" to toggle; while on, N completes the stage.
  if (key.length === 1 && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
    codeBuffer = (codeBuffer + key).slice(-GOD_CODE.length);
    if (codeBuffer === GOD_CODE) {
      godMode = !godMode;
      godPanel.hidden = !godMode;
      codeBuffer = '';
    }
  }

  if (welcomeOpen) {
    if (key === 'Escape') showView('main');
    return;
  }

  if (['ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
  heldKeys.add(key);

  if (godMode && key === 'n' && !event.repeat && state === 'playing') {
    completeLevel();
    return;
  }

  if (key === ' ' && !event.repeat && state !== 'entry') {
    if (state === 'playing' && balls.some((ball) => ball.stuck)) releaseBall();
    else if (state === 'playing' || state === 'paused') togglePause();
    else startOrResume();
  }
  if ((key === 'Escape' || key === 'p') && !event.repeat && (state === 'playing' || state === 'paused')) togglePause();
}

function handleKeyUp(event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  heldKeys.delete(key);
}

overlay.addEventListener('pointerdown', (event) => {
  if (event.target === overlay && state !== 'entry') startOrResume();
});
startButton.addEventListener('click', () => {
  if (state === 'entry') submitEntry();
  else startOrResume();
});
entryInput.addEventListener('input', () => {
  entryInput.value = entryInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});
entryInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') submitEntry();
});
pauseButton.addEventListener('click', togglePause);
guideButton.addEventListener('click', () => setGuideOpen(true));
guideClose.addEventListener('click', () => setGuideOpen(false));
guideModal.addEventListener('pointerdown', (event) => {
  if (event.target === guideModal) setGuideOpen(false);
});
restartButton.addEventListener('click', startNewGame);
menuButton.addEventListener('click', () => showWelcome());
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', () => heldKeys.clear());

applyTheme(loadTheme());
resetRun();
buildGuide();
setState('intro');
window.requestAnimationFrame(animate);
