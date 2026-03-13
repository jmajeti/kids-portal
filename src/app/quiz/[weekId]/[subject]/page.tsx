"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, PlayCircle, Glasses, Sparkles, Loader2, Trophy, Award, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { GenericMCModule } from '@/components/modules/GenericMCModule'
import { SpellingModule } from '@/components/modules/SpellingModule'
import { VocabModule } from '@/components/modules/VocabModule'

export default function QuizLanding() {
    const router = useRouter()
    const params = useParams()
    const weekId = params.weekId as string
    const subject = params.subject as string
    const supabase = createClient()

    const [view, setView] = useState<'intro' | 'quiz' | 'result' | 'guide'>('intro')
    const [studyGuideContent, setStudyGuideContent] = useState('')
    const [questions, setQuestions] = useState<any[]>([])
    const [score, setScore] = useState(0)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchStandardQuestions()
    }, [])

    const fetchStandardQuestions = async () => {
        // Simulated fallback for empty DB
        if (weekId.startsWith('simulated')) {
            const mockData = getMockData(subject)
            setQuestions(shuffleArray(mockData))
            setIsLoading(false)
            return
        }

        const { data } = await supabase
            .from('study_modules')
            .select('exact_content')
            .eq('week_id', weekId)
            .eq('subject', subject)
            .single()

        if (data && data.exact_content) {
            // Normalize: the AI sometimes stores items with different key names
            // (e.g. problem/solution, q/a, or even plain strings). 
            // We map everything to a consistent { question, answer } shape.
            const normalized = data.exact_content.map((item: any) => {
                if (typeof item === 'string') return { question: item, answer: '' }
                return {
                    question: item.question ?? item.problem ?? item.q ?? item.word ?? item.term ?? JSON.stringify(item),
                    answer:   item.answer   ?? item.solution ?? item.a ?? item.definition ?? '',
                    options:  item.options,
                    justification: item.justification,
                }
            }).filter((item: any) => item.question)
            setQuestions(shuffleArray(normalized))
        }
        setIsLoading(false)
    }

    // Utility to randomize array order
    const shuffleArray = (array: any[]) => {
        const newArray = [...array]
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    const handleGenerateAI = async (actionType: 'ai_revision' | 'extramile') => {
        setIsGenerating(true)
        try {
            const res = await fetch('/api/gemini/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, actionType, weekId })
            })
            const generatedQuestions = await res.json()
            if (generatedQuestions && generatedQuestions.length) {
                setQuestions(generatedQuestions)
                setScore(0)
                setView('quiz')
            } else {
                alert("Failed to generate AI questions. Please try again.")
            }
        } catch (e) {
            console.error(e)
            alert("Error generating questions.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleGenerateGuide = async () => {
        setIsGenerating(true)
        try {
            const res = await fetch('/api/gemini/study-guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, weekId })
            })
            const data = await res.json()
            if (data && data.text) {
                setStudyGuideContent(data.text)
                setView('guide')
            } else {
                alert("Failed to generate study guide.")
            }
        } catch (e) {
            console.error(e)
            alert("Error generating study guide.")
        } finally {
            setIsGenerating(false)
        }
    }

    // Standard = directly use what was extracted from the PDF. No AI call needed.
    const handleStartStandard = () => {
        if (questions.length === 0) {
            alert("No questions found for this subject. Please ask your parent to upload the curriculum PDF.")
            return
        }
        setScore(0)
        setView('quiz')
    }

    const getModuleTitle = () => {
        return subject.charAt(0).toUpperCase() + subject.slice(1) + " Practice"
    }

    // Prevent hydration errors by not rendering early during loading state
    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-orange-50"><Loader2 className="animate-spin text-orange-500" size={48} /></div>

    // Render the appropriate quiz component based on the subject
    const getQuizComponent = () => {
        const props = {
            questions,
            score,
            setScore,
            onComplete: () => setView('result')
        }

        if (subject === 'vocab') return <VocabModule {...props} />
        if (subject === 'spelling') return <SpellingModule {...props} />
        return <GenericMCModule {...props} /> // Fallback for Math, Science, Grammar
    }

    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
    let message = "Keep practicing!"
    if (percentage === 100) message = "Perfect Score! You're a Bee-nius!"
    else if (percentage >= 80) message = "Amazing Job! You're ready for the test."

    return (
        <div className="min-h-screen bg-slate-100">
            {view === 'intro' && (
                <div className="min-h-screen bg-orange-50 p-4 md:p-8 flex flex-col items-center justify-center">
                    <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => router.push(`/dashboard/week/${weekId}`)}
                            className="flex items-center gap-2 text-slate-500 hover:text-blue-500 font-bold mb-8 bg-white px-4 py-2 rounded-full shadow-sm mx-auto"
                        >
                            <ArrowLeft size={20} /> Back to Subjects
                        </button>

                        <div className="bg-white rounded-3xl shadow-xl p-12 text-center space-y-8 border-t-8 border-indigo-400">
                            <h2 className="text-4xl font-black text-slate-800 uppercase tracking-wide">{getModuleTitle()}</h2>
                            <p className="text-lg text-slate-500 max-w-md mx-auto">
                                How do you want to practice today?
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mt-8">
                                {/* Study Guide */}
                                <button
                                    onClick={() => handleGenerateGuide()}
                                    disabled={isGenerating}
                                    className="group relative p-6 rounded-3xl bg-blue-50 border-4 border-blue-100 hover:border-blue-400 hover:bg-blue-100 transition-all text-left space-y-4 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 shadow-md group-hover:scale-110 transition-transform">
                                        {isGenerating ? <Loader2 size={28} className="animate-spin" /> : <BookOpen size={28} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-blue-900">Study Guide</h3>
                                        <p className="text-xs font-medium text-blue-600/80 mt-1">AI-generated cheat sheet to review before the quiz.</p>
                                    </div>
                                </button>

                                {/* Standard — exact PDF content, no AI */}
                                <button
                                    onClick={handleStartStandard}
                                    disabled={isGenerating}
                                    className="group relative p-6 rounded-3xl bg-orange-50 border-4 border-orange-100 hover:border-orange-400 hover:bg-orange-100 transition-all text-left space-y-4 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center text-orange-600 shadow-md group-hover:scale-110 transition-transform">
                                        <PlayCircle size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-orange-900">Standard</h3>
                                        <p className="text-xs font-medium text-orange-600/80 mt-1">Practice exactly this week's words &amp; questions from the study guide.</p>
                                    </div>
                                </button>

                                {/* AI Revision — new similar questions based on same topics */}
                                <button
                                    onClick={() => handleGenerateAI('ai_revision')}
                                    disabled={isGenerating}
                                    className="group relative p-6 rounded-3xl bg-teal-50 border-4 border-teal-100 hover:border-teal-400 hover:bg-teal-100 transition-all text-left space-y-4 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                >
                                    <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center text-teal-600 shadow-md group-hover:scale-110 transition-transform">
                                        {isGenerating ? <Loader2 size={28} className="animate-spin" /> : <Sparkles size={28} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-teal-900">AI Revision</h3>
                                        <p className="text-xs font-medium text-teal-600/80 mt-1">Fresh questions on the same topics — great for extra practice!</p>
                                    </div>
                                </button>

                                {/* Extra Mile — harder */}
                                <button
                                    onClick={() => handleGenerateAI('extramile')}
                                    disabled={isGenerating}
                                    className="group relative p-6 rounded-3xl bg-slate-800 border-4 border-slate-700 hover:border-slate-900 hover:bg-slate-900 transition-all text-left space-y-4 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                >
                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                        {isGenerating ? <Loader2 size={28} className="animate-spin" /> : <Trophy size={28} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Extra Mile</h3>
                                        <p className="text-xs font-medium text-slate-300 mt-1">Harder AI questions on the same topics. Challenge yourself!</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {view === 'guide' && (
                <div className="min-h-screen bg-orange-50 p-4 md:p-8">
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <button
                            onClick={() => setView('intro')}
                            className="flex items-center gap-2 text-slate-500 hover:text-blue-500 font-bold mb-6 bg-white px-4 py-2 rounded-full shadow-sm"
                        >
                            <ArrowLeft size={20} /> Back to Options
                        </button>

                        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border-t-8 border-blue-400">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                                    <BookOpen size={32} />
                                </div>
                                <h2 className="text-3xl font-black text-slate-800">Your AI Study Guide</h2>
                            </div>

                            <div className="prose prose-lg prose-slate max-w-none">
                                <ReactMarkdown
                                    components={{
                                        hr: ({ node, ...props }) => <hr className="my-12 border-t-8 border-dashed border-blue-100" {...props} />,
                                        h1: ({ node, ...props }) => <h1 className="text-4xl md:text-5xl font-black text-blue-600 mb-8 bg-blue-50 inline-block px-8 py-3 rounded-3xl shadow-sm border-2 border-blue-200 transform -rotate-1" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-10 mb-6 flex items-center gap-3 bg-gradient-to-r from-orange-100 to-transparent p-4 rounded-xl" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-indigo-600 mt-6 mb-4 uppercase tracking-wide" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-6 font-medium" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="space-y-4 mb-8 bg-slate-50 p-6 md:p-8 rounded-3xl border-2 border-slate-100 shadow-inner" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-lg text-slate-700 font-medium list-none flex items-start before:content-['⭐'] before:mr-3 before:text-xl" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-slate-800 font-black bg-yellow-100 px-1 rounded" {...props} />
                                    }}
                                >
                                    {studyGuideContent}
                                </ReactMarkdown>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setView('intro')}
                                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-1"
                            >
                                Ready for the Quiz!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'quiz' && (
                getQuizComponent()
            )}

            {view === 'result' && (
                <div className="min-h-screen bg-orange-50 p-4 md:p-8 flex flex-col items-center justify-center">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md text-center p-12 space-y-8 border-t-8 border-green-500 animate-in zoom-in duration-500">
                        <div className="text-6xl flex justify-center mb-4">
                            {percentage === 100 ? <Trophy size={80} className="text-yellow-400" /> : <Award size={80} className="text-blue-400" />}
                        </div>
                        <h2 className="text-3xl font-black text-slate-800">All Done!</h2>
                        <div className="space-y-2">
                            <div className="text-6xl font-black text-blue-500">{score} <span className="text-3xl text-slate-300">/ {questions.length}</span></div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest">{percentage}% Correct</div>
                        </div>
                        <p className="text-lg text-slate-600 font-medium px-4">{message}</p>
                        <button
                            onClick={() => router.push(`/dashboard/week/${weekId}`)}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-lg transition-all active:scale-95"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// Simulated data fallback mapper
function getMockData(subject: string) {
    if (subject === 'vocab') return [
        { word: "feature", definition: "An important part or characteristic of something." },
        { word: "record", definition: "The best performance in a specific event." },
        { word: "assuming", definition: "Supposing something is true without proof." },
    ]
    if (subject === 'spelling') return [
        { words: "The n_rse helped me feel better.", answer: "nurse" },
        { words: "I wore a blue sh_rt today.", answer: "shirt" },
        { words: "T_rkey is for Thanksgiving.", answer: "turkey" }
    ]
    if (subject === 'math') return [
        { question: "If the bar graph shows 15 apples and 10 bananas, how many total fruits are there?", answer: "25" },
        { question: "Round 847 to the nearest hundred.", answer: "800" }
    ]
    return [
        { question: "What is an animal adaptation?", answer: "A special characteristic that helps an animal survive." },
        { question: "Why do some animals hibernate?", answer: "To survive the cold winter when food is scarce." }
    ]
}
