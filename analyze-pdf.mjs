import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import fs from 'fs';

async function analyze() {
    const pdfBuffer = fs.readFileSync('public/3_6 Newsletter - Bethany.pdf');

    console.log("Sending PDF to Gemini for analysis...");

    const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'You are an expert curriculum designer. Please thoroughly analyze this 3rd grade weekly newsletter PDF. Give me exactly the spelling words, vocabulary words with definitions, Math topics, and Science/Social Studies topics taught this week. Then, give me alternative suggestions on how to digitally structure this week for a student portal, where subjects can be divided like Math, Vocab, Science, and an option to "revise the subject" as one option. Format the output in Markdown.' },
                    { type: 'file', data: pdfBuffer, mimeType: 'application/pdf' },
                ],
            },
        ],
    });

    fs.writeFileSync('public/gemini-analysis.md', text);
    console.log("Analysis saved to public/gemini-analysis.md");
}

analyze().catch(console.error);
