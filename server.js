const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");

// ✅ ROOMS (étape 1)
let rooms = {};

const server = http.createServer((req, res) => {
  fs.readFile("minicraft_vmultiplayer.html", (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("Erreur serveur");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

// ✅ WEBSOCKET
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  let roomCode = null;
  let playerId = Math.random().toString(36).substr(2, 9);

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // 🔑 rejoindre une room
    if (data.type === "join") {
      roomCode = data.room;

      if (!rooms[roomCode]) {
        rooms[roomCode] = {};
      }

      rooms[roomCode][playerId] = { x: 0, y: 0 };

      ws.send(JSON.stringify({
        type: "init",
        id: playerId,
        players: rooms[roomCode]
      }));
    }

    // 🎮 mouvement
    if (data.type === "move" && roomCode) {
      rooms[roomCode][playerId] = data.position;

      // envoyer aux joueurs de la room
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "update",
            players: rooms[roomCode]
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode][playerId];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Serveur lancé");
});
