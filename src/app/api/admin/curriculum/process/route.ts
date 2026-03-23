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
Your goal is to extract the date/title of the week, and separate out the core learning subjects (e.g., vocab, spelling, math, science, reading, grammar).
RULES FOR EXACT CONTENT:
1. For SPELLING: The text will usually just list words. You MUST invent a short, 3rd-grade level fill-in-the-blank sentence for the 'question' (e.g., "The bird flew in the ___"), and put the spelling word as the 'answer'. Do NOT just put the word in both fields.
2. For VOCAB: Put the vocabulary word in 'question' and its exact definition in 'answer'.
3. For MATH/SCIENCE/GRAMMAR: If there are specific facts or problems, extract them.
4. If a subject only has scheduling info, fluff, or notes like "See attached chart" or "Unit test on Friday", DO NOT create any exactContent for it. Return an empty array. Do not invent fake questions like "Animal adaptations concepts".`,
            prompt: `Parse this curriculum text. Ignore non-academic scheduling fluff:\n\n${rawText.substring(0, 15000)}`,
            schema: z.object({
                weekTitle: z.string().describe("The exact week label or date range drawn from the top of the PDF. e.g. 'March 6th' or 'Week of May 10th'"),
                modules: z.array(z.object({
                    subject: z.enum(['vocab', 'spelling', 'math', 'science', 'reading', 'grammar', 'figurative', 'other']),
                    topicsPrompt: z.string().describe("Concise summary of what is being taught (e.g., 'Words with /ûr/ sound' or 'Line plots')"),
                    structureContext: z.string().optional().describe("If the text provides strict templates for questions, note them here."),
                    exactContent: z.array(z.object({
                        question: z.string().describe("For spelling: a fill-in-the-blank sentence. For vocab: the word. Otherwise, the question/problem."),
                        answer: z.string().describe("The correct answer, definition, spelling word, or solution.")
                    })).describe("A list of testable items. Leave EMPTY if the text only contains fluff like 'Test on Friday' or 'See attached'.")
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
