import 'dotenv/config';
import { createServer } from 'node:http';
import { expressApplication } from './app/index.js';

const PORT = process.env.PORT || 4000


async function main() {
  try {
      const server = createServer(expressApplication());

      server.listen(PORT, () => {
        console.log("Server is Listening at Port: ",PORT)
      })
  } catch (error) {
      console.log("Error Starting the server");
      throw error
  }
}

main()