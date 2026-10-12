import OpenAI from "openai";
const client = new OpenAI({
  apiKey: "",
});

try {
  // 1st way
  //     const response = await client.responses.create({
  //   model: "gpt-4o-mini",
  //   input: "Write a one-sentence bedtime story about a unicorn.",
  //     });

  // 2nd way
  //   const response = await client.responses.create({
  //     model: "gpt-4o-mini",
  //     input: [
  //       {
  //         role: "user",
  //         content: "Tell mw a story about the GOT ",
  //       },
  //     ],
  //   });
  //   console.log(response.output_text);

  // 3rd way
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: "Tell mw a story about the GOT ",
      },
    ],
  });

  console.log(response.choices[0].message.content);
} catch (error) {
  console.err("error", error.message);
}
