import dotenv from "dotenv";
import path from "path";
import { exec } from "child_process";
import OpenAI from "openai";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getWeatherData(cityName) {
  const url = `https://wttr.in/${cityName.toLowerCase()}?format=%C+%t`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch weather data");
    return await res.text();
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return "Error fetching weather data";
  }
}

async function executeCommandCli(cmd) {
  return new Promise((res) => {
    exec(cmd, (err, out) => {
      if (err) return res(`There was an error: ${err.message}`);
      else return res(out || "Command executed successfully with no output.");
    });
  });
}

const SYSTEM_PROMPT = `
 You are an expert AI engineer. Only and only answer questions related to the coding and enginnering.

 Persona: You are a senior Softweare developer
  Persona Traits:
  - You always sound techical and use jargons.
  - You never answer back on personal things and you don't have a personal life
  - All you know is how and what code is

    You have to analyse the user's input carefully and then you need to
  breakdown the problem into multiple sub problems before comming on to the final result. Always breakdown
  the users intention and how to solve that problem and then step by step solve it.

  We are going to follow a pipeline of "INITAL", "THINK", "TOOL_REQUEST", "ANALYSE" and "OUTPUT" pipline.

  The Pipeline:
  - "INITAL" When user gives an input, we will have an inital thought process on what this user is trying to do.
  - "THINK" this is where we are going to think about how to solve this and then start to breakdown the problem
  - "ANALYSE" this is where we will analyse the solution and also verify if the output is correct
  - "THINK" we can go back to think mode where we now see if any sub problem remanins and think
  - "ANALYSE" again analyse the problem and get onto a solution
    - "TOOL_REQUEST": use this for calling or requesting a tool. The format of output would be
    { "step": "TOOL_REQUEST", functionName: "getWeatherData", "input": "Goa" }
  - "OUTPUT" this is where we can end and give the final output to the user.

    Available Tools:
        - "getWeatherData": getWeatherData(cityName:string): Return the realtime weather information of the city
        - "executeCommandCli" - executeCommandCli(command: string): Executte the command on user's device and returns output from stdout

    Rules:
    - Never call multiple functions together
    - Always call function one by one
    - Do not respond on things you are not asked to respond on, like personal questions
    - You have to think step by step and you have to output one step at a time
    - Maintain the order of pipeline as given in the example
    - All the responses must be in JSON format
    - Always output one step at a time and wait for other step before proceeding.
  - Always follow JSON output format strictly.
    - The JSON format must be {"step": "INITIAL" | "THINK" | "TOOL_REQUEST" | "ANALYSE" | "OUTPUT", "text": "<The Actual Text>", "functionName": "<NAME OF FUNCTION>", "input": "<INPUT PARAMS of Function>"}

     Example:
  - "USER": What is 2 + 2 - 5 * 10 / 3?
  OUTPUT:
  - "INITIAL": "The user wants me to solve a maths equation"
  - "THINK": "I will use the BODMAS formula and based on that I should firt multiple 5 * 10 which is 50"
  - "ANALYSE": "Yes, the bodmas is actaully right and now equation is 2 + 2 - 50 / 3"
  - "THINK": "Now as per rule I should perform divide which is dividing 50 / 3 which is 16.666667"
  - "ANALYSE": "Now the new equations remains 2 + 2 - 16.666667"
  - "THINK": "Now its simple we can just do 2 + 2 = 4 and new equation remains 4 - 16.6666667"
  - "ANALYSE": "Great, now lets just do the final step as simple subtraction"
  - "THINK": "After the final subtraction the ans remations -12.666667"
  - "OUTPUT": "The final output is "-12.666667"

  Example:
  - "USER" what is weather of Goa?
  OUTPUT:
   - "INITIAL": "The user wants me to fetch weather information of Goa",
   - "THINK": "From the tools I can see we have a tool named getWeatherData which can be called"
   - "ANALYSE": "We are going right we can call getWeatherData with "GOA" as input"
   - "TOOL_REQUEST": { "functionName": "getWeatherData", "input": "goa" }
   - "TOOL_OUTPUT": The weather of Goa is sunny with some 30 degree c.
   - "THINK": "We got the weather info"
   - "OUTPUT": "The weather of Goa is sunny with some 30 degree c. Its goona be Hottttttt"

  Output Format:
  { "step": "INITIAL" | "THINK" | "TOOL_REQUEST" | "ANALYSE" | "OUTPUT", "text": "<The Actual Text>", "functionName": "<NAME OF FUNCTION>", "input": "<INPUT PARAMS of Function>" }
`;

const MESSAGES_DB = [{ role: "system", content: SYSTEM_PROMPT }];

async function main(prompt = "") {
  MESSAGES_DB.push({ role: "user", content: prompt });

  while (true) {
    const result = await client.chat.completions.create({
      model: "gpt-4o",
      messages: MESSAGES_DB,
      response_format: { type: "json_object" },
    });

    const rawResult = result.choices[0]?.message?.content;
    const parsedResult = JSON.parse(rawResult);

    MESSAGES_DB.push({
      role: "assistant",
      content: rawResult,
    });

    const displayText = parsedResult.text || parsedResult.message || parsedResult.content || "";
    console.log(`🤖 (${parsedResult.step}): ${displayText}`);
    if (parsedResult.step === "OUTPUT") break;

    if (parsedResult.step === "TOOL_REQUEST") {
      const { functionName, input } = parsedResult;

      switch (functionName) {
        case "executeCommandCli":
          try {
            const toolResult = await executeCommandCli(input);
            console.log(`🛠️(${functionName}):${input}`, toolResult);
            MESSAGES_DB.push({
              role: "developer",
              content: JSON.stringify({
                step: "TOOL_OUTPUT",
                output: toolResult,
              }),
            });
          } catch (error) {
            console.error(`❌ Error executing tool ${functionName}: ${error}`);
            MESSAGES_DB.push({
              role: "developer",
              content: JSON.stringify({
                status: "error",
                error,
              }),
            });
          }
          continue;
        case "getWeatherData":
          {
            const toolResult = await getWeatherData(input);
            console.log(`🛠️(${functionName}):${input}`, toolResult);
            MESSAGES_DB.push({
              role: "developer",
              content: JSON.stringify({
                step: "TOOL_OUTPUT",
                output: toolResult,
              }),
            });
            continue;
          }
      }
    }
  }
}

main(
  'What is weather of Patiala, Delhi, Goa and then write the output this on a beautifuyll webpage. create a new folder saying weather and create all HTML CSS file there and then run this on my browser',
);