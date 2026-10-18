const START_NG = 'https://start.ng';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  score: document.getElementById('score'),
  streak: document.getElementById('streak'),
  time: document.getElementById('time'),
  title: document.getElementById('title-panel'),
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
  signin: document.getElementById('signin'),
  marketOptions: [...document.querySelectorAll('.market-option')],
  avatarOptions: [...document.querySelectorAll('.avatar-option')]
};

const markets = {
  balogun: {
    name: 'Balogun Market',
    sign: 'BALOGUN',
    sky: ['#f6c968', '#f3a85d'],
    road: '#754828',
    left: '#ef476f',
    right: '#2ec4b6',
    shade: '#ffd34f'
  },
  mile12: {
    name: 'Mile 12 Market',
    sign: 'MILE 12',
    sky: ['#d9c168', '#79a65a'],
    road: '#5c552c',
    left: '#4caf50',
    right: '#f7c948',
    shade: '#ff8c42'
  },
  oshodi: {
    name: 'Oshodi Market',
    sign: 'OSHODI',
    sky: ['#f0b05e', '#b9674a'],
    road: '#474139',
    left: '#ff8c42',
    right: '#2ec4b6',
    shade: '#f7c948'
  },
  oyingbo: {
    name: 'OyingBO Market'.replace('BO', 'bo'),
    sign: 'OYINGBO',
    sky: ['#d6b06a', '#7e8a59'],
    road: '#654d30',
    left: '#b5651d',
    right: '#4caf50',
    shade: '#ef476f'
  }
};

const avatarPresets = {
  aisha: {
    label: 'Aisha',
    role: 'Balogun shopper',
    skinColor: '#d19a73',
    hairColor: '#17120f',
    primaryColor: '#f7c948',
    secondaryColor: '#ef476f',
    hair: 'braids',
    accessory: 'earrings',
    bagColor: '#5a352a'
  },
  kemi: {
    label: 'Kemi',
    role: 'Mainland auntie',
    skinColor: '#8d5524',
    hairColor: '#1b120c',
    primaryColor: '#2ec4b6',
    secondaryColor: '#ff8c42',
    hair: 'bun',
    accessory: 'gele',
    bagColor: '#7a4f33'
  },
  tunde: {
    label: 'Tunde',
    role: 'Oshodi runner',
    skinColor: '#6f3f24',
    hairColor: '#111111',
    primaryColor: '#4caf50',
    secondaryColor: '#f7c948',
    hair: 'short',
    accessory: 'cap',
    bagColor: '#26333d'
  },
  zainab: {
    label: 'Zainab',
    role: 'Mile 12 shopper',
    skinColor: '#b8764f',
    hairColor: '#17120f',
    primaryColor: '#b5651d',
    secondaryColor: '#4caf50',
    hair: 'dreads',
    accessory: 'headwrap',
    bagColor: '#5a352a'
  }
};

const groceries = [
  { type: 'tomato', name: 'Tomatoes', points: 38, radius: 20 },
  { type: 'pepper', name: 'Pepper', points: 42, radius: 18 },
  { type: 'plantain', name: 'Plantain', points: 45, radius: 24 },
  { type: 'orange', name: 'Oranges', points: 36, radius: 19 },
  { type: 'yam', name: 'Yam', points: 48, radius: 22 },
  { type: 'rice', name: 'Rice', points: 55, radius: 24 },
  { type: 'bread', name: 'Agege bread', points: 52, radius: 25 },
  { type: 'garri', name: 'Garri', points: 58, radius: 24 }
];

const hazards = [
  { type: 'car', name: 'Car', damage: 34, radius: 34 },
  { type: 'bike', name: 'Okada', damage: 28, radius: 30 },
  { type: 'agbero', name: 'Agbero', damage: 25, radius: 30 }
];

const game = {
  mode: 'title',
  market: 'balogun',
  avatar: 'aisha',
  t: 0,
  last: 0,
  elapsed: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  energy: 100,
  speed: 260,
  boostTime: 0,
  spawnPickup: 0,
  spawnHazard: 0,
  spawnBoost: 4,
  message: '',
  messageTime: 0,
  shake: 0,
  roadTick: 0,
  runner: { lane: 0, targetLane: 0, bob: 0 },
  items: [],
  keys: new Set(),
  pointer: { active: false, x: 0 }
};

let framePromise;
let signedIn = false;
let player = {
  id: null,
  name: 'Guest',
  account: '',
  face: '',
  style: avatarPresets.aisha
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function validColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
}

function normalizeStyle(style) {
  return {
    ...avatarPresets.aisha,
    ...(style || {}),
    skinColor: validColor(style?.skinColor, avatarPresets.aisha.skinColor),
    hairColor: validColor(style?.hairColor, avatarPresets.aisha.hairColor),
    primaryColor: validColor(style?.primaryColor, avatarPresets.aisha.primaryColor),
    secondaryColor: validColor(style?.secondaryColor, avatarPresets.aisha.secondaryColor),
    bagColor: validColor(style?.bagColor, avatarPresets.aisha.bagColor)
  };
}

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

function roundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

function drawHair2d(c, x, y, scale, style) {
  c.fillStyle = style.hairColor;
  c.strokeStyle = style.hairColor;
  c.lineCap = 'round';
  if (style.hair === 'braids' || style.hair === 'dreads') {
    c.beginPath();
    c.ellipse(x, y - scale * 0.08, scale * 0.23, scale * 0.17, 0, Math.PI, 0);
    c.fill();
    c.lineWidth = scale * 0.04;
    for (let i = -4; i <= 4; i += 1) {
      c.beginPath();
      c.moveTo(x + i * scale * 0.045, y - scale * 0.03);
      c.quadraticCurveTo(x + i * scale * 0.06, y + scale * 0.14, x + i * scale * 0.035, y + scale * 0.28);
      c.stroke();
    }
  } else if (style.hair === 'bun') {
    c.beginPath();
    c.arc(x, y - scale * 0.18, scale * 0.13, 0, Math.PI * 2);
    c.arc(x, y - scale * 0.04, scale * 0.21, Math.PI, 0);
    c.fill();
  } else {
    c.beginPath();
    c.arc(x, y - scale * 0.02, scale * 0.22, Math.PI, 0);
    c.fill();
  }
}

function drawAccessory2d(c, x, y, scale, style) {
  if (style.accessory === 'gele' || style.accessory === 'headwrap') {
    c.fillStyle = style.accessory === 'gele' ? '#f7c948' : style.primaryColor;
    c.beginPath();
    c.ellipse(x, y - scale * 0.16, scale * 0.29, scale * 0.13, 0, Math.PI, 0);
    c.fill();
    c.beginPath();
    c.moveTo(x - scale * 0.18, y - scale * 0.16);
    c.lineTo(x, y - scale * 0.34);
    c.lineTo(x + scale * 0.13, y - scale * 0.15);
    c.closePath();
    c.fill();
  }
  if (style.accessory === 'cap') {
    c.fillStyle = style.primaryColor;
    c.beginPath();
    c.arc(x, y - scale * 0.15, scale * 0.22, Math.PI, 0);
    c.fill();
    c.fillRect(x - scale * 0.02, y - scale * 0.15, scale * 0.28, scale * 0.06);
  }
}

function drawFaceToCanvas(size, style) {
  const face = document.createElement('canvas');
  face.width = size;
  face.height = size;
  const c = face.getContext('2d');
  const s = normalizeStyle(style);

  const bg = c.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, s.primaryColor);
  bg.addColorStop(1, s.secondaryColor);
  c.fillStyle = bg;
  c.fillRect(0, 0, size, size);

  c.fillStyle = s.secondaryColor;
  c.beginPath();
  c.arc(size * 0.5, size * 0.7, size * 0.28, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = s.skinColor;
  c.beginPath();
  c.ellipse(size * 0.5, size * 0.45, size * 0.21, size * 0.25, 0, 0, Math.PI * 2);
  c.fill();
  drawHair2d(c, size * 0.5, size * 0.38, size * 0.62, s);
  drawAccessory2d(c, size * 0.5, size * 0.38, size * 0.62, s);

  c.fillStyle = '#111';
  c.beginPath();
  c.arc(size * 0.42, size * 0.44, size * 0.025, 0, Math.PI * 2);
  c.arc(size * 0.58, size * 0.44, size * 0.025, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = '#3b1c13';
  c.lineWidth = Math.max(2, size * 0.018);
  c.beginPath();
  c.arc(size * 0.5, size * 0.52, size * 0.08, 0.15, Math.PI - 0.15);
  c.stroke();

  c.fillStyle = '#f7c948';
  c.beginPath();
  c.arc(size * 0.27, size * 0.49, size * 0.025, 0, Math.PI * 2);
  c.arc(size * 0.73, size * 0.49, size * 0.025, 0, Math.PI * 2);
  c.fill();

  return face;
}

function selectedStyle() {
  return normalizeStyle(avatarPresets[game.avatar] || avatarPresets.aisha);
}

function renderPlayerCard() {
  const style = normalizeStyle(player.style);
  ui.face.src = player.face || drawFaceToCanvas(128, style).toDataURL('image/png');
  ui.name.textContent = player.name || 'Guest';
  ui.account.textContent = signedIn && player.account ? `@${player.account}` : 'Guest shopper';
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
      style: avatarPresets.aisha,
      face: drawFaceToCanvas(128, avatarPresets.aisha).toDataURL('image/png')
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
    ui.saveStatus.textContent = 'Sign in to compete for Market Champion.';
    return;
  }
  ui.saveStatus.textContent = 'Saving market haul...';
  const saved = await askStartNg({ type: 'startng:score', stats }, 'startng:scoreSaved', 6000);
  if (saved?.ok) {
    const rank = saved.result?.rank ? ` Rank #${saved.result.rank}.` : '';
    ui.saveStatus.textContent = saved.result?.improved ? `New Market Champion run.${rank}` : `Saved. Your best haul still stands.${rank}`;
  } else {
    ui.saveStatus.textContent = saved?.error || 'Could not save yet. Scores save after the game is live on start.ng.';
  }
}

async function loadLeaderboard() {
  ui.board.innerHTML = '<li class="muted">Loading Market Champion board...</li>';
  const board = await askStartNg({ type: 'startng:leaderboard', limit: 10 }, 'startng:leaderboardData', 5500);
  if (!board?.ok || !Array.isArray(board.entries) || board.entries.length === 0) {
    ui.board.innerHTML = '<li class="muted">No champion yet. First live shopper takes the crown.</li>';
    return;
  }
  ui.board.replaceChildren(...board.entries.map((entry) => {
    const li = document.createElement('li');
    const stats = entry.stats || {};
    li.innerHTML = `
      <span class="rank">#${entry.rank}</span>
      <span>
        <span class="name"></span>
        <span class="meta">${entry.player_id === player.id ? 'Your market run' : 'Market shopper'}</span>
      </span>
      <span class="stats">${stats.score ?? entry.score ?? 0}<br>${stats.streak ?? 0} streak</span>
    `;
    li.querySelector('.name').textContent = entry.name || 'Shopper';
    if (entry.player_id === player.id) li.style.borderColor = 'rgba(247, 201, 72, 0.65)';
    return li;
  }));
}

function setAvatar(key) {
  game.avatar = avatarPresets[key] ? key : 'aisha';
  ui.avatarOptions.forEach((button) => {
    const active = button.dataset.avatar === game.avatar;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderAvatarOptions() {
  ui.avatarOptions.forEach((button) => {
    const avatar = avatarPresets[button.dataset.avatar];
    if (!avatar) return;
    const img = button.querySelector('img');
    img.src = drawFaceToCanvas(96, avatar).toDataURL('image/png');
    img.alt = avatar.label;
    button.title = avatar.role;
  });
}

function setMarket(key) {
  game.market = markets[key] ? key : 'balogun';
  ui.marketOptions.forEach((button) => {
    const active = button.dataset.market === game.market;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateHud() {
  ui.score.textContent = Math.round(game.score);
  ui.streak.textContent = game.bestStreak;
  ui.time.textContent = formatTime(game.elapsed);
}

function resetRun() {
  document.body.dataset.screen = 'running';
  game.mode = 'running';
  game.t = 0;
  game.elapsed = 0;
  game.score = 0;
  game.streak = 0;
  game.bestStreak = 0;
  game.energy = 100;
  game.speed = 265;
  game.boostTime = 0;
  game.spawnPickup = 0.18;
  game.spawnHazard = 1.2;
  game.spawnBoost = 5.5;
  game.message = markets[game.market].name;
  game.messageTime = 2;
  game.shake = 0;
  game.roadTick = 0;
  game.runner.lane = 0;
  game.runner.targetLane = 0;
  game.items = [];
  ui.title.hidden = true;
  ui.over.hidden = true;
  updateHud();
}

function endRun() {
  document.body.dataset.screen = 'over';
  game.mode = 'over';
  ui.overTitle.textContent = game.score >= 1200 ? 'Market Champion' : game.score >= 650 ? 'Sharp shopper' : 'Try again, no dulling';
  ui.overSummary.textContent = `${Math.round(game.score)} haul, ${game.bestStreak} shopping streak, ${formatTime(game.elapsed)} in ${markets[game.market].name}.`;
  ui.over.hidden = false;
  saveRun();
  loadLeaderboard();
}

function roadBounds(y, w, h) {
  const horizon = h * 0.24;
  const p = clamp((y - horizon) / (h - horizon), 0, 1);
  const top = w * 0.18;
  const bottom = w * 0.98;
  const road = top + (bottom - top) * p;
  return {
    center: w / 2,
    width: road,
    left: w / 2 - road / 2,
    right: w / 2 + road / 2,
    p
  };
}

function laneToX(lane, y, w, h) {
  const road = roadBounds(y, w, h);
  return road.center + lane * road.width * 0.42;
}

function itemScreen(item, w, h) {
  const x = laneToX(item.lane, item.y, w, h);
  const scale = 0.45 + roadBounds(item.y, w, h).p * 1.25;
  return { x, y: item.y, scale };
}

function spawnPickup() {
  const data = choice(groceries);
  game.items.push({
    ...data,
    kind: 'pickup',
    lane: rand(-0.95, 0.95),
    y: canvas.clientHeight * 0.2,
    spin: rand(0, Math.PI * 2),
    velocity: rand(0.92, 1.14)
  });
}

function spawnHazard() {
  const data = choice(hazards);
  game.items.push({
    ...data,
    kind: 'hazard',
    lane: rand(-0.98, 0.98),
    y: canvas.clientHeight * 0.18,
    spin: rand(0, Math.PI * 2),
    velocity: rand(0.95, 1.2)
  });
}

function spawnBoost() {
  game.items.push({
    kind: 'boost',
    type: 'time',
    name: 'Time boost',
    radius: 25,
    lane: rand(-0.86, 0.86),
    y: canvas.clientHeight * 0.18,
    spin: 0,
    velocity: 0.9
  });
}

function drawSky(c, w, h) {
  const market = markets[game.market];
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, market.sky[0]);
  grad.addColorStop(0.72, market.sky[1]);
  grad.addColorStop(1, '#173322');
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  c.fillStyle = 'rgba(255, 240, 160, 0.45)';
  c.beginPath();
  c.arc(w * 0.78, h * 0.1, Math.min(w, h) * 0.09, 0, Math.PI * 2);
  c.fill();
}

function drawRoad(c, w, h) {
  const market = markets[game.market];
  const horizon = h * 0.24;
  c.fillStyle = market.road;
  c.beginPath();
  c.moveTo(w * 0.41, horizon);
  c.lineTo(w * 0.59, horizon);
  c.lineTo(w * 1.08, h);
  c.lineTo(w * -0.08, h);
  c.closePath();
  c.fill();

  c.strokeStyle = 'rgba(255, 220, 70, 0.84)';
  c.lineWidth = Math.max(2, w * 0.006);
  c.setLineDash([22, 34]);
  c.lineDashOffset = -game.roadTick;
  [-0.45, 0, 0.45].forEach((lane) => {
    c.beginPath();
    c.moveTo(laneToX(lane, horizon, w, h), horizon);
    c.lineTo(laneToX(lane, h, w, h), h);
    c.stroke();
  });
  c.setLineDash([]);
}

function drawStalls(c, w, h) {
  const market = markets[game.market];
  const horizon = h * 0.25;
  for (let i = 0; i < 18; i += 1) {
    const y = horizon + i * h * 0.052 + (game.roadTick % 48) - 48;
    if (y < horizon - 30 || y > h + 80) continue;
    const road = roadBounds(y, w, h);
    const scale = 0.36 + road.p * 1.1;
    [-1, 1].forEach((side) => {
      const stallW = 62 * scale;
      const stallH = 38 * scale;
      const x = side < 0 ? road.left - stallW * 0.54 : road.right - stallW * 0.46;
      const color = side < 0 ? market.left : market.right;
      c.fillStyle = 'rgba(0, 0, 0, 0.2)';
      c.fillRect(x + 4 * scale, y + stallH * 0.72, stallW, stallH * 0.18);
      c.fillStyle = color;
      roundedRect(c, x, y, stallW, stallH, 5 * scale);
      c.fillStyle = market.shade;
      c.beginPath();
      c.moveTo(x - 4 * scale, y + 5 * scale);
      c.lineTo(x + stallW * 0.25, y - stallH * 0.55);
      c.lineTo(x + stallW * 0.82, y - stallH * 0.55);
      c.lineTo(x + stallW + 7 * scale, y + 5 * scale);
      c.closePath();
      c.fill();
      c.fillStyle = '#1d231b';
      roundedRect(c, x + stallW * 0.14, y + stallH * 0.48, stallW * 0.72, stallH * 0.18, 3 * scale);
      ['#d62828', '#4caf50', '#f7c948'].forEach((fruit, n) => {
        c.fillStyle = fruit;
        c.beginPath();
        c.arc(x + stallW * (0.24 + n * 0.2), y + stallH * 0.54, 4.8 * scale, 0, Math.PI * 2);
        c.fill();
      });
    });
  }
}

function drawSign(c, w, h) {
  const y = h * 0.14;
  const signW = Math.min(260, w * 0.58);
  c.fillStyle = 'rgba(16, 20, 15, 0.76)';
  roundedRect(c, w / 2 - signW / 2, y, signW, 42, 8);
  c.fillStyle = '#fff7e8';
  c.font = `900 ${Math.max(18, Math.min(28, w * 0.055))}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(markets[game.market].sign, w / 2, y + 22);
}

function drawTomato(c, x, y, s) {
  c.fillStyle = '#d62828';
  c.beginPath();
  c.arc(x - 5 * s, y, 10 * s, 0, Math.PI * 2);
  c.arc(x + 5 * s, y, 10 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2f9e44';
  c.beginPath();
  c.moveTo(x, y - 12 * s);
  c.lineTo(x - 7 * s, y - 20 * s);
  c.lineTo(x + 8 * s, y - 16 * s);
  c.closePath();
  c.fill();
}

function drawPickup(c, item, x, y, s) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(game.t * 3 + item.spin) * 0.18);
  if (item.type === 'tomato') {
    drawTomato(c, 0, 0, s);
  } else if (item.type === 'pepper') {
    c.fillStyle = '#c1121f';
    c.beginPath();
    c.ellipse(0, 0, 8 * s, 20 * s, -0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#2f9e44';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(0, -16 * s);
    c.quadraticCurveTo(7 * s, -25 * s, 13 * s, -19 * s);
    c.stroke();
  } else if (item.type === 'plantain') {
    c.strokeStyle = '#f7c948';
    c.lineWidth = 12 * s;
    c.beginPath();
    c.arc(0, -2 * s, 20 * s, 0.25, Math.PI * 1.2);
    c.stroke();
    c.strokeStyle = '#244f1f';
    c.lineWidth = 2 * s;
    c.stroke();
  } else if (item.type === 'orange') {
    c.fillStyle = '#ff9f1c';
    c.beginPath();
    c.arc(0, 0, 13 * s, 0, Math.PI * 2);
    c.fill();
  } else if (item.type === 'yam') {
    c.fillStyle = '#9c6b3d';
    c.beginPath();
    c.ellipse(0, 0, 12 * s, 24 * s, 0.6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#6f4518';
    c.lineWidth = 2 * s;
    c.beginPath();
    c.moveTo(-12 * s, -4 * s);
    c.lineTo(13 * s, 4 * s);
    c.moveTo(-8 * s, 10 * s);
    c.lineTo(9 * s, 15 * s);
    c.stroke();
  } else if (item.type === 'bread') {
    c.fillStyle = '#d89b4a';
    roundedRect(c, -22 * s, -12 * s, 44 * s, 24 * s, 12 * s);
    c.strokeStyle = '#a96f2e';
    c.lineWidth = 2 * s;
    c.beginPath();
    c.moveTo(-10 * s, -8 * s);
    c.lineTo(-4 * s, 8 * s);
    c.moveTo(8 * s, -8 * s);
    c.lineTo(14 * s, 8 * s);
    c.stroke();
  } else {
    c.fillStyle = item.type === 'rice' ? '#fff4c7' : '#f3df9b';
    roundedRect(c, -18 * s, -22 * s, 36 * s, 44 * s, 5 * s);
    c.fillStyle = '#4b3b1f';
    c.font = `900 ${10 * s}px system-ui`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(item.type === 'rice' ? 'RICE' : 'GARRI', 0, 2 * s);
  }
  c.restore();
}

function drawCar(c, x, y, s) {
  c.fillStyle = '#f77f00';
  roundedRect(c, x - 28 * s, y - 17 * s, 56 * s, 34 * s, 7 * s);
  c.fillStyle = '#141414';
  roundedRect(c, x - 16 * s, y - 22 * s, 32 * s, 16 * s, 4 * s);
  c.fillStyle = '#111';
  [-18, 18].forEach((dx) => {
    c.beginPath();
    c.arc(x + dx * s, y + 17 * s, 7 * s, 0, Math.PI * 2);
    c.fill();
  });
}

function drawBike(c, x, y, s) {
  c.strokeStyle = '#111';
  c.lineWidth = 4 * s;
  [-18, 18].forEach((dx) => {
    c.beginPath();
    c.arc(x + dx * s, y + 14 * s, 10 * s, 0, Math.PI * 2);
    c.stroke();
  });
  c.strokeStyle = '#d62828';
  c.beginPath();
  c.moveTo(x - 18 * s, y + 14 * s);
  c.lineTo(x, y - 7 * s);
  c.lineTo(x + 18 * s, y + 14 * s);
  c.lineTo(x - 2 * s, y + 14 * s);
  c.stroke();
  drawMiniPerson(c, x + 2 * s, y - 17 * s, s * 0.7, '#d62828', '#7f5539');
}

function drawMiniPerson(c, x, y, s, outfit, skin) {
  c.fillStyle = skin;
  c.beginPath();
  c.arc(x, y - 12 * s, 8 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = outfit;
  roundedRect(c, x - 9 * s, y - 4 * s, 18 * s, 24 * s, 7 * s);
  c.strokeStyle = skin;
  c.lineWidth = 4 * s;
  c.beginPath();
  c.moveTo(x - 8 * s, y + 4 * s);
  c.lineTo(x - 20 * s, y + 15 * s);
  c.moveTo(x + 8 * s, y + 4 * s);
  c.lineTo(x + 18 * s, y + 12 * s);
  c.stroke();
}

function drawAgbero(c, x, y, s) {
  drawMiniPerson(c, x, y, s, '#d62828', '#7f5539');
  c.fillStyle = '#111';
  c.fillRect(x - 11 * s, y - 23 * s, 22 * s, 5 * s);
  c.fillStyle = 'rgba(214, 40, 40, 0.9)';
  roundedRect(c, x - 22 * s, y - 1 * s, 44 * s, 16 * s, 4 * s);
  c.fillStyle = '#fff7e8';
  c.font = `900 ${8 * s}px system-ui`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('AREA', x, y + 7 * s);
}

function drawBoost(c, x, y, s) {
  c.save();
  c.translate(x, y);
  c.rotate(game.t * 2.4);
  c.strokeStyle = '#2ec4b6';
  c.lineWidth = 5 * s;
  c.beginPath();
  c.arc(0, 0, 18 * s, 0, Math.PI * 2);
  c.stroke();
  c.restore();
  c.fillStyle = '#fff7e8';
  c.font = `900 ${10 * s}px system-ui`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('TIME', x, y);
}

function drawItem(c, item, w, h) {
  const p = itemScreen(item, w, h);
  const s = p.scale;
  c.fillStyle = 'rgba(0, 0, 0, 0.22)';
  c.beginPath();
  c.ellipse(p.x + 4 * s, p.y + 22 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2);
  c.fill();
  if (item.kind === 'pickup') drawPickup(c, item, p.x, p.y, s);
  if (item.kind === 'boost') drawBoost(c, p.x, p.y, s);
  if (item.kind === 'hazard') {
    if (item.type === 'car') drawCar(c, p.x, p.y, s);
    if (item.type === 'bike') drawBike(c, p.x, p.y, s);
    if (item.type === 'agbero') drawAgbero(c, p.x, p.y, s);
  }
}

function drawRunner(c, w, h) {
  const style = selectedStyle();
  const y = h - Math.max(92, h * 0.15) + Math.sin(game.t * 11) * 4;
  const x = laneToX(game.runner.lane, y, w, h);
  const s = Math.min(1.2, Math.max(0.84, w / 390));

  c.save();
  c.translate(x + game.shake * rand(-6, 6), y);
  c.fillStyle = 'rgba(0, 0, 0, 0.28)';
  c.beginPath();
  c.ellipse(0, 47 * s, 36 * s, 10 * s, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = style.skinColor;
  c.lineWidth = 8 * s;
  c.lineCap = 'round';
  const swing = Math.sin(game.t * 11) * 8 * s;
  c.beginPath();
  c.moveTo(-20 * s, -4 * s);
  c.lineTo(-42 * s, 16 * s + swing);
  c.moveTo(20 * s, -4 * s);
  c.lineTo(42 * s, 14 * s - swing);
  c.moveTo(-12 * s, 40 * s);
  c.lineTo(-24 * s, 67 * s - swing * 0.4);
  c.moveTo(12 * s, 40 * s);
  c.lineTo(22 * s, 67 * s + swing * 0.4);
  c.stroke();

  c.fillStyle = style.secondaryColor;
  c.beginPath();
  c.moveTo(-28 * s, 24 * s);
  c.quadraticCurveTo(0, 48 * s, 28 * s, 24 * s);
  c.lineTo(18 * s, 52 * s);
  c.lineTo(-18 * s, 52 * s);
  c.closePath();
  c.fill();

  c.fillStyle = style.primaryColor;
  roundedRect(c, -23 * s, -18 * s, 46 * s, 54 * s, 18 * s);
  c.strokeStyle = '#fff7e8';
  c.lineWidth = 4 * s;
  c.beginPath();
  c.arc(0, 18 * s, 25 * s, 0.16, Math.PI - 0.16);
  c.stroke();

  c.fillStyle = style.bagColor;
  c.fillRect(-33 * s, 16 * s, 13 * s, 34 * s);

  c.fillStyle = style.skinColor;
  c.beginPath();
  c.ellipse(0, -42 * s, 22 * s, 27 * s, 0, 0, Math.PI * 2);
  c.fill();
  drawHair2d(c, 0, -50 * s, s * 82, style);
  drawAccessory2d(c, 0, -50 * s, s * 82, style);

  c.fillStyle = '#111';
  c.beginPath();
  c.arc(-7 * s, -43 * s, 2.6 * s, 0, Math.PI * 2);
  c.arc(8 * s, -43 * s, 2.6 * s, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#3b1c13';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.arc(0, -35 * s, 8 * s, 0.2, Math.PI - 0.2);
  c.stroke();

  c.fillStyle = '#111';
  c.fillRect(-27 * s, 68 * s, 15 * s, 10 * s);
  c.fillRect(13 * s, 68 * s, 15 * s, 10 * s);
  c.restore();
}

function drawEnergy(c, w, h) {
  const barW = Math.min(360, w - 32);
  const x = 16;
  const y = h - 28;
  c.fillStyle = 'rgba(255, 247, 232, 0.2)';
  roundedRect(c, x, y, barW, 12, 6);
  const grad = c.createLinearGradient(x, y, x + barW, y);
  grad.addColorStop(0, '#4caf50');
  grad.addColorStop(0.55, '#f7c948');
  grad.addColorStop(1, '#ef476f');
  c.fillStyle = grad;
  roundedRect(c, x, y, (barW * game.energy) / 100, 12, 6);
}

function drawMessage(c, w) {
  if (!game.messageTime) return;
  const alpha = clamp(game.messageTime, 0, 1);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(16, 20, 15, 0.86)';
  roundedRect(c, w / 2 - 150, 156, 300, 34, 8);
  c.fillStyle = '#fff7e8';
  c.font = '900 15px system-ui';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(game.message, w / 2, 173);
  c.restore();
}

function updateRunner(dt) {
  let steer = 0;
  if (game.keys.has('ArrowLeft') || game.keys.has('a')) steer -= 1;
  if (game.keys.has('ArrowRight') || game.keys.has('d')) steer += 1;
  game.runner.targetLane = clamp(game.runner.targetLane + steer * dt * 1.6, -1, 1);
  game.runner.lane += (game.runner.targetLane - game.runner.lane) * Math.min(1, dt * 9);
}

function update(dt) {
  game.t += dt;
  const running = game.mode === 'running';
  const slow = game.boostTime > 0 ? 0.55 : 1;
  game.roadTick = (game.roadTick + dt * (running ? game.speed * slow * 0.25 : 30)) % 48;
  game.messageTime = Math.max(0, game.messageTime - dt);

  if (!running) return;

  game.elapsed += dt;
  game.speed += dt * 9.5;
  game.boostTime = Math.max(0, game.boostTime - dt);
  game.shake = Math.max(0, game.shake - dt * 5);
  game.energy -= dt * (2.8 + game.elapsed / 28);
  updateRunner(dt);

  game.spawnPickup -= dt;
  game.spawnHazard -= dt;
  game.spawnBoost -= dt;
  if (game.spawnPickup <= 0) {
    spawnPickup();
    game.spawnPickup = rand(0.34, 0.72);
  }
  if (game.spawnHazard <= 0) {
    spawnHazard();
    game.spawnHazard = rand(0.76, 1.2) * Math.max(0.42, 1.1 - game.elapsed / 120);
  }
  if (game.spawnBoost <= 0) {
    spawnBoost();
    game.spawnBoost = rand(8.5, 12.5);
  }

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const playerY = h - Math.max(92, h * 0.15);
  const playerX = laneToX(game.runner.lane, playerY, w, h);

  for (const item of game.items) {
    item.y += game.speed * item.velocity * slow * dt;
    const p = itemScreen(item, w, h);
    const hit = Math.hypot(playerX - p.x, playerY - p.y) < item.radius * p.scale + 34;
    if (!item.dead && hit) {
      item.dead = true;
      if (item.kind === 'pickup') {
        game.streak += 1;
        game.bestStreak = Math.max(game.bestStreak, game.streak);
        game.score += item.points + game.streak * 5;
        game.energy = clamp(game.energy + 5.5, 0, 100);
        game.message = `Picked ${item.name}`;
      } else if (item.kind === 'boost') {
        game.boostTime = 2.7;
        game.streak += 2;
        game.bestStreak = Math.max(game.bestStreak, game.streak);
        game.score += 95;
        game.message = 'Time boost';
      } else {
        game.streak = 0;
        game.energy -= item.damage;
        game.shake = 0.35;
        game.message = item.type === 'agbero' ? 'Agbero touched you' : item.type === 'bike' ? 'Okada close call' : 'Car hit';
      }
      game.messageTime = 1.15;
    }
  }

  game.items = game.items.filter((item) => !item.dead && item.y < h + 90);
  if (game.energy <= 0) {
    game.energy = 0;
    endRun();
  }
  updateHud();
}

function render() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, h);
  drawRoad(ctx, w, h);
  drawStalls(ctx, w, h);
  drawSign(ctx, w, h);
  [...game.items].sort((a, b) => a.y - b.y).forEach((item) => drawItem(ctx, item, w, h));
  drawRunner(ctx, w, h);
  drawEnergy(ctx, w, h);
  drawMessage(ctx, w);
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function loop(now) {
  const seconds = now / 1000;
  const dt = Math.min(0.033, seconds - (game.last || seconds));
  game.last = seconds;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function pointerLane(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  return clamp(((point.clientX - rect.left) / rect.width - 0.5) * 2.1, -1, 1);
}

ui.start.addEventListener('click', resetRun);
ui.again.addEventListener('click', resetRun);
ui.showBoard.addEventListener('click', loadLeaderboard);
ui.refreshBoard.addEventListener('click', loadLeaderboard);
ui.signin.addEventListener('click', signIn);
ui.marketOptions.forEach((button) => button.addEventListener('click', () => setMarket(button.dataset.market)));
ui.avatarOptions.forEach((button) => button.addEventListener('click', () => setAvatar(button.dataset.avatar)));

addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key)) {
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
  game.runner.targetLane = pointerLane(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!game.pointer.active || game.mode !== 'running') return;
  game.runner.targetLane = pointerLane(event);
});

canvas.addEventListener('pointerup', () => {
  game.pointer.active = false;
});

canvas.addEventListener('pointercancel', () => {
  game.pointer.active = false;
});

addEventListener('resize', resize);
addEventListener('focus', () => loadPlayer());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadPlayer();
});

document.body.dataset.screen = 'title';
renderAvatarOptions();
setMarket('balogun');
setAvatar('aisha');
player.face = drawFaceToCanvas(128, avatarPresets.aisha).toDataURL('image/png');
renderPlayerCard();
resize();
loadPlayer().then(loadLeaderboard);
requestAnimationFrame(loop);
