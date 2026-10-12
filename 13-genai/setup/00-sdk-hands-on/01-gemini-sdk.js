import { GoogleGenAI } from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function main() {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash',
        contents: 'Why is the sky blue',
    });

     const response1 = await ai.models.generateContent({
            model:'gemini-3.6-flash',
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `What is 2+5 equals`,
                        }
                    ]
                },
            ],
        })
    console.log(response.text)
 }

main()