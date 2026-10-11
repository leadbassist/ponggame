'use strict';

const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
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
const gameStatusLabel = document.querySelector('#game-status-label');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_WIDTH = 86;
const PADDLE_HEIGHT = 10;
const PADDLE_Y = HEIGHT - 39;
const BALL_RADIUS = 6;
const STORAGE_KEY = 'neon-breaker-best';
const COLORS = {
  coral: '#ff6487',
  gold: '#ffcc6d',
  blue: '#65c9ff',
  violet: '#ab8cff',
  cyan: '#68f1e2'
};

const stars = Array.from({ length: 55 }, (_, index) => ({
  x: (index * 83 + 23) % WIDTH,
  y: (index * 137 + 31) % HEIGHT,
  size: index % 7 === 0 ? 2 : 1,
  alpha: 0.15 + ((index * 19) % 55) / 100
}));

let state = 'menu';
let score = 0;
let bestScore = loadBestScore();
let level = 1;
let lives = 3;
let newRecord = false;
let paddleX = (WIDTH - PADDLE_WIDTH) / 2;
let ball = { x: WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 1, dx: 0, dy: 0 };
let bricks = [];
let particles = [];
let lastFrame = 0;
const heldKeys = new Set();

function loadBestScore() {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 0;
  } catch (error) {
    console.warn('Unable to read the saved high score.', error);
    return 0;
  }
}

function saveBestScore() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(bestScore));
  } catch (error) {
    console.warn('Unable to save the high score.', error);
  }
}

function createBricks(stage) {
  const columns = 8;
  const rows = Math.min(5 + Math.floor((stage - 1) / 2), 7);
  const sideMargin = 24;
  const gap = 8;
  const brickWidth = (WIDTH - sideMargin * 2 - gap * (columns - 1)) / columns;
  const brickHeight = 17;
  const result = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if ((row * 3 + column * 5 + stage) % 17 === 0) continue;

      const isBonus = (row + column + stage) % 9 === 0;
      const isReinforced = !isBonus && (row + column + stage) % 4 === 0;
      result.push({
        x: sideMargin + column * (brickWidth + gap),
        y: 78 + row * (brickHeight + gap),
        width: brickWidth,
        height: brickHeight,
        hits: isReinforced ? 2 : 1,
        color: isBonus ? COLORS.blue : isReinforced ? COLORS.gold : COLORS.coral,
        points: isBonus ? 150 : isReinforced ? 100 : 50
      });
    }
  }
  return result;
}

function formatScore(value) {
  return String(value).padStart(6, '0');
}

function updateHud() {
  scoreElement.textContent = formatScore(score);
  levelElement.textContent = String(level).padStart(2, '0');
  livesElement.textContent = Array.from({ length: 3 }, (_, index) => index < lives ? '◆' : '◇').join(' ');
  livesElement.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'}`);
  bestElement.textContent = `BEST ${formatScore(bestScore)}`;
}

function showOverlay(eyebrow, title, copy, buttonLabel, visible = true) {
  eyebrowElement.textContent = eyebrow;
  titleElement.innerHTML = title;
  copyElement.innerHTML = copy;
  startButton.firstChild.textContent = buttonLabel;
  overlay.classList.toggle('is-hidden', !visible);
}

function setState(nextState) {
  state = nextState;
  pauseButton.disabled = nextState !== 'playing' && nextState !== 'paused';
  const statusLabels = {
    menu: 'READY',
    ready: 'SERVE',
    playing: 'IN PLAY',
    paused: 'PAUSED',
    levelclear: 'COMPLETE',
    gameover: 'GAME OVER'
  };
  gameStatusLabel.textContent = statusLabels[nextState];

  if (nextState === 'menu') {
    showOverlay('INSERT COIN', 'BREAK<br><span>THE GRID</span>', 'A fresh run. A wall of trouble.<br>How far can you get?', 'START GAME');
  } else if (nextState === 'ready') {
    showOverlay('BALL SERVED', 'BACK<br><span>IN PLAY</span>', 'The next serve is yours.<br>Keep the ball in the air.', 'CONTINUE');
  } else if (nextState === 'paused') {
    showOverlay('GAME PAUSED', 'TAKE A<br><span>BREATHER</span>', 'Your run is right where you left it.', 'RESUME GAME');
  } else if (nextState === 'levelclear') {
    showOverlay('GRID CLEARED', 'NICE<br><span>WORK</span>', `Stage ${String(level).padStart(2, '0')} is clear.<br>The next grid hits harder.`, 'NEXT STAGE');
  } else if (nextState === 'gameover') {
    showOverlay('RUN COMPLETE', 'GAME<br><span>OVER</span>', `Final score: ${formatScore(score)}<br>${newRecord ? 'That is a new personal best.' : 'Ready to beat your best?'}`, 'PLAY AGAIN');
  } else {
    showOverlay('', '', '', '', false);
  }
}

function resetRun() {
  score = 0;
  newRecord = false;
  level = 1;
  lives = 3;
  paddleX = (WIDTH - PADDLE_WIDTH) / 2;
  bricks = createBricks(level);
  particles = [];
  placeBallOnPaddle();
  updateHud();
}

function placeBallOnPaddle() {
  ball = { x: paddleX + PADDLE_WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 1, dx: 0, dy: 0 };
}

function startOrResume() {
  if (state === 'menu' || state === 'gameover') {
    resetRun();
  } else if (state === 'levelclear') {
    level += 1;
    bricks = createBricks(level);
    particles = [];
    placeBallOnPaddle();
    updateHud();
  } else if (state !== 'ready' && state !== 'paused') {
    return;
  }

  const direction = Math.random() < 0.5 ? -1 : 1;
  const speed = Math.min(5.2 + level * 0.25, 7.2);
  ball.dx = direction * speed * 0.48;
  ball.dy = -Math.sqrt(speed * speed - ball.dx * ball.dx);
  setState('playing');
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
  paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, paddleX));
}

function movePaddleFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const scale = WIDTH / bounds.width;
  paddleX = (event.clientX - bounds.left) * scale - PADDLE_WIDTH / 2;
  clampPaddle();

  if (state === 'menu' || state === 'ready' || state === 'levelclear' || state === 'gameover') {
    ball.x = paddleX + PADDLE_WIDTH / 2;
  }
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
  if (state === 'paused') return;
  const paddleDirection = Number(heldKeys.has('ArrowRight') || heldKeys.has('d')) -
    Number(heldKeys.has('ArrowLeft') || heldKeys.has('a'));
  if (!paddleDirection) return;

  paddleX += paddleDirection * 7.5 * delta;
  clampPaddle();
  if (state !== 'playing') {
    ball.x = paddleX + PADDLE_WIDTH / 2;
  }
}

function update(delta) {
  const previousX = ball.x;
  const previousY = ball.y;
  ball.x += ball.dx * delta;
  ball.y += ball.dy * delta;

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
    ball.x - BALL_RADIUS <= paddleX + PADDLE_WIDTH
  ) {
    const offset = (ball.x - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
    const speed = Math.min(Math.hypot(ball.dx, ball.dy) * 1.025, 8.2);
    const angle = offset * 1.05;
    ball.dx = Math.sin(angle) * speed;
    ball.dy = -Math.cos(angle) * speed;
    ball.y = PADDLE_Y - BALL_RADIUS;
  }

  if (ball.y - BALL_RADIUS > HEIGHT) {
    lives -= 1;
    updateHud();
    if (lives <= 0) {
      setState('gameover');
    } else {
      placeBallOnPaddle();
      setState('ready');
    }
    return;
  }

  for (let index = bricks.length - 1; index >= 0; index -= 1) {
    const brick = bricks[index];
    if (!circleHitsRectangle(ball, brick)) continue;

    const crossedVerticalFace =
      previousY + BALL_RADIUS <= brick.y || previousY - BALL_RADIUS >= brick.y + brick.height;
    if (crossedVerticalFace) {
      ball.dy *= -1;
    } else {
      ball.dx *= -1;
    }

    brick.hits -= 1;
    burst(ball.x, ball.y, brick.color);
    if (brick.hits <= 0) {
      addScore(brick.points);
      bricks.splice(index, 1);
    } else {
      brick.color = COLORS.coral;
    }
    break;
  }

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.dx * delta;
    particle.y += particle.dy * delta;
    particle.life -= delta;
    if (particle.life <= 0) particles.splice(index, 1);
  }

  if (bricks.length === 0) {
    setState('levelclear');
  }
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#111b34');
  gradient.addColorStop(0.54, '#0c1429');
  gradient.addColorStop(1, '#10152b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = context.createRadialGradient(WIDTH / 2, 180, 20, WIDTH / 2, 230, 390);
  glow.addColorStop(0, 'rgba(71, 112, 170, 0.12)');
  glow.addColorStop(1, 'rgba(9, 14, 30, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of stars) {
    context.globalAlpha = star.alpha;
    context.fillStyle = '#c4dcff';
    context.fillRect(star.x, star.y, star.size, star.size);
  }
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(124, 163, 209, 0.055)';
  context.lineWidth = 1;
  for (let y = 33; y < HEIGHT; y += 33) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
}

function drawBricks() {
  for (const brick of bricks) {
    const gradient = context.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
    gradient.addColorStop(0, brick.color);
    gradient.addColorStop(1, brick.color + 'a8');
    context.save();
    context.shadowColor = brick.color;
    context.shadowBlur = brick.hits > 1 ? 11 : 7;
    roundedRect(brick.x, brick.y, brick.width, brick.height, 3);
    context.fillStyle = gradient;
    context.fill();
    context.restore();

    context.fillStyle = 'rgba(255, 255, 255, 0.26)';
    context.fillRect(brick.x + 4, brick.y + 2, Math.max(5, brick.width - 8), 1);
    if (brick.hits > 1) {
      context.fillStyle = 'rgba(79, 47, 15, 0.42)';
      context.fillRect(brick.x + brick.width / 2 - 1, brick.y + 5, 2, brick.height - 10);
    }
  }
}

function drawPaddleAndBall() {
  context.save();
  context.shadowColor = COLORS.cyan;
  context.shadowBlur = 18;
  roundedRect(paddleX, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT, 5);
  const paddleGradient = context.createLinearGradient(paddleX, PADDLE_Y, paddleX + PADDLE_WIDTH, PADDLE_Y);
  paddleGradient.addColorStop(0, '#56c8ef');
  paddleGradient.addColorStop(0.5, '#a3fff0');
  paddleGradient.addColorStop(1, '#6ce4d2');
  context.fillStyle = paddleGradient;
  context.fill();
  context.restore();

  context.save();
  context.shadowColor = '#fff2cb';
  context.shadowBlur = 15;
  context.beginPath();
  context.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  context.fillStyle = '#fff7dc';
  context.fill();
  context.restore();
}

function drawParticles() {
  for (const particle of particles) {
    context.globalAlpha = Math.max(0, particle.life / 22);
    context.fillStyle = particle.color;
    context.fillRect(particle.x, particle.y, 3, 3);
  }
  context.globalAlpha = 1;
}

function render() {
  drawBackground();
  drawBricks();
  drawParticles();
  drawPaddleAndBall();
}

function animate(timestamp) {
  const delta = lastFrame ? Math.min((timestamp - lastFrame) / (1000 / 60), 2) : 1;
  lastFrame = timestamp;
  movePaddleWithKeys(delta);
  if (state === 'playing') update(delta);
  render();
  window.requestAnimationFrame(animate);
}

function handleKeyDown(event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
  heldKeys.add(key);

  if (key === ' ' && !event.repeat) {
    if (state === 'playing' || state === 'paused') togglePause();
    else startOrResume();
  }
  if (key === 'Escape' && (state === 'playing' || state === 'paused')) togglePause();
}

function handleKeyUp(event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  heldKeys.delete(key);
}

canvas.addEventListener('pointermove', movePaddleFromPointer);
canvas.addEventListener('pointerdown', (event) => {
  movePaddleFromPointer(event);
  if (state === 'playing' && canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
});
overlay.addEventListener('pointerdown', (event) => {
  if (event.target === overlay) startOrResume();
});
startButton.addEventListener('click', startOrResume);
pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', () => {
  resetRun();
  setState('menu');
});
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', () => heldKeys.clear());

bricks = createBricks(level);
updateHud();
setState('menu');
window.requestAnimationFrame(animate);
