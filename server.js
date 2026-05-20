const http = require("http");
const fs = require("fs");

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Serveur lancé");
});
