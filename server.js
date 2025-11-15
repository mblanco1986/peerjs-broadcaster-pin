// server.js
// PeerJS signaling + endpoints mínimos para registro de broadcasters con PIN
const express = require('express');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // para parsing JSON

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

// HTTP server
const server = http.createServer(app);

// PeerJS server en /peerjs
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
});
app.use('/peerjs', peerServer);

// Map en memoria para broadcasters registrados { id: { pin, expiresAt } }
const broadcasters = {};
const BROADCAST_TTL_MS = 1000 * 60 * 30; // 30 minutos por defecto

// Endpoint para registrar un broadcaster con PIN
// Body: { id: "peer-id", pin: "1234" }
app.post('/register', (req, res) => {
  const { id, pin } = req.body || {};
  if (!id || !pin) return res.status(400).json({ ok: false, error: 'id y pin requeridos' });

  broadcasters[id] = {
    pin: String(pin),
    expiresAt: Date.now() + BROADCAST_TTL_MS
  };
  return res.json({ ok: true });
});

// Endpoint para validar PIN de un broadcaster antes de conectar
// Query: /validate?id=PEER_ID&pin=PIN
app.get('/validate', (req, res) => {
  const { id, pin } = req.query;
  if (!id || !pin) return res.status(400).json({ ok: false, error: 'id y pin requeridos' });

  const entry = broadcasters[id];
  if (!entry) return res.status(404).json({ ok: false, error: 'broadcaster no encontrado' });
  if (Date.now() > entry.expiresAt) {
    delete broadcasters[id];
    return res.status(410).json({ ok: false, error: 'registro expirado' });
  }

  if (String(pin) === entry.pin) return res.json({ ok: true });
  return res.status(403).json({ ok: false, error: 'PIN inválido' });
});

// Opción: permitir que broadcaster renueve su registro (POST /renew)
app.post('/renew', (req, res) => {
  const { id, pin } = req.body || {};
  if (!id || !pin) return res.status(400).json({ ok: false, error: 'id y pin requeridos' });
  const entry = broadcasters[id];
  if (!entry || String(entry.pin) !== String(pin)) return res.status(403).json({ ok: false, error: 'no autorizado' });
  entry.expiresAt = Date.now() + BROADCAST_TTL_MS;
  return res.json({ ok: true });
});

// Limpieza periódica de broadcasters expirados
setInterval(() => {
  const now = Date.now();
  for (const id of Object.keys(broadcasters)) {
    if (broadcasters[id].expiresAt < now) delete broadcasters[id];
  }
}, 1000 * 60); // cada 60s

app.get('/status', (req, res) => res.send('PeerJS + registry running'));

// Puerto (Glitch usa process.env.PORT)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`PeerJS signalling en /peerjs`);
});
