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
    
    // 3. Start listening to socket connections
    io.on('connection', socket => {
        console.log('A new Socket has connected:', socket.id);

        socket.on("user:message", (data) => {
            console.log(`[User ${socket.id}] sent message:`, data);

            const payload = {
                text: typeof data === "string" ? data : data.text,
                senderId: socket.id,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            // Broadcast to all connected sockets
            io.emit("server:message", payload);
        });

        socket.on("disconnect", () => {
            console.log('Socket disconnected:', socket.id);
        });
    });

  app.get("/health", (req, res) => {
    res.send("Health Check Success");
  });

  server.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`);
  });
};

main();
