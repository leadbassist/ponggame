'use strict';

const welcomeEl = document.querySelector('#welcome');
const welcomeCanvas = document.querySelector('#welcome-bg');
const welcomeContext = welcomeCanvas.getContext('2d');
const views = {
  main: document.querySelector('#view-main'),
  scores: document.querySelector('#view-scores'),
  options: document.querySelector('#view-options')
};
const resumeButton = document.querySelector('#welcome-resume');
const scoreList = document.querySelector('#score-list');
const themeList = document.querySelector('#theme-list');

const DEMO_BALLS = 7;
const demo = { balls: [], bricks: [], particles: [], time: 0, last: 0 };

function showView(name) {
  for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
  if (name === 'scores') renderScores();
  if (name === 'options') renderThemes();
  if (name === 'main') resumeButton.hidden = !runActive;
}

function showWelcome() {
  if (state === 'playing') togglePause();
  welcomeOpen = true;
  welcomeEl.hidden = false;
  showView('main');
  resizeDemo();
}

function hideWelcome() {
  welcomeOpen = false;
  welcomeEl.hidden = true;
}

function renderScores() {
  const list = loadScores();
  scoreList.innerHTML = '';
  for (let index = 0; index < 10; index += 1) {
    const entry = list[index];
    const row = document.createElement('li');
    row.innerHTML = entry
      ? `<span>${String(index + 1).padStart(2, '0')}</span><b>${entry.name}</b><i>${formatScore(entry.score)}</i><em>L${entry.level}</em>`
      : `<span>${String(index + 1).padStart(2, '0')}</span><b>---</b><i>------</i><em></em>`;
    scoreList.append(row);
  }
}

function renderThemes() {
  themeList.innerHTML = '';
  for (const name of THEME_ORDER) {
    const t = THEMES[name];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-option' + (name === themeName ? ' is-active' : '');
    const dots = ['coral', 'gold', 'blue', 'green', 'violet']
      .map((key) => `<i style="background:${t.palette[key]}"></i>`).join('');
    button.innerHTML = `<span class="dots">${dots}</span><strong>${t.label}</strong><small>${t.blurb}</small>`;
    button.addEventListener('click', () => {
      applyTheme(name);
      renderThemes();
    });
    themeList.append(button);
  }
}

// Animated background ------------------------------------------------------

function resizeDemo() {
  welcomeCanvas.width = window.innerWidth;
  welcomeCanvas.height = window.innerHeight;
  buildDemoBricks();
  demo.balls = Array.from({ length: DEMO_BALLS }, () => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * welcomeCanvas.width,
      y: welcomeCanvas.height * (0.5 + Math.random() * 0.4),
      dx: Math.cos(angle) * 3.2,
      dy: Math.sin(angle) * 3.2 || 2,
      trail: []
    };
  });
}

function buildDemoBricks() {
  const w = welcomeCanvas.width;
  const bw = 54;
  const bh = 20;
  const cols = Math.floor((w - 40) / (bw + 5));
  const left = (w - cols * (bw + 5) + 5) / 2;
  const rows = Math.max(3, Math.floor((welcomeCanvas.height * 0.55) / (bh + 5)));
  const kinds = ['normal', 'normal', 'normal', 'reinforced', 'steel', 'bonus', 'item', 'blast'];
  demo.bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (Math.random() < 0.28) continue;
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      demo.bricks.push({
        x: left + col * (bw + 5), y: 30 + row * (bh + 5), width: bw, height: bh,
        row, column: col, kind, hits: BRICK_TYPES[kind].hits, born: 0, respawn: 0
      });
    }
  }
}

function demoBurst(x, y, color) {
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    demo.particles.push({ x, y, dx: Math.cos(angle) * 1.5, dy: Math.sin(angle) * 1.5, life: 24, color });
  }
}

function stepDemo(delta) {
  const w = welcomeCanvas.width;
  const h = welcomeCanvas.height;
  for (const ball of demo.balls) {
    ball.x += ball.dx * delta;
    ball.y += ball.dy * delta;
    if (ball.x < 7) { ball.x = 7; ball.dx = Math.abs(ball.dx); }
    if (ball.x > w - 7) { ball.x = w - 7; ball.dx = -Math.abs(ball.dx); }
    if (ball.y < 7) { ball.y = 7; ball.dy = Math.abs(ball.dy); }
    if (ball.y > h - 7) { ball.y = h - 7; ball.dy = -Math.abs(ball.dy); }
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 12) ball.trail.shift();

    for (const brick of demo.bricks) {
      if (brick.hits <= 0) continue;
      const nx = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
      const ny = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
      if ((ball.x - nx) ** 2 + (ball.y - ny) ** 2 > 49) continue;
      if (Math.abs(ball.x - nx) > Math.abs(ball.y - ny)) ball.dx *= -1;
      else ball.dy *= -1;
      brick.hits -= 1;
      demoBurst(ball.x, ball.y, brickColor(brick));
      if (brick.hits <= 0) brick.respawn = demo.time + 4000 + Math.random() * 4000;
      break;
    }
  }
  for (const brick of demo.bricks) {
    if (brick.hits <= 0 && demo.time >= brick.respawn) {
      brick.hits = BRICK_TYPES[brick.kind].hits;
      brick.born = demo.time;
    }
  }
  demo.particles = demo.particles.filter((p) => {
    p.x += p.dx * delta;
    p.y += p.dy * delta;
    p.life -= delta;
    return p.life > 0;
  });
}

function drawDemo() {
  withContext(welcomeContext, () => {
    drawBackdrop(welcomeCanvas.width, welcomeCanvas.height, demo.time);
    for (const brick of demo.bricks) {
      if (brick.hits <= 0) continue;
      drawBrick(brick, Math.min(1, (demo.time - brick.born) / 600));
    }
    drawParticleList(demo.particles);
    for (const ball of demo.balls) {
      welcomeContext.save();
      ball.trail.forEach((p, i) => {
        welcomeContext.globalAlpha = (i / ball.trail.length) * 0.35;
        welcomeContext.fillStyle = theme.ballColor;
        welcomeContext.beginPath();
        welcomeContext.arc(p.x, p.y, 5, 0, Math.PI * 2);
        welcomeContext.fill();
      });
      welcomeContext.restore();
      drawBall(ball.x, ball.y, false, 7);
    }
  });
}

function demoLoop(timestamp) {
  if (welcomeOpen) {
    const delta = demo.last ? Math.min((timestamp - demo.last) / (1000 / 60), 3) : 1;
    demo.time = timestamp;
    stepDemo(delta);
    drawDemo();
  }
  demo.last = timestamp;
  window.requestAnimationFrame(demoLoop);
}

window.addEventListener('resize', () => { if (welcomeOpen) resizeDemo(); });
document.querySelector('#welcome-start').addEventListener('click', () => {
  startNewGame();
  hideWelcome();
});
resumeButton.addEventListener('click', hideWelcome);
document.querySelector('#welcome-scores').addEventListener('click', () => showView('scores'));
document.querySelector('#welcome-options').addEventListener('click', () => showView('options'));
document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => showView('main'));
});

showWelcome();
window.requestAnimationFrame(demoLoop);
