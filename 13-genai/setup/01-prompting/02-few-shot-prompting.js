import dotenv from 'dotenv'
import path from 'path'
import {GoogleGenAI} from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});


const main = async () => {
    try {
        const res = await ai.models.generateContent({
            model:'gemini-3.6-flash',
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `What is 2+5 equals
                            Do not add anything extra, just give me an answer, take the samples from below.
                            Examples:
                            - what is 5+4?
                                Expected output: Hey Saif, 5+4 is 9 (Nine)!
                            - what is 6+9?
                                Expected output: Hey Saif, 6+9 is 15 (Fifteen)!

                            `,
                        }
                    ]
                },
            ],
        })
        console.log(res.text);
    } catch (error) {
        console.error('Error Occurred ', error)
    }
}

main()