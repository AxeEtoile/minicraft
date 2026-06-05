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

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // 🔑 REJOINDRE
    if (data.type === "join") {
      roomCode = data.room;

      if (!rooms[roomCode]) {
        rooms[roomCode] = {
          players: {},
          blocks: [] // 💥 STOCK DES BLOCS
        };
      }

      rooms[roomCode].players[playerId] = {
        x: 0,
        y: 0,
        ws: ws
      };

      // 🔄 ENVOI INITIAL
      ws.send(JSON.stringify({
        type: "init",
        id: playerId,
        players: cleanPlayers(rooms[roomCode].players),
        blocks: rooms[roomCode].blocks // 💥 ENVOI DES BLOCS
      }));
    }

    // 🎮 MOUVEMENT
    if (data.type === "move" && roomCode) {
      let room = rooms[roomCode];
      if (!room.players[playerId]) return;

      room.players[playerId].x = data.position.x;
      room.players[playerId].y = data.position.y;

      broadcast(roomCode, {
        type: "update",
        players: cleanPlayers(room.players)
      });
    }

    // 🧱 POSER BLOC
    if (data.type === "placeBlock" && roomCode) {
      let room = rooms[roomCode];

      room.blocks.push(data.block);

      broadcast(roomCode, {
        type: "blockUpdate",
        blocks: room.blocks
      });
    }

    // ❌ CASSER BLOC
    if (data.type === "breakBlock" && roomCode) {
      let room = rooms[roomCode];

      room.blocks = room.blocks.filter(
        b => !(b.x === data.block.x && b.y === data.block.y)
      );

      broadcast(roomCode, {
        type: "blockUpdate",
        blocks: room.blocks
      });
    }
  });

  // ❌ DECO
  ws.on("close", () => {
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode].players[playerId];

      broadcast(roomCode, {
        type: "update",
        players: cleanPlayers(rooms[roomCode].players)
      });
    }
  });
});

// 📡 BROADCAST ROOM
function broadcast(roomCode, data) {
  let room = rooms[roomCode];
  if (!room) return;

  Object.values(room.players).forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(data));
    }
  });
}

// 🧹 CLEAN
function cleanPlayers(players) {
  let result = {};
  for (let id in players) {
    result[id] = {
      x: players[id].x,
      y: players[id].y
    };
  }
  return result;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Serveur lancé sur port", PORT);
});
