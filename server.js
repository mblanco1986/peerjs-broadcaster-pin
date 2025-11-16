const express = require("express");
const { ExpressPeerServer } = require("peer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Servir los HTML desde /public
app.use(express.static(path.join(__dirname, "public")));

// Servidor HTTP
const server = require("http").createServer(app);

// Servidor PeerJS
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/"
});

// Montar /peerjs
app.use("/peerjs", peerServer);

// Endpoints para PIN
const pins = {};

app.post("/set-pin", (req, res) => {
  const { streamId, pin } = req.body;
  pins[streamId] = pin;
  res.json({ ok: true });
});

app.post("/access", (req, res) => {
  const { pin } = req.body;
  const entry = Object.entries(pins).find(([id, p]) => p === pin);

  if (!entry) return res.json({ ok: false });
  return res.json({ ok: true, streamId: entry[0] });
});

// Puerto asignado por Render
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Servidor WebRTC activo en PORT", PORT);
});
