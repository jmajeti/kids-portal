import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
})

export const maxDuration = 60 // Allow 60s for parsing and AI 

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await req.formData()
        const rawText = formData.get('rawText') as string
        const studentId = formData.get('studentId') as string

        if (!rawText) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 })
        }

        // 2. Query Gemini to structure the data 
        const { object } = await generateObject({
            model: google('gemini-2.5-flash'),
            system: `You are an expert AI curriculum parser. You will be provided the messy raw text scraped from a school newsletter/curriculum PDF. 
Your goal is to extract the date/title of the week, and separate out the core learning subjects (e.g., vocab, spelling, math, science, reading, figurative).
For each subject, summarize the 'topics_prompt' (the exact rule or topic) and include 'exact_content' based on the word lists or questions provided.
If the document uses a specific format for quizzes (like fill-in-the-blank), put that in 'structure_context'.`,
            prompt: `Parse this curriculum text: \n\n${rawText.substring(0, 15000)}`,
            schema: z.object({
                weekTitle: z.string().describe("The exact week label or date range drawn from the top of the PDF. e.g. 'March 6th' or 'Week of May 10th'"),
                modules: z.array(z.object({
                    subject: z.enum(['vocab', 'spelling', 'math', 'science', 'reading', 'grammar', 'figurative', 'other']),
                    topicsPrompt: z.string().describe("Concise summary of what is being taught (e.g., 'Words with /ûr/ sound' or 'Line plots')"),
                    structureContext: z.string().optional().describe("If the text provides strict templates for questions, note them here."),
                    exactContent: z.array(z.object({
                        question: z.string().describe("The word, definition, or question."),
                        answer: z.string().describe("The correct answer."),
                        options: z.array(z.string()).length(4).describe("The correct answer plus 3 highly plausible distractors."),
                        justification: z.string().describe("A 3rd-grade level sentence explaining the answer or using the word in context.")
                    })).describe("The list of specific curriculum items from the PDF.")
                }))
            }),
            temperature: 0.1,
        })

        // 3. Save to Supabase
        // Create the week
        const { data: weekRow, error: weekError } = await supabase
            .from('curriculum_weeks')
            .insert({
                title: object.weekTitle,
                active: true,
                student_id: studentId === 'all' ? null : studentId,
                created_by: user.id
            })
            .select()
            .single()

        if (weekError || !weekRow) {
            throw new Error(`Failed to insert curriculum week: ${weekError?.message}`)
        }

        // Create the modules
        const moduleInserts = object.modules.map((m: any) => ({
            week_id: weekRow.id,
            subject: m.subject,
            topics_prompt: m.topicsPrompt,
            structure_context: m.structureContext || '',
            exact_content: m.exactContent
        }))

        const { error: modError } = await supabase
            .from('study_modules')
            .insert(moduleInserts)

        if (modError) {
            // Manual Rollback: Delete the weekRow we just created because the modules failed
            console.error("Module insertion failed, rolling back week creation...")
            await supabase.from('curriculum_weeks').delete().eq('id', weekRow.id)
            throw new Error(`Failed to insert study modules: ${modError.message}`)
        }

        return NextResponse.json({ success: true, weekTitle: object.weekTitle, modules: object.modules.length })

    } catch (e: any) {
        console.error("PDF Processing Error:", e)
        return NextResponse.json({ error: e.message || 'Failed to process PDF.' }, { status: 500 })
    }
}
