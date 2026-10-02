import 'dotenv/config'
import { createServer } from "node:http";
import app from "./src/app/index.js";
import booksRouter from "./src/router/books.router.js";
import usersRouter from "./src/router/users.router.js";

const PORT = process.env.PORT || 3000;

const server = createServer(app);

app.use("/books", booksRouter);
app.use("/users", usersRouter);

app.get('/health', (req, res) => {
  res.send('Health is OK!')
})


server.listen(PORT, async () => {
  try {
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.error("Error ", error.message);
  }
});
