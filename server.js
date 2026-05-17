const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 3000 });

let rooms = {};

server.on("connection", (socket) => {
  socket.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      socket.room = data.room;
      socket.id = data.id;

      if (!rooms[socket.room]) rooms[socket.room] = [];
      rooms[socket.room].push(socket);

      const users = rooms[socket.room].map(s => s.id);
      rooms[socket.room].forEach(s => {
        s.send(JSON.stringify({ type: "users", users }));
      });
    }

    if (data.to) {
      const target = rooms[socket.room].find(s => s.id === data.to);
      if (target) target.send(JSON.stringify(data));
    }
  });

  socket.on("close", () => {
    if (!socket.room) return;
    rooms[socket.room] = rooms[socket.room].filter(s => s !== socket);
  });
});

console.log("Serveur lancé sur port 3000");