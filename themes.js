'use strict';

let context = null;
let theme = null;

const THEME_ORDER = ['normal', 'retro', 'cat', 'glossy'];

const THEMES = {
  normal: {
    label: 'DEFAULT',
    blurb: 'Glowing neon arcade.',
    brand: 'BRICK',
    mark: 'B',
    lives: ['◆', '◇'],
    palette: {
      coral: '#ff6487', gold: '#ffcc6d', blue: '#65c9ff', violet: '#ab8cff', cyan: '#68f1e2', green: '#7dff9b',
      orange: '#ff8a3d', pink: '#ff4fd8', red: '#ff5050', lime: '#c6ff5e', teal: '#2fd5b5', white: '#e8eeff'
    },
    bg: ['#111b34', '#0c1429', '#10152b'],
    glowRgb: '71,112,170',
    glowAlpha: 0.12,
    star: '#c4dcff',
    gridStep: 33,
    gridColor: 'rgba(124, 163, 209, 0.055)',
    backdrop: 'stars',
    brick: 'neon',
    paddle: 'neon',
    ball: 'orb',
    capsule: 'ring',
    paddleColors: ['#56c8ef', '#a3fff0', '#6ce4d2'],
    stickyColor: '#ffe9a8',
    paddleGlow: '#68f1e2',
    ballColor: '#fff7dc',
    ballGlow: '#fff2cb',
    iconBg: '#0a1021',
    ink: 'rgba(10, 16, 33, 0.8)',
    font: 'bold 11px "Courier New", monospace',
    netColor: '#68f1e2'
  },
  retro: {
    label: 'RETRO',
    blurb: 'Early-90s arcade cabinet.',
    brand: 'BRICK',
    mark: '▮',
    lives: ['█', '░'],
    palette: {
      coral: '#ff3b3b', gold: '#ffe600', blue: '#3b6bff', violet: '#b44dff', cyan: '#00f0d0', green: '#39ff14',
      orange: '#ff8c00', pink: '#ff3fd0', red: '#ff0033', lime: '#c8ff00', teal: '#00b8a0', white: '#ffffff'
    },
    bg: ['#000000', '#00060a', '#000000'],
    glowRgb: '0,255,120',
    glowAlpha: 0.06,
    star: '#39ff14',
    gridStep: 16,
    gridColor: 'rgba(57, 255, 20, 0.07)',
    backdrop: 'pixel',
    brick: 'pixel',
    paddle: 'pixel',
    ball: 'square',
    capsule: 'square',
    paddleColors: ['#00f0d0', '#00f0d0', '#00f0d0'],
    stickyColor: '#ffe600',
    paddleGlow: '#00f0d0',
    ballColor: '#ffffff',
    ballGlow: '#ffffff',
    iconBg: '#000000',
    ink: 'rgba(0, 0, 0, 0.85)',
    font: 'bold 12px "Courier New", monospace',
    netColor: '#ffe600'
  },
  cat: {
    label: 'FELINE',
    blurb: 'Paw prints, whiskers and yarn.',
    brand: 'BRICK',
    mark: '🐱',
    lives: ['🐾', '○'],
    palette: {
      coral: '#ff8fab', gold: '#ffb347', blue: '#8ecae6', violet: '#b9a3ec', cyan: '#7fe0cf', green: '#a3e67f',
      orange: '#ff9b54', pink: '#ff7eb6', red: '#ff6b6b', lime: '#d4f26d', teal: '#5cc9b6', white: '#fff1e0'
    },
    bg: ['#2c2148', '#231a3b', '#2a1f3f'],
    glowRgb: '255,179,71',
    glowAlpha: 0.1,
    star: '#ffd9a8',
    gridStep: 0,
    gridColor: '',
    backdrop: 'paws',
    brick: 'cat',
    paddle: 'cat',
    ball: 'yarn',
    capsule: 'cat',
    paddleColors: ['#ffc58a', '#ffb36b', '#e8893c'],
    stickyColor: '#ffe0a8',
    paddleGlow: '#ffb36b',
    ballColor: '#ff7eb6',
    ballGlow: '#ffb3d6',
    iconBg: '#2a1f3f',
    ink: 'rgba(43, 25, 50, 0.85)',
    font: 'bold 11px "Trebuchet MS", Arial, sans-serif',
    netColor: '#ffb36b'
  },
  glossy: {
    label: 'GLOSSY',
    blurb: 'Bright, glassy pink and cream.',
    brand: 'BRICK',
    mark: '♥',
    lives: ['♥', '♡'],
    palette: {
      coral: '#ff79ae', gold: '#d9bf73', blue: '#f7b9d3', violet: '#b3547f', cyan: '#e6d6b0', green: '#b09a62',
      orange: '#f29a8c', pink: '#ff5fa2', red: '#e0457b', lime: '#cfc48e', teal: '#c98aa8', white: '#ffffff'
    },
    bg: ['#fffaf6', '#ffe1ee', '#f4e6c6'],
    glowRgb: '255,255,255',
    glowAlpha: 0.7,
    star: '#ff8fbf',
    gridStep: 0,
    gridColor: '',
    backdrop: 'sparkle',
    brick: 'gloss',
    paddle: 'gloss',
    ball: 'bubble',
    capsule: 'gloss',
    paddleColors: ['#ffe3f0', '#ff9cc8', '#e0709f'],
    stickyColor: '#e9d28a',
    paddleGlow: '#ff8fbf',
    ballColor: '#ff5fa2',
    ballGlow: '#ff9cc8',
    iconBg: '#fff6fa',
    ink: 'rgba(110, 20, 70, 0.85)',
    font: 'bold 11px "Trebuchet MS", Arial, sans-serif',
    netColor: '#d9bf73'
  }
};

const STAR_FIELD = Array.from({ length: 55 }, (_, index) => ({
  fx: ((index * 83 + 23) % 480) / 480,
  fy: ((index * 137 + 31) % 640) / 640,
  size: index % 7 === 0 ? 2 : 1,
  alpha: 0.15 + ((index * 19) % 55) / 100
}));

function withContext(ctx, draw) {
  const previous = context;
  context = ctx;
  try {
    draw();
  } finally {
    context = previous;
  }
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const strength = Math.abs(amount);
  const channel = (shift) => {
    const base = (value >> shift) & 255;
    return Math.round(base + (target - base) * strength);
  };
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function itemColor(name) {
  return theme.palette[ITEM_TYPES[name].color];
}

function brickColor(brick) {
  let key = brick.kind;
  if (key === 'steel') key = brick.hits >= 3 ? 'steel' : brick.hits === 2 ? 'reinforced' : 'normal';
  else if (key === 'reinforced') key = brick.hits >= 2 ? 'reinforced' : 'normal';
  return theme.palette[BRICK_TYPES[key].color];
}

// Backdrop -----------------------------------------------------------------

function drawPaw(x, y, size) {
  context.beginPath();
  context.ellipse(x, y + size * 0.45, size * 1.1, size * 0.85, 0, 0, Math.PI * 2);
  context.fill();
  for (const [dx, dy] of [[-1.25, -0.5], [-0.45, -1.2], [0.45, -1.2], [1.25, -0.5]]) {
    context.beginPath();
    context.arc(x + dx * size, y + dy * size, size * 0.4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSparkle(x, y, size) {
  context.beginPath();
  context.moveTo(x, y - size);
  context.quadraticCurveTo(x, y, x + size, y);
  context.quadraticCurveTo(x, y, x, y + size);
  context.quadraticCurveTo(x, y, x - size, y);
  context.quadraticCurveTo(x, y, x, y - size);
  context.fill();
}

function drawBackdrop(width, height, time) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, theme.bg[0]);
  gradient.addColorStop(0.54, theme.bg[1]);
  gradient.addColorStop(1, theme.bg[2]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width / 2, height * 0.28, 20, width / 2, height * 0.36, Math.max(width, height) * 0.6);
  glow.addColorStop(0, `rgba(${theme.glowRgb},${theme.glowAlpha})`);
  glow.addColorStop(1, `rgba(${theme.glowRgb},0)`);
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const big = width > 700 ? 1.6 : 1;
  context.fillStyle = theme.star;
  STAR_FIELD.forEach((star, index) => {
    const x = star.fx * width;
    const y = star.fy * height;
    if (theme.backdrop === 'pixel') {
      context.globalAlpha = Math.floor(time / 450 + index) % 3 === 0 ? 0.95 : 0.35;
      context.fillRect(Math.round(x), Math.round(y), 2 * big, 2 * big);
    } else if (theme.backdrop === 'paws') {
      if (index % 5 !== 0) return;
      context.globalAlpha = 0.08;
      drawPaw(x, y, 3.5 * big);
    } else if (theme.backdrop === 'sparkle') {
      context.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.002 + index));
      drawSparkle(x, y, (2.5 + (index % 3) * 1.8) * big);
    } else {
      context.globalAlpha = star.alpha;
      context.fillRect(x, y, star.size * big, star.size * big);
    }
  });
  context.globalAlpha = 1;

  if (theme.backdrop === 'paws') {
    // Two trails of footprints that light up in sequence as if a cat is walking by.
    const size = 5.5 * big;
    context.fillStyle = theme.star;
    for (const trail of [0, 1]) {
      for (let step = 0; step < 12; step += 1) {
        const t = step / 11;
        const side = step % 2 ? 1 : -1;
        const px = width * (trail ? 0.88 - 0.7 * t : 0.12 + 0.7 * t) + side * 11 * big;
        const py = height * (0.95 - 0.88 * t);
        context.save();
        context.translate(px, py);
        context.rotate(trail ? 0.65 : -0.65);
        context.globalAlpha = 0.05 + 0.25 * Math.max(0, Math.sin(time * 0.002 - step * 0.55 + trail * 3));
        drawPaw(0, 0, size);
        context.restore();
      }
    }
    context.globalAlpha = 1;
  }

  if (theme.gridStep) {
    context.strokeStyle = theme.gridColor;
    context.lineWidth = 1;
    for (let y = theme.gridStep; y < height; y += theme.gridStep) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    if (theme.backdrop === 'pixel') {
      for (let x = theme.gridStep; x < width; x += theme.gridStep) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
    }
  }
}

// Bricks -------------------------------------------------------------------

function drawBrick(brick, alpha = 1) {
  const color = brickColor(brick);
  const { x, y, width, height } = brick;
  context.save();
  context.globalAlpha = alpha;

  if (theme.brick === 'pixel') {
    const px = Math.round(x);
    const py = Math.round(y);
    const pw = Math.round(width);
    context.fillStyle = color;
    context.fillRect(px, py, pw, height);
    context.fillStyle = 'rgba(255, 255, 255, 0.55)';
    context.fillRect(px, py, pw, 2);
    context.fillRect(px, py, 2, height);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(px, py + height - 2, pw, 2);
    context.fillRect(px + pw - 2, py, 2, height);
  } else if (theme.brick === 'cat') {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x + 2, y + 4);
    context.lineTo(x + 4, y - 3);
    context.lineTo(x + 11, y + 1);
    context.moveTo(x + width - 2, y + 4);
    context.lineTo(x + width - 4, y - 3);
    context.lineTo(x + width - 11, y + 1);
    context.fill();
    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, shade(color, 0.12));
    gradient.addColorStop(1, shade(color, -0.18));
    roundedRect(x, y, width, height, 6);
    context.fillStyle = gradient;
    context.fill();
    if (brick.kind !== 'item' && brick.kind !== 'blast') {
      context.fillStyle = 'rgba(43, 25, 50, 0.75)';
      for (const fraction of [0.32, 0.68]) {
        context.beginPath();
        context.arc(x + width * fraction, y + height * 0.55, 1.7, 0, Math.PI * 2);
        context.fill();
      }
      context.beginPath();
      context.moveTo(x + width / 2 - 2, y + height * 0.6);
      context.lineTo(x + width / 2 + 2, y + height * 0.6);
      context.lineTo(x + width / 2, y + height * 0.8);
      context.fill();
    }
    context.strokeStyle = 'rgba(43, 25, 50, 0.4)';
    context.lineWidth = 0.8;
    for (const side of [-1, 1]) {
      for (const tilt of [-2, 2]) {
        const start = side < 0 ? x + 2 : x + width - 2;
        context.beginPath();
        context.moveTo(start, y + height * 0.65);
        context.lineTo(start + side * 5, y + height * 0.65 + tilt);
        context.stroke();
      }
    }
  } else if (theme.brick === 'gloss') {
    context.globalAlpha *= 0.9;
    context.shadowColor = color;
    context.shadowBlur = 9;
    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, shade(color, 0.35));
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, shade(color, -0.25));
    roundedRect(x, y, width, height, 6);
    context.fillStyle = gradient;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    context.lineWidth = 1;
    context.stroke();
    const shine = context.createLinearGradient(x, y, x, y + height * 0.5);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    roundedRect(x + 2, y + 1.5, width - 4, height * 0.45, 4);
    context.fillStyle = shine;
    context.fill();
  } else {
    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + 'a8');
    context.shadowColor = color;
    context.shadowBlur = brick.hits > 1 ? 11 : 7;
    roundedRect(x, y, width, height, 3);
    context.fillStyle = gradient;
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255, 255, 255, 0.26)';
    context.fillRect(x + 4, y + 2, Math.max(5, width - 8), 1);
  }

  if (brick.hits > 1) {
    context.fillStyle = 'rgba(30, 10, 40, 0.32)';
    context.fillRect(x + width / 2 - 1, y + 5, 2, height - 10);
  }
  if (brick.kind === 'item' || brick.kind === 'blast') {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = theme.font;
    context.fillStyle = theme.ink;
    context.fillText(brick.kind === 'item' ? '?' : '✱', x + width / 2, y + height / 2 + 1);
  }
  context.restore();
}

// Bat and ball -------------------------------------------------------------

function drawPaddle(x, y, width, height, sticky) {
  const [left, middle, right] = theme.paddleColors;
  const centre = sticky ? theme.stickyColor : middle;
  context.save();

  if (theme.paddle === 'pixel') {
    const px = Math.round(x);
    const pw = Math.round(width);
    context.fillStyle = sticky ? theme.stickyColor : left;
    context.fillRect(px, y, pw, height);
    context.fillStyle = 'rgba(255, 255, 255, 0.55)';
    context.fillRect(px, y, pw, 2);
    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.fillRect(px, y + height - 2, pw, 2);
    context.fillStyle = theme.palette.coral;
    context.fillRect(px, y, 6, height);
    context.fillRect(px + pw - 6, y, 6, height);
  } else if (theme.paddle === 'cat') {
    context.shadowColor = theme.paddleGlow;
    context.shadowBlur = 10;
    const gradient = context.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, left);
    gradient.addColorStop(0.5, centre);
    gradient.addColorStop(1, right);
    roundedRect(x, y, width, height, 5);
    context.fillStyle = gradient;
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(120, 60, 10, 0.45)';
    for (let stripe = 1; stripe <= 5; stripe += 1) {
      if (stripe === 3) continue;
      context.fillRect(x + (width * stripe) / 6 - 1, y + 1, 2, height - 2);
    }
    context.fillStyle = centre;
    context.beginPath();
    context.moveTo(x + 3, y + 1);
    context.lineTo(x + 5, y - 5);
    context.lineTo(x + 11, y + 1);
    context.moveTo(x + width - 3, y + 1);
    context.lineTo(x + width - 5, y - 5);
    context.lineTo(x + width - 11, y + 1);
    context.fill();
    context.fillStyle = theme.palette.pink;
    context.beginPath();
    context.arc(x + width / 2, y + height / 2, 2.4, 0, Math.PI * 2);
    context.fill();
  } else if (theme.paddle === 'gloss') {
    context.shadowColor = theme.paddleGlow;
    context.shadowBlur = 14;
    const gradient = context.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, right);
    gradient.addColorStop(0.5, sticky ? theme.stickyColor : left);
    gradient.addColorStop(1, right);
    roundedRect(x, y, width, height, height / 2);
    context.fillStyle = gradient;
    context.fill();
    context.shadowBlur = 0;
    roundedRect(x + 4, y + 1, width - 8, height * 0.42, 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.75)';
    context.fill();
  } else {
    context.shadowColor = theme.paddleGlow;
    context.shadowBlur = 18;
    roundedRect(x, y, width, height, 5);
    const gradient = context.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, left);
    gradient.addColorStop(0.5, sticky ? theme.stickyColor : '#a3fff0');
    gradient.addColorStop(1, right);
    context.fillStyle = gradient;
    context.fill();
  }
  context.restore();
}

function drawBall(x, y, onFire = false, radius = BALL_RADIUS) {
  context.save();

  if (onFire) {
    context.shadowColor = '#ff7a1a';
    context.shadowBlur = 22;
    const flame = context.createRadialGradient(x, y, 1, x, y, radius * 1.3);
    flame.addColorStop(0, '#fff3a0');
    flame.addColorStop(0.5, '#ffb02e');
    flame.addColorStop(1, '#ff4d1a');
    context.fillStyle = flame;
    context.beginPath();
    context.arc(x, y, radius * 1.25, 0, Math.PI * 2);
    context.fill();
  } else if (theme.ball === 'square') {
    context.fillStyle = theme.ballColor;
    context.fillRect(Math.round(x - radius), Math.round(y - radius), radius * 2, radius * 2);
  } else if (theme.ball === 'yarn') {
    context.shadowColor = theme.ballGlow;
    context.shadowBlur = 10;
    context.fillStyle = theme.ballColor;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = shade(theme.ballColor, -0.4);
    context.lineWidth = 1;
    context.beginPath();
    context.arc(x, y, radius * 0.65, 0.4, 2.4);
    context.moveTo(x - radius * 0.2 + radius * 0.9, y - radius * 0.2);
    context.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.9, 0, 1.6);
    context.moveTo(x + radius * 0.6, y + radius * 0.7);
    context.quadraticCurveTo(x + radius * 1.7, y + radius * 1.1, x + radius * 1.2, y + radius * 2);
    context.stroke();
  } else if (theme.ball === 'bubble') {
    context.shadowColor = theme.ballGlow;
    context.shadowBlur = 14;
    const bubble = context.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.1, x, y, radius);
    bubble.addColorStop(0, '#ffffff');
    bubble.addColorStop(0.5, theme.ballGlow);
    bubble.addColorStop(1, '#d63384');
    context.fillStyle = bubble;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  } else {
    context.shadowColor = theme.ballGlow;
    context.shadowBlur = 15;
    context.fillStyle = theme.ballColor;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawParticleList(list) {
  const round = theme.ball === 'yarn' || theme.ball === 'bubble';
  for (const particle of list) {
    context.globalAlpha = Math.max(0, particle.life / 22);
    context.fillStyle = particle.color;
    if (round) {
      context.beginPath();
      context.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(particle.x, particle.y, 3, 3);
    }
  }
  context.globalAlpha = 1;
}

// Power-up icons -----------------------------------------------------------

function drawArrow(x, y, direction, size) {
  context.beginPath();
  context.moveTo(x + direction * size, y);
  context.lineTo(x - direction * size * 0.3, y - size * 0.8);
  context.lineTo(x - direction * size * 0.3, y + size * 0.8);
  context.closePath();
  context.fill();
}

function drawHeart(size) {
  context.beginPath();
  context.moveTo(0, size * 0.9);
  context.bezierCurveTo(-size * 1.6, -size * 0.2, -size * 0.7, -size * 1.2, 0, -size * 0.4);
  context.bezierCurveTo(size * 0.7, -size * 1.2, size * 1.6, -size * 0.2, 0, size * 0.9);
  context.fill();
}

function drawCapsule(color, t) {
  context.shadowColor = color;
  context.shadowBlur = 14;
  context.lineWidth = 2;
  context.strokeStyle = color;

  if (theme.capsule === 'square') {
    context.fillStyle = theme.iconBg;
    context.fillRect(-13, -13, 26, 26);
    context.shadowBlur = 0;
    context.strokeStyle = Math.floor(t / 250) % 2 ? color : '#ffffff';
    context.strokeRect(-12, -12, 24, 24);
    return;
  }

  if (theme.capsule === 'cat') {
    context.fillStyle = theme.iconBg;
    context.beginPath();
    context.moveTo(-13, -4);
    context.lineTo(-11, -19);
    context.lineTo(-3, -12);
    context.moveTo(13, -4);
    context.lineTo(11, -19);
    context.lineTo(3, -12);
    context.fill();
    context.stroke();
  }

  context.beginPath();
  context.arc(0, 0, 14, 0, Math.PI * 2);
  context.fillStyle = theme.iconBg;
  context.fill();
  context.shadowBlur = 0;
  if (theme.capsule === 'ring') {
    context.setLineDash([6, 4]);
    context.lineDashOffset = -t * 0.02;
  }
  context.stroke();
  context.setLineDash([]);

  if (theme.capsule === 'gloss') {
    context.beginPath();
    context.ellipse(0, -6.5, 9, 4.5, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fill();
  }
}

// Animated capsule with a glyph that demonstrates the effect.
function drawItemIcon(typeName, x, y, scale, t) {
  const color = itemColor(typeName);
  const wave = Math.sin(t * 0.005);
  const cycle = (t * 0.004) % 1;
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  drawCapsule(color, t);

  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineCap = 'round';

  if (typeName === 'widen' || typeName === 'narrow') {
    const direction = typeName === 'widen' ? 1 : -1;
    const half = 5.5 + direction * wave * 2.5;
    context.fillRect(-half, -2, half * 2, 4);
    drawArrow(-half - 5, 0, -direction, 3);
    drawArrow(half + 5, 0, direction, 3);
  } else if (typeName === 'sticky') {
    const drop = (Math.sin(t * 0.006) + 1) / 2;
    context.fillRect(-8, 5, 16, 3);
    context.beginPath();
    context.arc(0, -5 + drop * 5, 3.2, 0, Math.PI * 2);
    context.fillStyle = '#fff7dc';
    context.fill();
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(0, -1 + drop * 5);
    context.lineTo(0, 5);
    context.stroke();
  } else if (typeName === 'unstick') {
    const bounce = Math.abs(Math.sin(t * 0.006));
    context.fillRect(-8, 6, 16, 3);
    context.beginPath();
    context.arc(0, 1 - bounce * 8, 3.2, 0, Math.PI * 2);
    context.fillStyle = '#fff7dc';
    context.fill();
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-9, -9);
    context.lineTo(9, 9);
    context.stroke();
  } else if (typeName === 'fast' || typeName === 'slow') {
    const fastMode = typeName === 'fast';
    const phase = fastMode ? cycle : (cycle * 0.4) % 1;
    const length = fastMode ? 9 : 4;
    context.lineWidth = 1.5;
    for (let line = 0; line < 3; line += 1) {
      const lineY = -5 + line * 5;
      const shift = fastMode ? phase * 6 : phase * 2;
      context.globalAlpha = fastMode ? 0.9 - phase * 0.5 : 0.55;
      context.beginPath();
      context.moveTo(-1 - length - shift, lineY);
      context.lineTo(-2 - shift, lineY);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(fastMode ? 4 : 3, 0, 3.6, 0, Math.PI * 2);
    context.fillStyle = '#fff7dc';
    context.fill();
  } else if (typeName === 'multi') {
    const spread = (wave + 1) / 2;
    context.fillStyle = '#fff7dc';
    for (const [bx, by] of [[-6 + spread * 2, 4], [6 - spread * 2, 4], [0, -5 - spread * 2]]) {
      context.beginPath();
      context.arc(bx, by, 3.2, 0, Math.PI * 2);
      context.fill();
    }
  } else if (typeName === 'fire') {
    context.scale(1, 1 + 0.1 * Math.sin(t * 0.02));
    context.beginPath();
    context.moveTo(0, -9);
    context.bezierCurveTo(6, -3, 7, 3, 0, 8);
    context.bezierCurveTo(-7, 3, -6, -3, 0, -9);
    context.fill();
    context.fillStyle = '#fff2a8';
    context.beginPath();
    context.moveTo(0, -2);
    context.bezierCurveTo(3, 1, 3, 4, 0, 6);
    context.bezierCurveTo(-3, 4, -3, 1, 0, -2);
    context.fill();
  } else if (typeName === 'net') {
    const bounce = Math.abs(Math.sin(t * 0.006));
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(-9, 6);
    context.lineTo(9, 6);
    for (const nx of [-6, -2, 2, 6]) {
      context.moveTo(nx, 6);
      context.lineTo(nx, 9);
    }
    context.stroke();
    context.beginPath();
    context.arc(0, 2 - bounce * 9, 3.2, 0, Math.PI * 2);
    context.fillStyle = '#fff7dc';
    context.fill();
  } else if (typeName === 'wobble') {
    context.lineWidth = 1.8;
    context.beginPath();
    for (let wx = -9; wx <= 9; wx += 1) {
      const wy = 4 * Math.sin(wx * 0.7 + t * 0.01);
      if (wx === -9) context.moveTo(wx, wy);
      else context.lineTo(wx, wy);
    }
    context.stroke();
    const ballX = -9 + cycle * 18;
    context.beginPath();
    context.arc(ballX, 4 * Math.sin(ballX * 0.7 + t * 0.01), 3, 0, Math.PI * 2);
    context.fillStyle = '#fff7dc';
    context.fill();
  } else if (typeName === 'regrow') {
    context.fillRect(-8, 1, 16, 6);
    context.globalAlpha = 0.25 + cycle * 0.75;
    context.fillRect(-8, -7 + (1 - cycle) * 3, 16, 6);
    context.globalAlpha = 1;
    context.fillStyle = '#fff7dc';
    drawSparkle(8, -8, 2 + cycle * 2);
  } else {
    context.scale(1 + wave * 0.12, 1 + wave * 0.12);
    drawHeart(5.5);
  }
  context.restore();
}
