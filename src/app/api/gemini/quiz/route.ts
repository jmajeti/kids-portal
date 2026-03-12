import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

export const maxDuration = 30 // Allow up to 30s for AI generation

export async function POST(req: Request) {
    try {
        const { subject, actionType, weekId } = await req.json()

        const seed = Math.floor(Math.random() * 1000000)
        let themes = ["space exploration", "underwater ocean", "jungle animals", "superheroes", "magic academy", "sports tournament"]
        if (actionType === 'extramile') {
            themes = ["solving a global crisis", "running a tech startup", "exploring an uncharted planet", "managing a medieval kingdom"]
        }
        const randomTheme = themes[Math.floor(Math.random() * themes.length)]

        let questionCount = subject === 'revise' ? 10 : 5

        let uniquenessDirective = `Make these ${questionCount} questions COMPLETELY UNIQUE (Seed: ${seed}). Incorporate a fun theme of "${randomTheme}" into the questions or examples.`
        if (actionType === 'extramile') {
            uniquenessDirective += ` CRITICAL: This is an "Extra Mile" challenge. You must significantly increase the difficulty of the questions while retaining the core topic. Introduce multi-step logic, advanced vocabulary derivatives, or complex problem-solving scenarios.`
        }

        let dbContext = ""
        // If it's not a simulated fallback week, we can pull structural context from the database
        if (weekId && !weekId.startsWith('simulated')) {
            const { createClient } = await import('@/lib/supabase-server')
            const supabase = await createClient()

            if (subject === 'revise') {
                const { data } = await supabase
                    .from('study_modules')
                    .select('subject, topics_prompt')
                    .eq('week_id', weekId)

                if (data && data.length > 0) {
                    dbContext += `\nThis is a comprehensive REVISION quiz covering multiple subjects. The questions must focus on a mix of the following topics:\n`
                    data.forEach(mod => {
                        if (mod.topics_prompt) {
                            dbContext += `- ${mod.subject}: ${mod.topics_prompt}\n`
                        } else {
                            dbContext += `- ${mod.subject}\n`
                        }
                    })
                }
            } else {
                const { data } = await supabase
                    .from('study_modules')
                    .select('topics_prompt, structure_context')
                    .eq('week_id', weekId)
                    .eq('subject', subject)
                    .single()

                if (data?.topics_prompt) {
                    dbContext += `\nThe questions must focus exclusively on the following topics: ${data.topics_prompt}`
                }
                if (data?.structure_context) {
                    dbContext += `\nYour questions MUST exactly imitate the structural format of these reference examples (swapping names and numbers): \n${data.structure_context}`
                }
            }
        } else if (weekId?.startsWith('simulated')) {
            if (subject === 'vocab') dbContext += `\nCore Topics: Vocabulary from "Octopus Escapes Again!". Words to focus on: feature, record, assuming, mental, launch, thumbed, developed, incredibly, episodes, villains.\n`
            if (subject === 'spelling') dbContext += `\nCore Topics: Words with the /ûr/ sound (ur, er, ir, ear, or). Focus words: return, courage, surface, purpose, first, turkey, heard, early, turtle, shirt, journal, search, curtain, burrow, hamburger.\n`
            if (subject === 'math') dbContext += `\nCore Topics: Line plots, analyzing data from graphs, addition/subtraction word problems with larger numbers, interpreting data cycles.\n`
            if (subject === 'science') dbContext += `\nCore Topics: Animal adaptations (structural and behavioral) and Ecosystems.\n`
        }
        let prompt = `Generate ${questionCount} questions for 3rd grade. ${uniquenessDirective} ${dbContext}`
        let schema: any = z.object({
            questions: z.array(z.object({
                question: z.string(),
                answer: z.string()
            }))
        })

        if (subject === 'vocab') {
            prompt = `Generate 5 vocabulary flashcards for a 3rd grader. ${uniquenessDirective} Use challenging 3rd-grade level words. ${dbContext}`
            schema = z.object({
                questions: z.array(z.object({
                    word: z.string(),
                    definition: z.string()
                }))
            })
        } else if (subject === 'spelling') {
            prompt = `Generate 5 spelling questions for a 3rd grader. ${uniquenessDirective} Hint should describe the word or show a fill-in-the-blank. ${dbContext}`
            schema = z.object({
                questions: z.array(z.object({
                    words: z.string(),
                    answer: z.string()
                }))
            })
        } else if (subject === 'math') {
            prompt = `Generate 5 math problems for 3rd grade (Multi-digit addition/subtraction or rounding). ${uniquenessDirective} ${dbContext}`
        } else if (subject === 'science') {
            prompt = `Generate 5 science questions for 3rd grade. ${uniquenessDirective} ${dbContext}`
        } else if (subject === 'revise') {
            prompt = `Generate a ${questionCount}-question mixed revision quiz for 3rd grade covering all the weekly topics. ${uniquenessDirective} ${dbContext}`
        }

        const { object } = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: schema,
            prompt: prompt,
            temperature: 0.9,
        })

        return Response.json((object as any).questions)
    } catch (error: any) {
        console.error("AI Generation Error:", error)
        return Response.json({ error: error?.message || 'Failed to generate quiz' }, { status: 500 })
    }
}
