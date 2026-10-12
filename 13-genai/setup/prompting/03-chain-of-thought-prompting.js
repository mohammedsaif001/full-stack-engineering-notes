import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are an expert AI engineer. You have to analyze the user's input carefully and then you need to breakdown the problem into sub problems before coming on to the final result. Always breakdown the users intention and how to solve that problem and then step by step solve it.

We are going to follow a pipeline of "INITIAL", "THINK", "ANALYZE" & "OUTPUT" pipeline.

The pipeline:
- "INITIAL": when user gives an input, we will have an initial thought process on what this user is trying to do, what is his intention, what is the best way to solve this problem, what is the expected output.
- "THINK": this is where we are going to think about the problem and break it down into smaller sub problems, what steps we need to take to solve this problem, what is the expected output.
- "ANALYZE": this is where we will analyze the solution and also verify if the output is correct
- "THINK": We can go back to think mode where we now see if any sub problem remains and think
- "ANALYZE": analyze again the problem and get onto a solution
- "OUTPUT": this is where we can end and give the final output to the user

Rules:
- Always output one step at a time & wait for other steps before proceeding to the next steps
- Always maintain the sequence of pipeline as given in the example
- Always follow JSON output format strictly

Example:
  - "USER": What is 2 + 2 - 5 * 10 / 3?
  OUTPUT:
  - "INITIAL": "The user wants me to solve a maths equation"
  - "THINK": "I will use the BODMAS formula and based on that I should first multiply 5 * 10 which is 50"
  - "ANALYZE": "Yes, the bodmas is actually right and now equation is 2 + 2 - 50 / 3"
  - "THINK": "Now as per rule I should perform divide which is dividing 50 / 3 which is 16.666667"
  - "ANALYZE": "Now the new equations remains 2 + 2 - 16.666667"
  - "THINK": "Now its simple we can just do 2 + 2 = 4 and new equation remains 4 - 16.6666667"
  - "ANALYZE": "Great, now lets just do the final step as simple subtraction"
  - "THINK": "After the final subtraction the ans remains -12.666667"
  - "OUTPUT": "The final output is "-12.666667"

Output Format:
{"Step": "INITIAL" | "THINK" | "ANALYZE" | "OUTPUT", "Message": "<string goes here>", "Reasoning": "<string goes here>"}
`;

const MESSAGES = [{ role: "system", content: SYSTEM_PROMPT }];

const main = async (prompt = "") => {
  MESSAGES.push({ role: "user", content: prompt });
  try {
    while (true) {
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: MESSAGES,
        response_format: { type: "json_object" },
      });

      const rawResult = res.choices[0].message.content?.trim() || "";
      let parsedResult;

      try {
        parsedResult = JSON.parse(rawResult);
      } catch (error) {
        console.error("Error parsing JSON", error);
        console.log("Raw result:", rawResult);
        break;
      }
      const { Step, Message, Reasoning } = parsedResult;

      // Push assistant response to history
      MESSAGES.push({ role: "assistant", content: rawResult });

      console.log({ Step, Message, Reasoning });
      if (Step === "OUTPUT") break;
    }
  } catch (error) {
    console.error("Error Occurred ", error);
  }
};

// main("What is the op of 9987 * 9878 / 786 +987 -98");
/**
 *  * {
  Step: 'INITIAL',
  Message: 'The user wants me to solve a mathematical equation involving multiplication, division, addition, and subtraction.',       
  Reasoning: 'This requires following the order of operations (BODMAS/BIDMAS) to arrive at the correct answer.'
}
{
  Step: 'THINK',
  Message: 'First, I will identify and solve the multiplication and division in the expression, starting with 9987 * 9878.',
  Reasoning: 'According to BODMAS, multiplication and division should be completed before addition and subtraction.'
}
{
  Step: 'ANALYZE',
  Message: 'Calculating 9987 * 9878 results in 98617266. Now the equation is 98617266 / 786 + 987 - 98.',
  Reasoning: 'Multiplication has been resolved correctly; the next step is to perform the division.'
}
{
  Step: 'THINK',
  Message: 'Now I will divide 98617266 by 786.',
  Reasoning: 'As per BODMAS, I need to resolve the division next.'
}
{
  Step: 'ANALYZE',
  Message: 'Calculating 98617266 / 786 results in approximately 125569.15. The new equation now is 125569.15 + 987 - 98.',
  Reasoning: 'The division has been correctly calculated, so we move on to the addition and subtraction.'
}
{
  Step: 'THINK',
  Message: "Now I'll perform the addition of 125569.15 + 987.",
  Reasoning: 'Since addition comes before subtraction, I should do this step first.'
}
{
  Step: 'ANALYZE',
  Message: 'Calculating 125569.15 + 987 results in approximately 126556.15. The new equation now is 126556.15 - 98.',
  Reasoning: 'The addition has been executed correctly, and now I will perform the final subtraction.'
}
{
  Step: 'THINK',
  Message: 'Now I will subtract 98 from 126556.15.',
  Reasoning: 'This is the final operation needed to complete the equation.'
}
{
  Step: 'ANALYZE',
  Message: 'Calculating 126556.15 - 98 results in approximately 126458.15.',
  Reasoning: 'The subtraction has been performed correctly.'
}
{
  Step: 'OUTPUT',
  Message: 'The final output is "126458.15"',
  Reasoning: 'All operations have been performed according to BODMAS, and I have reached the final result.'
}
 */

// main("How do i move from frontend to gen ai dev?");
/**
 *  * {
  Step: 'INITIAL',
  Message: 'The user wants guidance on transitioning from frontend development to generative AI development.',
  Reasoning: 'The user is looking for a roadmap or steps to make a career shift from frontend to generative AI.'
}
{
  Step: 'THINK',
  Message: 'To move from frontend development to generative AI development, we should break this process into several sub-problems: 1) Understanding the fundamental concepts of AI and machine learning. 2) Learning the necessary programming languages and frameworks. 3) Gaining experience with AI libraries and tools. 4) Building a portfolio of projects related to generative AI. 5) Networking and seeking opportunities in the field.',
  Reasoning: 'These sub-problems will help identify the skills and knowledge needed to facilitate a smooth transition into generative AI development.'
}
{
  Step: 'ANALYZE',
  Message: "Now, let's analyze each sub-problem to outline specific actions.",
  Reasoning: 'This analysis will help in creating a structured plan that the user can follow to transition effectively.'
}
{
  Step: 'THINK',
  Message: "1) Understanding the fundamentals: Start with online courses or books about machine learning and AI concepts. 2) Programming languages: Python is crucial for AI, so the user should focus on learning Python if they haven't already. 3) AI frameworks: Hands-on practice with libraries like TensorFlow, PyTorch, or Keras is essential. 4) Building a portfolio: Create projects that showcase generative AI, such as a generative art program or a text generator using GPT models. 5) Networking: Join AI communities, attend meetups, and participate in forums to connect with others in the field.",
  Reasoning: 'These actions provide clear directions for the user to follow for each sub-problem identified earlier.'
}
{
  Reasoning: 'These actions provide clear directions for the user to follow for each sub-problem identified earlier.'
}
{
  Step: 'ANALYZE',
  Message: 'Let’s review if all necessary steps have been covered for a comprehensive transition plan.',
  Reasoning: 'This verification ensures that no important aspects of transitioning to generative AI development have been overlooked.'
}
{
  Step: 'THINK',
  Message: 'The steps sufficiently cover essential areas for transitioning, but adding an emphasis on staying updated with the latest trends and research in generative AI would be beneficial. Additionally, considering undergraduate or online courses specializing in AI and data science could also be advantageous.',
  Reasoning: "Incorporating ongoing education and research engagement will enhance the user's expertise and adaptability in the fast-evolving field of AI."
}
{
  Step: 'ANALYZE',
  Message: 'We have a comprehensive strategy that includes key skills, practical experience, project development, networking, and ongoing education.',
  Reasoning: 'This final analysis confirms that the transition plan is well-rounded and covers all critical elements for successful movement into generative AI development.'
}
{
  Step: 'OUTPUT',
  Message: 'To transition from frontend development to generative AI development, follow these steps: 1) Learn the fundamentals of AI and machine learning through courses or books. 2) Focus on mastering Python, the primary language for AI development. 3) Gain practical experience with AI frameworks like TensorFlow or PyTorch. 4) Build a portfolio showcasing generative AI projects. 5) Network with professionals in the AI field through communities and forums. 6) Stay updated with the latest trends and consider further education in AI.',
  Reasoning: 'This structured approach will guide the user effectively through their transition into generative AI development.'
}
 */

main("What is the weather of bangalore today?"); // This will not return anything because it doesnt have access to the API
