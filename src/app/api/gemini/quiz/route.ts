import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

export const maxDuration = 30 // Allow up to 30s for AI generation

// Shared schema for a single quiz question
const questionSchema = z.object({
    question: z.string().describe("The quiz question, problem, or prompt."),
    answer: z.string().describe("The correct answer (a single string)."),
    options: z.array(z.string()).length(4).describe("Four answer choices: the correct answer and 3 plausible wrong answers."),
    justification: z.string().describe("A short, kid-friendly sentence (1-2) explaining WHY this answer is correct or how to remember it.")
})

export async function POST(req: Request) {
    try {
        const { subject, actionType, weekId } = await req.json()

        // ---------------------------------------------------------------
        // 1.  Build context from the database (always used by AI routes)
        // ---------------------------------------------------------------
        let topicsPrompt = ""
        let exactContentStr = ""

        if (weekId && !weekId.startsWith('simulated')) {
            const { createClient } = await import('@/lib/supabase-server')
            const supabase = await createClient()

            if (subject === 'revise') {
                // For revision, gather all subjects' topics
                const { data } = await supabase
                    .from('study_modules')
                    .select('subject, topics_prompt, exact_content')
                    .eq('week_id', weekId)

                if (data && data.length > 0) {
                    data.forEach(mod => {
                        if (mod.topics_prompt) topicsPrompt += `- ${mod.subject}: ${mod.topics_prompt}\n`
                        if (mod.exact_content?.length) {
                            exactContentStr += `\n${mod.subject} items: ${JSON.stringify(mod.exact_content).substring(0, 500)}\n`
                        }
                    })
                }
            } else {
                const { data } = await supabase
                    .from('study_modules')
                    .select('topics_prompt, structure_context, exact_content')
                    .eq('week_id', weekId)
                    .eq('subject', subject)
                    .single()

                if (data?.topics_prompt) topicsPrompt = data.topics_prompt
                if (data?.exact_content?.length) exactContentStr = JSON.stringify(data.exact_content)
            }
        } else if (weekId?.startsWith('simulated')) {
            // Demo fallback data
            if (subject === 'vocab') {
                topicsPrompt = "Vocabulary from 'Octopus Escapes Again!'"
                exactContentStr = JSON.stringify([{word:"feature",definition:"An important part"},{word:"record",definition:"The best performance"}])
            }
            if (subject === 'spelling') {
                topicsPrompt = "Words with the /ûr/ sound (ur, er, ir, ear, or)"
                exactContentStr = JSON.stringify([{answer:"nurse"},{answer:"shirt"},{answer:"turkey"},{answer:"heard"},{answer:"return"}])
            }
            if (subject === 'math') topicsPrompt = "Line plots, data analysis, addition/subtraction word problems"
            if (subject === 'science') topicsPrompt = "Animal adaptations (structural and behavioral) and Ecosystems"
        }

        // ---------------------------------------------------------------
        // 2.  Build the prompt based on action type
        //     - 'ai_revision': New questions SIMILAR to the study guide
        //     - 'extramile':   Same but harder / more complex
        //     - 'revise':      Mixed multi-subject revision
        // ---------------------------------------------------------------
        const seed = Math.floor(Math.random() * 1000000)
        const isExtraMile = actionType === 'extramile'
        const questionCount = subject === 'revise' ? 10 : 5

        const difficultyNote = isExtraMile
            ? `CRITICAL: This is an "Extra Mile" hard-mode challenge. Make the questions significantly harder — add multi-step logic, use trickier wording, introduce synonyms/antonyms, or create more complex problem scenarios. Do NOT just repeat the exact items from the study guide.`
            : `Create FRESH questions (Seed ${seed}) that test the same concepts — do NOT copy the exact items word-for-word.`

        const contextBlock = [
            topicsPrompt && `TOPIC: ${topicsPrompt}`,
            exactContentStr && `STUDY GUIDE CONTENT (use this as the SOURCE MATERIAL to generate similar questions from):\n${exactContentStr}`
        ].filter(Boolean).join('\n\n')

        let prompt: string

        if (subject === 'vocab') {
            prompt = `You are a 3rd-grade teacher creating a VOCABULARY quiz.
${contextBlock}

Generate ${questionCount} vocabulary multiple-choice questions based STRICTLY on the topic and content above.
${difficultyNote}

For each question:
- "question": Show the vocabulary word.
- "answer": The correct definition.
- "options": 4 choices — the correct definition + 3 plausible wrong definitions from similar-sounding or related words.
- "justification": A fun example sentence using the word that shows its meaning.`

        } else if (subject === 'spelling') {
            prompt = `You are a 3rd-grade teacher creating a SPELLING quiz.
${contextBlock}

Generate ${questionCount} spelling questions based STRICTLY on the topic and content above.
${difficultyNote}

For each question:
- "question": A sentence with the target word replaced by a blank (e.g., "The ___ helped me feel better.").
- "answer": The correctly spelled target word.
- "options": 4 choices — the correct spelling + 3 common misspellings or confusing look-alike words.
- "justification": A short spelling tip (e.g., "Remember: 'nurse' uses the -ur spelling for the /ûr/ sound!").`

        } else if (subject === 'revise') {
            prompt = `You are a 3rd-grade teacher creating a MIXED REVISION quiz.
Topics covered this week:
${topicsPrompt}
${exactContentStr ? `Study guide content:\n${exactContentStr}` : ''}

Generate ${questionCount} revision questions covering a MIX of the subjects above.
${difficultyNote}

For each question:
- "question": The quiz question.
- "answer": The correct answer.
- "options": 4 answer choices including the correct one.
- "justification": A short explanation of why the answer is correct.`

        } else {
            // Generic for math, science, grammar, reading, etc.
            prompt = `You are a 3rd-grade teacher creating a ${subject.toUpperCase()} quiz.
${contextBlock}

Generate ${questionCount} questions based STRICTLY on the topic and content above.
${difficultyNote}

For each question:
- "question": A clear question or problem.
- "answer": The correct answer (one short phrase or number).
- "options": 4 answer choices — the correct one and 3 plausible wrong answers.
- "justification": A short explanation of why the answer is correct, at a 3rd-grade reading level.`
        }

        // ---------------------------------------------------------------
        // 3.  Call Gemini
        // ---------------------------------------------------------------
        const { object } = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({ questions: z.array(questionSchema) }),
            prompt,
            temperature: isExtraMile ? 1.0 : 0.8,
        })

        return Response.json((object as any).questions)

    } catch (error: any) {
        console.error("AI Generation Error:", error)
        return Response.json({ error: error?.message || 'Failed to generate quiz' }, { status: 500 })
    }
}
