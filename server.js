const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");

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

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  let roomCode = null;
  let playerId = Math.random().toString(36).substr(2, 9);

  ws.playerId = playerId;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      roomCode = data.room || "default";

      if (!rooms[roomCode]) rooms[roomCode] = {};

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
    }

    if (data.type === "move" && roomCode) {
      if (!rooms[roomCode][playerId]) return;

      rooms[roomCode][playerId].x = data.position.x;
      rooms[roomCode][playerId].y = data.position.y;

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

  ws.on("close", () => {
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode][playerId];

      Object.values(rooms[roomCode]).forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: "update",
            players: cleanPlayers(rooms[roomCode])
          }));
        }
      });
    }
  });
});

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

server.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});
