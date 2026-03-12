import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

export const maxDuration = 30 // Allow up to 30s for AI generation

export async function POST(req: Request) {
    try {
        const { subject, weekId } = await req.json()

        let dbContext = ""
        // Pull structural context and topics from the database if available
        if (weekId && !weekId.startsWith('simulated')) {
            const { createClient } = await import('@/lib/supabase-server')
            const supabase = await createClient()

            const { data } = await supabase
                .from('study_modules')
                .select('topics_prompt, structure_context, exact_content')
                .eq('week_id', weekId)
                .eq('subject', subject)
                .single()

            if (data?.topics_prompt) {
                dbContext += `\nCore Topics: ${data.topics_prompt}\n`
            }
            if (data?.exact_content && Array.isArray(data.exact_content)) {
                dbContext += `\nExact Class Material: ${JSON.stringify(data.exact_content)}\n`
            }
            if (data?.structure_context) {
                dbContext += `\nReference Examples: ${data.structure_context}\n`
            }
        } else if (weekId?.startsWith('simulated')) {
            // Supply rich mock data so the user can test the Study Guide feature even on placeholder weeks!
            if (subject === 'vocab') dbContext += `\nCore Topics: Vocabulary from "Octopus Escapes Again!". Words to focus on: feature, record, assuming, mental, launch, thumbed, developed, incredibly, episodes, villains.\n`
            if (subject === 'spelling') dbContext += `\nCore Topics: Words with the /ûr/ sound (ur, er, ir, ear, or). Focus words: return, courage, surface, purpose, first, turkey, heard, early, turtle, shirt, journal, search, curtain, burrow, hamburger.\n`
            if (subject === 'math') dbContext += `\nCore Topics: Line plots, analyzing data from graphs, addition/subtraction word problems with larger numbers, interpreting data cycles.\n`
            if (subject === 'science') dbContext += `\nCore Topics: Animal adaptations (structural and behavioral) and Ecosystems.\n`
        }

        const prompt = `You are an expert, encouraging 3rd-grade teacher creating a "Cheat Sheet" Study Guide for your student.
The subject is: ${subject}.
${dbContext}

Your task is to synthesize this material into a highly engaging, readable study guide in Markdown format. 
Make it feel like a visual Infographic or a set of sequential "Slides".
- Break the content into distinct, highly visual sections using thematic headers and dividing lines (---).
- Use sections like "🌟 The Big Idea", "🧠 How It Works", and "🏆 Real World Example".
- Use lots of emojis, fun headers, bullet points, and bold text.
- Explain the concepts very simply so a 3rd grader easily understands.
- Give 1 or 2 fun examples of how they might use this in real life.
- Do NOT output questions for a test, just an exciting visual study guide.`

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: prompt,
            temperature: 0.7,
        })

        return Response.json({ text })
    } catch (error: any) {
        console.error("Study Guide Gen Error:", error)
        return Response.json({ error: error?.message || 'Failed to generate study guide' }, { status: 500 })
    }
}
