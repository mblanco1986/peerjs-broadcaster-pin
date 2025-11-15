const express = require("express");
const { ExpressPeerServer } = require("peer");
const bodyParser = require("body-parser");

const app = express();
const server = require("http").createServer(app);
const peerServer = ExpressPeerServer(server, { debug: true });

app.use("/peerjs", peerServer);
app.use(bodyParser.json());
app.use(express.static("public"));

const pins = {}; // {streamId: PIN}

// Guardar PIN
app.post("/set-pin", (req, res) => {
  const { streamId, pin } = req.body;
  pins[streamId] = pin;
  res.json({ ok: true });
});

// Verificar PIN y devolver streamId real
app.post("/access", (req, res) => {
  const { pin } = req.body;

  const entry = Object.entries(pins).find(([id, p]) => p === pin);
  if (!entry) return res.json({ ok: false });

  return res.json({ ok: true, streamId: entry[0] });
});

app.get("/status", (req, res) => {
  res.json({ status: "running" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor WebRTC activo en PORT", PORT));
