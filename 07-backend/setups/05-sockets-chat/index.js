import { createServer } from "node:http";
import express from "express";
import path from "node:path";
import { Server } from "socket.io";

const PORT = 4214;
const main = async () => {
  const app = express();
  app.use(express.static(path.resolve("public")));

    const server = createServer(app);
    
    // 1. Create a new insteanmce of io soicket
  const io = new Server();

     // 2. Attach the http server to it
    io.attach(server);
    
    // 3. Start listening to this server
    io.on('connection', socket => {
        console.log('A new Socket has connected', socket.id);
    });

  app.get("/health", (req, res) => {
    res.send("Health Check Success");
  });

  server.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`);
  });
};

main();
