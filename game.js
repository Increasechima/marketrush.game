const START_NG = 'https://start.ng';
const GAME_NAME = 'market-rush-neon';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  score: document.getElementById('score'),
  streak: document.getElementById('streak'),
  time: document.getElementById('time'),
  title: document.getElementById('title-panel'),
  help: document.getElementById('help-panel'),
  over: document.getElementById('over-panel'),
  start: document.getElementById('start'),
  again: document.getElementById('again'),
  showBoard: document.getElementById('show-board'),
  overTitle: document.getElementById('over-title'),
  overSummary: document.getElementById('over-summary'),
  saveStatus: document.getElementById('save-status'),
  board: document.getElementById('leaderboard'),
  refreshBoard: document.getElementById('refresh-board'),
  face: document.getElementById('player-face'),
  name: document.getElementById('player-name'),
  account: document.getElementById('player-account'),
  signin: document.getElementById('signin')
};

const defaultStyle = {
  body: 'female',
  primaryColor: '#30d5c8',
  secondaryColor: '#ff5d73',
  skinColor: '#8d5524',
  hairColor: '#17120f',
  hair: 'braids',
  hat: 'cap',
  accessory: 'backpack'
};

let framePromise;
let player = {
  id: null,
  name: 'Guest',
  account: '',
  style: defaultStyle,
  face: ''
};
let signedIn = false;

const game = {
  mode: 'title',
  width: 1280,
  height: 800,
  dpr: 1,
  t: 0,
  last: 0,
  elapsed: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  energy: 100,
  speed: 300,
  slowmo: 0,
  spawnSpark: 0,
  spawnHazard: 0,
  spawnGate: 3.5,
  shake: 0,
  player: { x: 0.5, y: 0.76, vx: 0, vy: 0, hurt: 0 },
  items: [],
  keys: new Set(),
  pointer: { active: false, x: 0, y: 0 }
};

function connectFrame() {
  framePromise ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return framePromise;
}

async function askStartNg(message, replyType, timeoutMs = 4500) {
  try {
    const el = await connectFrame();
    return await new Promise((resolve) => {
      const requestId = Math.random().toString(36).slice(2);
      const done = (reply) => {
        clearTimeout(timer);
        removeEventListener('message', onMessage);
        resolve(reply);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      function onMessage(e) {
        if (e.origin !== START_NG || e.source !== el.contentWindow) return;
        if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
      }
      addEventListener('message', onMessage);
      el.contentWindow.postMessage({ ...message, requestId }, START_NG);
    });
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function cleanColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
}

function normalizeStyle(style) {
  return {
    ...defaultStyle,
    ...(style || {}),
    primaryColor: cleanColor(style?.primaryColor, defaultStyle.primaryColor),
    secondaryColor: cleanColor(style?.secondaryColor, defaultStyle.secondaryColor),
    skinColor: cleanColor(style?.skinColor, defaultStyle.skinColor),
    hairColor: cleanColor(style?.hairColor, defaultStyle.hairColor)
  };
}

function drawFaceToCanvas(size, style) {
  const face = document.createElement('canvas');
  face.width = size;
  face.height = size;
  const c = face.getContext('2d');
  c.fillStyle = '#102126';
  c.fillRect(0, 0, size, size);
  c.fillStyle = style.primaryColor;
  c.beginPath();
  c.arc(size * 0.5, size * 0.5, size * 0.46, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = style.secondaryColor;
  c.beginPath();
  c.arc(size * 0.5, size * 0.62, size * 0.38, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = style.skinColor;
  c.beginPath();
  c.arc(size * 0.5, size * 0.44, size * 0.23, 0, Math.PI * 2);
  c.fill();
  drawHair(c, size * 0.5, size * 0.34, size * 0.6, style);
  drawHat(c, size * 0.5, size * 0.26, size * 0.52, style);
  c.fillStyle = '#161616';
  c.beginPath();
  c.arc(size * 0.42, size * 0.43, size * 0.025, 0, Math.PI * 2);
  c.arc(size * 0.58, size * 0.43, size * 0.025, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#27180f';
  c.lineWidth = Math.max(2, size * 0.018);
  c.beginPath();
  c.arc(size * 0.5, size * 0.49, size * 0.09, 0.1, Math.PI - 0.1);
  c.stroke();
  if (style.accessory === 'glasses') {
    c.strokeStyle = '#f6f1e7';
    c.lineWidth = size * 0.025;
    c.strokeRect(size * 0.35, size * 0.38, size * 0.12, size * 0.09);
    c.strokeRect(size * 0.53, size * 0.38, size * 0.12, size * 0.09);
    c.beginPath();
    c.moveTo(size * 0.47, size * 0.42);
    c.lineTo(size * 0.53, size * 0.42);
    c.stroke();
  }
  return face;
}

function drawHair(c, x, y, scale, style) {
  c.fillStyle = style.hairColor;
  const hair = style.hair;
  if (hair === 'bald') return;
  if (hair === 'afro') {
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      c.beginPath();
      c.arc(x + Math.cos(a) * scale * 0.16, y + Math.sin(a) * scale * 0.09, scale * 0.12, 0, Math.PI * 2);
      c.fill();
    }
  } else if (hair === 'braids' || hair === 'dreads') {
    for (let i = -3; i <= 3; i += 1) {
      c.beginPath();
      c.roundRect(x + i * scale * 0.055, y - scale * 0.04, scale * 0.035, scale * 0.28, scale * 0.02);
      c.fill();
    }
  } else if (hair === 'bun') {
    c.beginPath();
    c.arc(x, y - scale * 0.12, scale * 0.13, 0, Math.PI * 2);
    c.arc(x, y, scale * 0.18, Math.PI, 0);
    c.fill();
  } else if (hair === 'ponytail') {
    c.beginPath();
    c.arc(x + scale * 0.18, y + scale * 0.02, scale * 0.1, 0, Math.PI * 2);
    c.arc(x, y, scale * 0.18, Math.PI, 0);
    c.fill();
  } else {
    c.beginPath();
    c.arc(x, y, scale * 0.2, Math.PI, 0);
    c.fill();
  }
}

function drawHat(c, x, y, scale, style) {
  if (!style.hat || style.hat === 'none') return;
  if (style.hat === 'crown') {
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.moveTo(x - scale * 0.22, y + scale * 0.03);
    c.lineTo(x - scale * 0.14, y - scale * 0.15);
    c.lineTo(x, y);
    c.lineTo(x + scale * 0.14, y - scale * 0.15);
    c.lineTo(x + scale * 0.22, y + scale * 0.03);
    c.closePath();
    c.fill();
  } else if (style.hat === 'tophat') {
    c.fillStyle = '#20232b';
    c.fillRect(x - scale * 0.14, y - scale * 0.18, scale * 0.28, scale * 0.18);
    c.fillRect(x - scale * 0.22, y - scale * 0.02, scale * 0.44, scale * 0.05);
  } else if (style.hat === 'beanie') {
    c.fillStyle = '#ff5d73';
    c.beginPath();
    c.arc(x, y, scale * 0.2, Math.PI, 0);
    c.fill();
  } else {
    c.fillStyle = '#30d5c8';
    c.beginPath();
    c.arc(x, y, scale * 0.2, Math.PI, 0);
    c.fill();
    c.fillRect(x, y - scale * 0.02, scale * 0.2, scale * 0.05);
  }
}

function makeGuestFace() {
  return drawFaceToCanvas(128, defaultStyle).toDataURL('image/png');
}

function renderPlayerCard() {
  const style = normalizeStyle(player.style);
  const face = player.face || drawFaceToCanvas(128, style).toDataURL('image/png');
  ui.face.src = face;
  ui.name.textContent = player.name || 'Guest';
  ui.account.textContent = signedIn && player.account ? `@${player.account}` : 'Guest runner';
  ui.signin.hidden = signedIn;
}

async function loadPlayer() {
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  const received = reply?.user ?? reply?.guest;
  signedIn = Boolean(reply?.user);
  if (received) {
    player = {
      id: received.id ?? null,
      name: received.name || 'Guest',
      account: received.account || '',
      style: normalizeStyle(received.style),
      face: received.face || ''
    };
  } else {
    player = {
      id: null,
      name: 'Guest',
      account: '',
      style: defaultStyle,
      face: makeGuestFace()
    };
  }
  renderPlayerCard();
}

function signIn() {
  location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

async function saveRun() {
  const stats = {
    score: Math.max(0, Math.round(game.score)),
    streak: Math.max(0, Math.round(game.bestStreak)),
    time: Math.max(0, Math.round(game.elapsed))
  };
  if (!signedIn) {
    ui.saveStatus.textContent = 'Sign in to save this run on start.ng.';
    return;
  }
  ui.saveStatus.textContent = 'Saving score...';
  const saved = await askStartNg({ type: 'startng:score', stats }, 'startng:scoreSaved', 6000);
  if (saved?.ok) {
    const rank = saved.result?.rank ? ` Rank #${saved.result.rank}.` : '';
    ui.saveStatus.textContent = saved.result?.improved ? `New personal best.${rank}` : `Saved. Your best still stands.${rank}`;
  } else {
    ui.saveStatus.textContent = saved?.error || 'Could not save yet. The game saves after it is live on start.ng.';
  }
}

async function loadLeaderboard() {
  ui.board.innerHTML = '<li class="muted">Loading leaderboard...</li>';
  const board = await askStartNg({ type: 'startng:leaderboard', limit: 10 }, 'startng:leaderboardData', 5500);
  if (!board?.ok || !Array.isArray(board.entries) || board.entries.length === 0) {
    ui.board.innerHTML = '<li class="muted">No live scores yet. Be the first runner after publishing.</li>';
    return;
  }
  ui.board.replaceChildren(...board.entries.map((entry) => {
    const li = document.createElement('li');
    const stats = entry.stats || {};
    li.innerHTML = `
      <span class="rank">#${entry.rank}</span>
      <span>
        <span class="name"></span>
        <span class="meta">${entry.player_id === player.id ? 'Your run' : 'Runner'}</span>
      </span>
      <span class="stats">${stats.score ?? entry.score ?? 0}<br>${stats.streak ?? 0} streak</span>
    `;
    li.querySelector('.name').textContent = entry.name || 'Runner';
    if (entry.player_id === player.id) li.style.borderColor = 'rgba(255, 209, 102, 0.55)';
    return li;
  }));
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  game.dpr = Math.min(2, window.devicePixelRatio || 1);
  game.width = Math.max(320, rect.width);
  game.height = Math.max(400, rect.height);
  canvas.width = Math.round(game.width * game.dpr);
  canvas.height = Math.round(game.height * game.dpr);
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
}

function resetRun() {
  game.mode = 'running';
  game.t = 0;
  game.elapsed = 0;
  game.score = 0;
  game.streak = 0;
  game.bestStreak = 0;
  game.energy = 100;
  game.speed = 310;
  game.slowmo = 0;
  game.spawnSpark = 0.2;
  game.spawnHazard = 1;
  game.spawnGate = 4;
  game.shake = 0;
  game.items = [];
  game.player.x = 0.5;
  game.player.y = 0.78;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.hurt = 0;
  ui.title.hidden = true;
  ui.over.hidden = true;
  updateHud();
}

function endRun() {
  game.mode = 'over';
  ui.overTitle.textContent = game.score >= 900 ? 'Market legend' : game.score >= 450 ? 'Clean footwork' : 'Good warm-up';
  ui.overSummary.textContent = `${Math.round(game.score)} points, ${game.bestStreak} best streak, ${formatTime(game.elapsed)} survived.`;
  ui.over.hidden = false;
  saveRun();
  loadLeaderboard();
}

function updateHud() {
  ui.score.textContent = Math.round(game.score);
  ui.streak.textContent = game.bestStreak;
  ui.time.textContent = formatTime(game.elapsed);
}

function spawnSpark() {
  const kinds = ['spark', 'spark', 'spark', 'bonus'];
  game.items.push({
    type: kinds[Math.floor(Math.random() * kinds.length)],
    x: rand(0.12, 0.88),
    y: -0.08,
    r: rand(16, 24),
    speed: rand(0.92, 1.2),
    wobble: rand(0, Math.PI * 2),
    dead: false
  });
}

function spawnHazard() {
  const type = Math.random() > 0.5 ? 'cart' : 'sign';
  game.items.push({
    type,
    x: rand(0.12, 0.88),
    y: -0.12,
    r: type === 'cart' ? 34 : 29,
    speed: rand(0.9, 1.18),
    wobble: rand(0, Math.PI * 2),
    dead: false
  });
}

function spawnGate() {
  game.items.push({
    type: 'gate',
    x: rand(0.2, 0.8),
    y: -0.1,
    r: 42,
    speed: 0.88,
    wobble: rand(0, Math.PI * 2),
    dead: false
  });
}

function update(dt) {
  if (game.mode !== 'running') return;

  const slow = game.slowmo > 0 ? 0.56 : 1;
  game.t += dt;
  game.elapsed += dt;
  game.speed += dt * 8;
  game.slowmo = Math.max(0, game.slowmo - dt);
  game.shake = Math.max(0, game.shake - dt * 18);
  game.player.hurt = Math.max(0, game.player.hurt - dt);

  let ax = 0;
  let ay = 0;
  if (game.keys.has('ArrowLeft') || game.keys.has('a')) ax -= 1;
  if (game.keys.has('ArrowRight') || game.keys.has('d')) ax += 1;
  if (game.keys.has('ArrowUp') || game.keys.has('w')) ay -= 1;
  if (game.keys.has('ArrowDown') || game.keys.has('s')) ay += 1;

  if (game.pointer.active) {
    const px = game.pointer.x / game.width;
    const py = game.pointer.y / game.height;
    ax += clamp((px - game.player.x) * 7, -1, 1);
    ay += clamp((py - game.player.y) * 7, -1, 1);
  }

  game.player.vx = game.player.vx * 0.82 + ax * dt * 7;
  game.player.vy = game.player.vy * 0.82 + ay * dt * 7;
  game.player.x = clamp(game.player.x + game.player.vx * dt, 0.08, 0.92);
  game.player.y = clamp(game.player.y + game.player.vy * dt, 0.2, 0.9);

  game.spawnSpark -= dt;
  game.spawnHazard -= dt;
  game.spawnGate -= dt;
  if (game.spawnSpark <= 0) {
    spawnSpark();
    game.spawnSpark = rand(0.34, 0.72);
  }
  if (game.spawnHazard <= 0) {
    spawnHazard();
    game.spawnHazard = rand(0.75, 1.25) * Math.max(0.42, 1.08 - game.elapsed / 140);
  }
  if (game.spawnGate <= 0) {
    spawnGate();
    game.spawnGate = rand(8, 12);
  }

  const px = game.player.x * game.width;
  const py = game.player.y * game.height;
  const playerRadius = Math.min(game.width, game.height) * 0.045;

  for (const item of game.items) {
    item.y += (game.speed * item.speed * slow * dt) / game.height;
    item.wobble += dt * 3;
    const ix = (item.x + Math.sin(item.wobble) * 0.014) * game.width;
    const iy = item.y * game.height;
    const distance = Math.hypot(px - ix, py - iy);
    if (!item.dead && distance < playerRadius + item.r) {
      item.dead = true;
      if (item.type === 'spark' || item.type === 'bonus') {
        game.streak += 1;
        game.bestStreak = Math.max(game.bestStreak, game.streak);
        game.score += item.type === 'bonus' ? 70 + game.streak * 6 : 35 + game.streak * 4;
        game.energy = clamp(game.energy + 5, 0, 100);
      } else if (item.type === 'gate') {
        game.score += 90;
        game.slowmo = 2.4;
        game.streak += 2;
        game.bestStreak = Math.max(game.bestStreak, game.streak);
      } else {
        game.streak = 0;
        game.energy -= 26;
        game.shake = 9;
        game.player.hurt = 0.55;
      }
    }
  }

  game.items = game.items.filter((item) => !item.dead && item.y < 1.14);
  game.energy -= dt * (3 + game.elapsed / 28);
  if (game.energy <= 0) {
    game.energy = 0;
    endRun();
  }
  updateHud();
}

function drawBackground() {
  const w = game.width;
  const h = game.height;
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#101b1f');
  gradient.addColorStop(0.48, '#172824');
  gradient.addColorStop(1, '#100e13');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 18; i += 1) {
    const x = ((i * 137 + game.t * 18) % (w + 160)) - 80;
    const y = (i % 6) * h * 0.13 + 60;
    ctx.fillStyle = i % 2 ? '#19333a' : '#2a2f28';
    ctx.fillRect(x, y, 72, 42);
    ctx.fillStyle = i % 3 ? '#ffd166' : '#30d5c8';
    ctx.fillRect(x + 8, y + 10, 18, 8);
    ctx.fillRect(x + 40, y + 12, 20, 8);
  }
  ctx.restore();

  const laneTop = h * 0.18;
  const laneBottom = h * 0.96;
  ctx.fillStyle = 'rgba(255, 247, 232, 0.045)';
  ctx.beginPath();
  ctx.moveTo(w * 0.17, laneTop);
  ctx.lineTo(w * 0.83, laneTop);
  ctx.lineTo(w * 0.98, laneBottom);
  ctx.lineTo(w * 0.02, laneBottom);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 7; i += 1) {
    const x = w * (0.16 + i * 0.115);
    ctx.strokeStyle = i % 2 ? 'rgba(48, 213, 200, 0.2)' : 'rgba(255, 209, 102, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, laneTop);
    ctx.lineTo(w * 0.5 + (x - w * 0.5) * 1.42, laneBottom);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 247, 232, 0.12)';
  ctx.lineWidth = 1;
  for (let y = (game.t * game.speed * 0.55) % 72; y < h; y += 72) {
    ctx.beginPath();
    ctx.moveTo(w * 0.1, y);
    ctx.lineTo(w * 0.9, y + 10);
    ctx.stroke();
  }
}

function drawSpark(item, x, y) {
  const r = item.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(game.t * 3 + item.wobble);
  ctx.fillStyle = item.type === 'bonus' ? '#ffd166' : '#78d45e';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const radius = i % 2 ? r * 0.42 : r;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCart(item, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ff5d73';
  ctx.strokeStyle = '#fff7e8';
  ctx.lineWidth = 3;
  ctx.roundRect(-34, -20, 68, 36, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-24, -32, 48, 13);
  ctx.fillStyle = '#151515';
  ctx.beginPath();
  ctx.arc(-22, 22, 8, 0, Math.PI * 2);
  ctx.arc(22, 22, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSign(item, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(game.t * 2 + item.wobble) * 0.1);
  ctx.fillStyle = '#fff7e8';
  ctx.fillRect(-4, -34, 8, 68);
  ctx.fillStyle = '#30d5c8';
  ctx.strokeStyle = '#0b1114';
  ctx.lineWidth = 4;
  ctx.roundRect(-34, -38, 68, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0b1114';
  ctx.font = '900 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('SLOW', 0, -17);
  ctx.restore();
}

function drawGate(item, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#30d5c8';
  ctx.lineWidth = 7;
  ctx.shadowColor = '#30d5c8';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(0, 0, item.r, 0.3, Math.PI * 1.7);
  ctx.stroke();
  ctx.fillStyle = '#fff7e8';
  ctx.font = '900 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('TIME', 0, 4);
  ctx.restore();
}

function drawItems() {
  const sorted = [...game.items].sort((a, b) => a.y - b.y);
  for (const item of sorted) {
    const x = (item.x + Math.sin(item.wobble) * 0.014) * game.width;
    const y = item.y * game.height;
    if (item.type === 'spark' || item.type === 'bonus') drawSpark(item, x, y);
    if (item.type === 'cart') drawCart(item, x, y);
    if (item.type === 'sign') drawSign(item, x, y);
    if (item.type === 'gate') drawGate(item, x, y);
  }
}

function drawCharacter(x, y, scale, style) {
  const bob = Math.sin(game.t * 12) * scale * 0.025;
  ctx.save();
  ctx.translate(x, y + bob);
  if (game.player.hurt > 0) {
    ctx.globalAlpha = 0.72 + Math.sin(game.t * 40) * 0.22;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, scale * 0.58, scale * 0.34, scale * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = style.skinColor;
  ctx.lineWidth = scale * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-scale * 0.15, scale * 0.42);
  ctx.lineTo(-scale * 0.25, scale * 0.68);
  ctx.moveTo(scale * 0.15, scale * 0.42);
  ctx.lineTo(scale * 0.24, scale * 0.68);
  ctx.stroke();

  ctx.strokeStyle = style.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(-scale * 0.12, scale * 0.08);
  ctx.lineTo(-scale * 0.28, scale * 0.34);
  ctx.moveTo(scale * 0.12, scale * 0.08);
  ctx.lineTo(scale * 0.28, scale * 0.34);
  ctx.stroke();

  ctx.fillStyle = style.secondaryColor;
  ctx.beginPath();
  ctx.roundRect(-scale * 0.2, scale * 0.12, scale * 0.4, scale * 0.4, scale * 0.08);
  ctx.fill();

  ctx.fillStyle = style.primaryColor;
  ctx.beginPath();
  ctx.roundRect(-scale * 0.24, -scale * 0.16, scale * 0.48, scale * 0.34, scale * 0.09);
  ctx.fill();

  if (style.accessory === 'scarf') {
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-scale * 0.25, -scale * 0.13, scale * 0.5, scale * 0.06);
    ctx.fillRect(scale * 0.1, -scale * 0.12, scale * 0.08, scale * 0.28);
  }
  if (style.accessory === 'backpack') {
    ctx.fillStyle = '#26333d';
    ctx.beginPath();
    ctx.roundRect(scale * 0.19, -scale * 0.08, scale * 0.16, scale * 0.34, scale * 0.05);
    ctx.fill();
  }

  ctx.fillStyle = style.skinColor;
  ctx.beginPath();
  ctx.arc(0, -scale * 0.34, scale * 0.22, 0, Math.PI * 2);
  ctx.fill();
  drawHair(ctx, 0, -scale * 0.43, scale, style);
  drawHat(ctx, 0, -scale * 0.56, scale, style);

  ctx.fillStyle = '#101010';
  ctx.beginPath();
  ctx.arc(-scale * 0.07, -scale * 0.35, scale * 0.018, 0, Math.PI * 2);
  ctx.arc(scale * 0.07, -scale * 0.35, scale * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#23140e';
  ctx.lineWidth = scale * 0.018;
  ctx.beginPath();
  ctx.arc(0, -scale * 0.3, scale * 0.06, 0.1, Math.PI - 0.1);
  ctx.stroke();

  if (style.accessory === 'glasses') {
    ctx.strokeStyle = '#fff7e8';
    ctx.lineWidth = scale * 0.018;
    ctx.strokeRect(-scale * 0.13, -scale * 0.39, scale * 0.1, scale * 0.07);
    ctx.strokeRect(scale * 0.03, -scale * 0.39, scale * 0.1, scale * 0.07);
  }
  if (style.accessory === 'beard') {
    ctx.fillStyle = style.hairColor;
    ctx.beginPath();
    ctx.arc(0, -scale * 0.25, scale * 0.1, 0, Math.PI);
    ctx.fill();
  }
  if (style.accessory === 'earrings') {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(-scale * 0.22, -scale * 0.31, scale * 0.025, 0, Math.PI * 2);
    ctx.arc(scale * 0.22, -scale * 0.31, scale * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnergy() {
  const w = Math.min(360, game.width - 32);
  const x = 16;
  const y = game.height - 28;
  ctx.fillStyle = 'rgba(255, 247, 232, 0.12)';
  ctx.roundRect(x, y, w, 12, 6);
  ctx.fill();
  const fill = (w * game.energy) / 100;
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#78d45e');
  grad.addColorStop(0.55, '#ffd166');
  grad.addColorStop(1, '#ff5d73');
  ctx.fillStyle = grad;
  ctx.roundRect(x, y, fill, 12, 6);
  ctx.fill();
}

function draw() {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
  }
  drawBackground();
  drawItems();
  drawCharacter(
    game.player.x * game.width,
    game.player.y * game.height,
    Math.min(game.width, game.height) * 0.13,
    normalizeStyle(player.style)
  );
  drawEnergy();
  if (game.slowmo > 0) {
    ctx.fillStyle = 'rgba(48, 213, 200, 0.09)';
    ctx.fillRect(0, 0, game.width, game.height);
  }
  ctx.restore();

  if (game.mode === 'title') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 0, game.width, game.height);
  }
}

function loop(now) {
  const seconds = now / 1000;
  const dt = Math.min(0.033, seconds - (game.last || seconds));
  game.last = seconds;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

ui.start.addEventListener('click', resetRun);
ui.again.addEventListener('click', resetRun);
ui.showBoard.addEventListener('click', loadLeaderboard);
ui.refreshBoard.addEventListener('click', loadLeaderboard);
ui.signin.addEventListener('click', signIn);

addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(key)) {
    event.preventDefault();
    game.keys.add(key);
  }
  if ((key === ' ' || key === 'Enter') && game.mode !== 'running') {
    event.preventDefault();
    resetRun();
  }
});

addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  game.keys.delete(key);
});

canvas.addEventListener('pointerdown', (event) => {
  if (game.mode !== 'running') return;
  game.pointer.active = true;
  Object.assign(game.pointer, canvasPoint(event));
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!game.pointer.active) return;
  Object.assign(game.pointer, canvasPoint(event));
});

canvas.addEventListener('pointerup', () => {
  game.pointer.active = false;
});

canvas.addEventListener('pointercancel', () => {
  game.pointer.active = false;
});

addEventListener('resize', resize);
addEventListener('focus', () => {
  loadPlayer();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadPlayer();
});

player.face = makeGuestFace();
renderPlayerCard();
resize();
loadPlayer().then(loadLeaderboard);
requestAnimationFrame(loop);
