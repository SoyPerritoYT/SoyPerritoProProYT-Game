const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const root = __dirname;
const rooms = new Map();
function room(id) { if (!rooms.has(id)) rooms.set(id, { players: new Map(), streams: new Set() }); return rooms.get(id); }
function send(res, status, body, type = 'application/json') { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
function broadcast(current, data) { const line = `data: ${JSON.stringify(data)}\n\n`; current.streams.forEach(stream => stream.write(line)); }
function body(req) { return new Promise(resolve => { let text = ''; req.on('data', chunk => { text += chunk; if (text.length > 400000) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(text || '{}')); } catch { resolve({}); } }); }); }
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/events') { const current = room(url.searchParams.get('room') || ''); res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'Cache-Control': 'no-cache' }); res.write(': connected\n\n'); current.streams.add(res); req.on('close', () => current.streams.delete(res)); return; }
  if (url.pathname === '/api/join' && req.method === 'POST') { const data = await body(req); const id = String(data.id || randomUUID()), current = room(String(data.room || '')); current.players.set(id, { id, name: String(data.name || 'Perrito').slice(0, 14), skin: data.skin || 'gold', x: 280, y: 320, facing: 1, seen: Date.now() }); broadcast(current, { type: 'player', player: current.players.get(id) }); return send(res, 200, { id, players: [...current.players.values()] }); }
  if (url.pathname === '/api/state' && req.method === 'POST') { const data = await body(req), current = room(String(data.room || '')), player = current.players.get(data.id); if (player) { Object.assign(player, { x: Number(data.x) || 0, y: Number(data.y) || 0, facing: data.facing === -1 ? -1 : 1, seen: Date.now() }); broadcast(current, { type: 'player', player }); } return send(res, 200, { ok: true }); }
  if (url.pathname === '/api/block' && req.method === 'POST') { const data = await body(req), current = room(String(data.room || '')); broadcast(current, { type: 'block', id: data.id, x: Number(data.x), y: Number(data.y), value: Number(data.value) }); return send(res, 200, { ok: true }); }
  const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1); const file = path.resolve(root, requested);
  if ((file !== root && !file.startsWith(`${root}${path.sep}`)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'No encontrado', 'text/plain');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
server.listen(process.env.PORT || 4173, () => console.log('SoyPerrito listo en http://localhost:4173'));
