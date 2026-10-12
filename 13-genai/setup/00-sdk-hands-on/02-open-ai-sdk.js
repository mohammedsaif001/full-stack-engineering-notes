import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from 'openai/helpers/zod';

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const RiskSchema = z.object({
  title: z.string().describe("The actual title of the risk"),
  tags: z.array(z.string()).describe("3-4 tags for this risk"),
  score: z
    .number()
    .min(1)
    .max(5)
    .describe("The risk score on the scale of 1 to 5"),
});

const outputSchema = z.object({
  risks: z.array(RiskSchema).describe("Array of risks"),
});

async function main() {
  const response = await client.responses.parse({
    model: "gpt-4o-mini",
    text: {
      format: zodTextFormat(outputSchema, "risks"),
    },
    input: `
      Extract the risks from the following document

      Document:
      Our company recently launched a new software platform. 
      The platform relies on several third-party APIs that may experience downtime. 
      In addition, we are storing customer data in the cloud, and there are strict 
      regulatory requirements regarding data privacy and protection. 
      Some features are still in beta and could potentially introduce bugs 
      that affect user experience. 

      Please list any risks you find in the document above.
    `,
  });

  //   const res1 = await client.chat.completions.create({
  //     model: "gpt-4o-mini",
  //     messages: [{ role: "user", content: prompt }],
  //   });

  //   const res2 = await client.responses.create({
  //     model: "gpt-4o-mini",
  //     messages: [{ role: "user", content: prompt }],
    //   });
    
    // console.log(res2.choices[0].message.content);

  console.log(response.output_parsed);
}

main();