const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");

// 📦 ROOMS
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

// 🔌 WEBSOCKET
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  let roomCode = null;
  let playerId = Math.random().toString(36).substr(2, 9);

  ws.playerId = playerId;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // 🔑 REJOINDRE UNE ROOM
    if (data.type === "join") {
      roomCode = data.room;

      if (!rooms[roomCode]) {
        rooms[roomCode] = {};
      }

      rooms[roomCode][playerId] = {
        x: 0,
        y: 0,
        ws: ws
      };

      ws.send(JSON.stringify({
        type: "init",
        id: playerId,
        players: cleanPlayers(rooms[roomCode])
      }));

      console.log("Joueur rejoint room :", roomCode);
    }

    // 🎮 MOUVEMENT
    if (data.type === "move" && roomCode) {
      if (!rooms[roomCode][playerId]) return;

      rooms[roomCode][playerId].x = data.position.x;
      rooms[roomCode][playerId].y = data.position.y;

      // envoyer aux joueurs de la même room
      Object.values(rooms[roomCode]).forEach((player) => {
        if (player.ws !== ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: "update",
            players: cleanPlayers(rooms[roomCode])
          }));
        }
      });
    }
  });

  // ❌ DECONNEXION
  ws.on("close", () => {
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode][playerId];

      // update pour les autres
      Object.values(rooms[roomCode]).forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: "update",
            players: cleanPlayers(rooms[roomCode])
          }));
        }
      });

      console.log("Joueur quitté :", roomCode);
    }
  });
});

// 🧹 enlever les ws avant envoi au client
function cleanPlayers(room) {
  let result = {};
  for (let id in room) {
    result[id] = {
      x: room[id].x,
      y: room[id].y
    };
  }
  return result;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Serveur lancé sur port", PORT);
});
