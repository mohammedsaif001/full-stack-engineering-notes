import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const stream = await client.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content:
          "Brief me about Game of thrones in and around 1000 words make sure its properly structure in a  para and i grasp it",
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    if (chunk?.delta) {
      process.stdout.write(chunk.delta);
    }
  }
}

main();
