const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const startButton = document.querySelector('#startButton');
const welcome = document.querySelector('#welcome');
const pausePanel = document.querySelector('#pausePanel');
const pauseButton = document.querySelector('#pauseButton');
const blockCount = document.querySelector('#blockCount');
const bestCount = document.querySelector('#bestCount');
const hint = document.querySelector('#hint');
const friendsButton = document.querySelector('#friendsButton');
const friendsPanel = document.querySelector('#friendsPanel');
const closeFriends = document.querySelector('#closeFriends');
const roomCode = document.querySelector('#roomCode');
const joinRoom = document.querySelector('#joinRoom');
const playerName = document.querySelector('#playerName');
const roomStatus = document.querySelector('#roomStatus');
const skinList = document.querySelector('#skinList');
const skinUpload = document.querySelector('#skinUpload');
const fullscreenButton = document.querySelector('#fullscreenButton');

const TILE = 40, WORLD_W = 160, WORLD_H = 18;
const keys = new Set();
const world = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(0));
let running = false, paused = false, lastTime = 0, cameraX = 0, facing = 1, blocks = 0, best = 0, gamepadAction = false;
let networkTimer = 0;
const online = { room: '', id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`, players: new Map(), source: null };
const skins = { gold: ['#f7b758', '#d9873a'], blue: ['#65b9e8', '#2875b6'], forest: ['#79b95b', '#3c7a3f'], pink: ['#f49bb4', '#b84d78'], space: ['#8c83da', '#433d83'], snow: ['#f4f7ff', '#80b8d2'], lava: ['#fb8c45', '#b43b2e'], royal: ['#ffd65a', '#7452b8'] };
let selectedSkin = 'gold', customSkin = '', customImage;
const player = { x: 7 * TILE, y: 0, w: 27, h: 36, vx: 0, vy: 0, grounded: false };

try { best = Number(localStorage.getItem('soyperrito-blocks-best') || 0); } catch { /* Compatible con navegadores de TV sin almacenamiento. */ }
bestCount.textContent = best;

function terrain() {
  let surface = 11;
  for (let x = 0; x < WORLD_W; x += 1) {
    // Semilla determinista: todos los jugadores de una sala ven el mismo terreno.
    if (x % 9 === 0) surface += ((x * 17 + 13) % 11) > 5 ? 1 : -1;
    surface = Math.max(8, Math.min(13, surface));
    for (let y = surface; y < WORLD_H; y += 1) world[y][x] = y === surface ? 1 : y < surface + 3 ? 2 : 3;
    if (x % 17 === 5) { for (let y = surface - 3; y < surface; y += 1) world[y][x] = 4; world[surface - 4][x] = 5; }
  }
  player.y = (8 * TILE);
}

function tileAt(px, py) {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  return world[y] && world[y][x] || 0;
}
function solid(px, py) { return tileAt(px, py) > 0; }
function showHint(text) { hint.textContent = text; hint.classList.add('show'); setTimeout(() => hint.classList.remove('show'), 900); }

function updatePlayer(dt) {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  if (left) { player.vx = -210; facing = -1; } else if (right) { player.vx = 210; facing = 1; } else player.vx *= .72;
  player.vy = Math.min(player.vy + 1250 * dt, 720);
  const nextX = player.x + player.vx * dt;
  const edgeX = nextX + (player.vx > 0 ? player.w : 0);
  if (!solid(edgeX, player.y + 5) && !solid(edgeX, player.y + player.h - 4)) player.x = nextX;
  const nextY = player.y + player.vy * dt;
  if (player.vy >= 0 && (solid(player.x + 4, nextY + player.h) || solid(player.x + player.w - 4, nextY + player.h))) {
    player.y = Math.floor((nextY + player.h) / TILE) * TILE - player.h;
    player.vy = 0; player.grounded = true;
  } else if (player.vy < 0 && (solid(player.x + 4, nextY) || solid(player.x + player.w - 4, nextY))) player.vy = 0;
  else { player.y = nextY; player.grounded = false; }
  player.x = Math.max(0, Math.min(player.x, WORLD_W * TILE - player.w));
  cameraX += ((player.x - canvas.width * .33) - cameraX) * Math.min(1, dt * 5);
  cameraX = Math.max(0, Math.min(cameraX, WORLD_W * TILE - canvas.width));
}

function jump() { if (running && !paused && player.grounded) { player.vy = -470; player.grounded = false; } }
function targetTile() { return { x: Math.floor((player.x + (facing > 0 ? player.w + 18 : -18)) / TILE), y: Math.floor((player.y + player.h - 14) / TILE) }; }
function mine() {
  if (!running || paused) return;
  const t = targetTile();
  if (world[t.y] && world[t.y][t.x] && world[t.y][t.x] !== 5) {
    world[t.y][t.x] = 0;
    blocks += 1;
    blockCount.textContent = blocks;
    if (blocks > best) {
      best = blocks;
      bestCount.textContent = best;
      try { localStorage.setItem('soyperrito-blocks-best', best); } catch { /* Conserva el récord mientras dure la sesión. */ }
    }
    shareBlock(t.x, t.y, 0); showHint('+1 BLOQUE');
  }
  else showHint('ACÉRCATE A UN BLOQUE');
}
function place() {
  if (!running || paused || !blocks) return showHint(blocks ? '' : 'NECESITAS BLOQUES');
  const t = targetTile();
  if (world[t.y] && !world[t.y][t.x]) { world[t.y][t.x] = 2; blocks -= 1; blockCount.textContent = blocks; shareBlock(t.x, t.y, 2); showHint('BLOQUE COLOCADO'); }
}
function drawTile(type, x, y) {
  const sx = x * TILE - cameraX, sy = y * TILE;
  const colors = ['', '#5cae4a', '#9b6038', '#785334', '#80522f', '#438b43'];
  ctx.fillStyle = colors[type]; ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
  if (type === 1) { ctx.fillStyle = '#7ed25b'; ctx.fillRect(sx, sy, TILE, 9); }
  if (type === 3) { ctx.fillStyle = '#96643b'; ctx.fillRect(sx + 7, sy + 10, 6, 5); ctx.fillRect(sx + 27, sy + 25, 5, 5); }
  if (type === 4) { ctx.fillStyle = '#5c391e'; ctx.fillRect(sx + 16, sy, 9, TILE); }
  if (type === 5) { ctx.fillStyle = '#3d9148'; ctx.fillRect(sx - 14, sy + 5, 68, 27); ctx.fillStyle = '#65af51'; ctx.fillRect(sx - 4, sy, 46, 18); }
  ctx.strokeStyle = '#173a4a33'; ctx.strokeRect(sx, sy, TILE, TILE);
}
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height); sky.addColorStop(0, '#73c7f3'); sky.addColorStop(1, '#d6f1ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff7a5'; ctx.fillRect(canvas.width - 170, 55, 55, 55);
  ctx.fillStyle = '#ffffff88'; ctx.fillRect(100, 85, 150, 16); ctx.fillRect(160, 69, 70, 16); ctx.fillRect(570, 145, 180, 15);
  const from = Math.max(0, Math.floor(cameraX / TILE) - 1), to = Math.min(WORLD_W, from + Math.ceil(canvas.width / TILE) + 3);
  for (let y = 0; y < WORLD_H; y += 1) for (let x = from; x < to; x += 1) if (world[y][x]) drawTile(world[y][x], x, y);
  const px = player.x - cameraX, py = player.y;
  ctx.save(); if (facing < 0) { ctx.translate(px + player.w, py); ctx.scale(-1, 1); ctx.translate(-px, -py); }
  const ownPalette = skins[selectedSkin] || skins.gold; ctx.fillStyle = ownPalette[1]; ctx.fillRect(px + 3, py + 15, 24, 20); ctx.fillStyle = ownPalette[0]; ctx.fillRect(px, py, 27, 22); ctx.fillStyle = '#5a392c'; ctx.fillRect(px + 4, py - 6, 8, 11); ctx.fillRect(px + 19, py - 6, 8, 11); ctx.fillStyle = '#1d3045'; ctx.fillRect(px + 7, py + 7, 4, 4); ctx.fillRect(px + 19, py + 7, 4, 4); ctx.fillRect(px + 13, py + 14, 5, 4); if (customImage && customImage.complete) ctx.drawImage(customImage, px, py, 27, 27); ctx.restore();
  if (running && !paused) { const t = targetTile(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(t.x * TILE - cameraX + 2, t.y * TILE + 2, TILE - 4, TILE - 4); }
  online.players.forEach(remote => { if (remote.id === online.id) return; drawDog(remote.x - cameraX, remote.y, remote.facing, remote.skin, remote.name); });
}
function drawDog(x, y, direction, skin, name) { const palette = skins[skin] || skins.gold; ctx.save(); if (direction < 0) { ctx.translate(x + player.w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); } ctx.fillStyle = palette[1]; ctx.fillRect(x + 3, y + 15, 24, 20); ctx.fillStyle = palette[0]; ctx.fillRect(x, y, 27, 22); ctx.fillStyle = '#26364b'; ctx.fillRect(x + 7, y + 7, 4, 4); ctx.fillRect(x + 19, y + 7, 4, 4); ctx.restore(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText(name || 'Amigo', x + 14, y - 10); }
function loop(time) { const dt = Math.min((time - lastTime) / 1000 || 0, .05); lastTime = time; if (running && !paused) { updatePlayer(dt); if (online.room && time - networkTimer > 100) { networkTimer = time; post('/api/state', { room: online.room, id: online.id, x: player.x, y: player.y, facing }); } } render(); requestAnimationFrame(loop); }
function start() { running = true; paused = false; welcome.classList.add('hidden'); pausePanel.classList.add('hidden'); canvas.focus(); }
function togglePause() { if (!running) return; paused = !paused; pausePanel.classList.toggle('hidden', !paused); pauseButton.textContent = paused ? '▶' : 'Ⅱ'; if (!paused) canvas.focus(); }
function action(name) { ({ jump, mine, place }[name] || (() => {}))(); }

async function post(url, payload) { if (!online.room) return; try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch { roomStatus.textContent = 'Sin conexión al servidor'; } }
function shareBlock(x, y, value) { post('/api/block', { room: online.room, id: online.id, x, y, value }); }
function selectSkin(id) { selectedSkin = id; try { localStorage.setItem('soyperrito-skin', id); } catch { /* No afecta a la partida. */ } [...skinList.children].forEach(button => button.classList.toggle('selected', button.dataset.skin === id)); }
function setupFriends() {
  try { selectedSkin = localStorage.getItem('soyperrito-skin') || 'gold'; playerName.value = localStorage.getItem('soyperrito-name') || 'SoyPerrito'; } catch { playerName.value = 'SoyPerrito'; }
  Object.entries(skins).forEach(([id, colors]) => { const button = document.createElement('button'); button.dataset.skin = id; button.innerHTML = `<span class="skin-swatch" style="background:linear-gradient(135deg,${colors[0]} 50%,${colors[1]} 50%)"></span>${id.toUpperCase()}`; button.addEventListener('click', () => selectSkin(id)); skinList.append(button); });
  selectSkin(selectedSkin);
  friendsButton.addEventListener('click', () => friendsPanel.classList.remove('hidden')); closeFriends.addEventListener('click', () => friendsPanel.classList.add('hidden'));
  playerName.addEventListener('change', () => { try { localStorage.setItem('soyperrito-name', playerName.value); } catch { /* No afecta a la partida. */ } });
  skinUpload.addEventListener('change', event => { const file = event.target.files[0]; if (!file || file.size > 250000) return showHint('USA UNA IMAGEN MENOR DE 250 KB'); const reader = new FileReader(); reader.onload = () => { customSkin = reader.result; customImage = new Image(); customImage.src = customSkin; showHint('SKIN IMPORTADA (LOCAL)'); }; reader.readAsDataURL(file); });
  joinRoom.addEventListener('click', async () => { const code = roomCode.value.trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase(); roomCode.value = code; try { const response = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: code, id: online.id, name: playerName.value || 'SoyPerrito', skin: selectedSkin }) }); const data = await response.json(); online.room = code; online.players = new Map(data.players.map(item => [item.id, item])); if (online.source) online.source.close(); online.source = new EventSource(`/events?room=${encodeURIComponent(code)}`); online.source.onmessage = event => { const message = JSON.parse(event.data); if (message.type === 'player') online.players.set(message.player.id, message.player); if (message.type === 'block' && message.id !== online.id && world[message.y]) world[message.y][message.x] = message.value; }; roomStatus.textContent = `Sala ${code}: comparte este código con tus amigos`; friendsPanel.classList.add('hidden'); showHint('SALA CREADA: ' + code); } catch { roomStatus.textContent = 'No se pudo conectar. Ejecuta npm start.'; } });
}

startButton.addEventListener('click', start); pauseButton.addEventListener('click', togglePause);
fullscreenButton.addEventListener('click', () => { const target = document.documentElement; const request = target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen; if (request) request.call(target); else showHint('PANTALLA COMPLETA NO DISPONIBLE'); });
document.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) keys.add(event.code); if (['Enter', 'Space'].includes(event.code)) { event.preventDefault(); running ? jump() : start(); } if (event.code === 'ArrowDown') { event.preventDefault(); mine(); } if (event.code === 'ArrowUp') { event.preventDefault(); place(); } if (['KeyP', 'Escape', 'BrowserBack', 'GoBack'].includes(event.code)) togglePause(); });
document.addEventListener('keyup', event => keys.delete(event.code));
document.querySelectorAll('[data-action]').forEach(button => { const name = button.dataset.action; button.addEventListener('pointerdown', () => { button.dataset.pointerUsed = 'true'; if (name === 'left') keys.add('ArrowLeft'); else if (name === 'right') keys.add('ArrowRight'); else action(name); }); button.addEventListener('pointerup', () => keys.delete(name === 'left' ? 'ArrowLeft' : 'ArrowRight')); button.addEventListener('pointerleave', () => keys.delete(name === 'left' ? 'ArrowLeft' : 'ArrowRight')); button.addEventListener('click', () => { if (button.dataset.pointerUsed === 'true') { button.dataset.pointerUsed = 'false'; return; } action(name); }); });
function pressed(pad, index) { return Boolean(pad && pad.buttons[index] && pad.buttons[index].pressed); }
function gamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && pads[0];
  if (pad) {
    const left = (pad.axes[0] || 0) < -.3 || pressed(pad, 14);
    const right = (pad.axes[0] || 0) > .3 || pressed(pad, 15);
    if (left) keys.add('ArrowLeft'); else keys.delete('ArrowLeft');
    if (right) keys.add('ArrowRight'); else keys.delete('ArrowRight');
    const cross = pressed(pad, 0), circle = pressed(pad, 1), up = pressed(pad, 12), down = pressed(pad, 13), options = pressed(pad, 9);
    const anyAction = cross || circle || up || down || options;
    if (!gamepadAction) {
      if (cross) { if (running) jump(); else start(); }
      else if (down && running) mine();
      else if ((up || circle) && running) place();
      else if (options && running) togglePause();
    }
    gamepadAction = anyAction;
  }
  requestAnimationFrame(gamepad);
}
terrain(); setupFriends(); requestAnimationFrame(loop); requestAnimationFrame(gamepad); setTimeout(() => startButton.focus(), 100);
