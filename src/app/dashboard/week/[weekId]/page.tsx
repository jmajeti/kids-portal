"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BookOpen, Calculator, Award, ArrowLeft, Gamepad2, Pencil, Layout, ListOrdered, Sparkles, Loader2, Glasses, PlayCircle, Leaf, Star } from 'lucide-react'
import Link from 'next/link'

export default function WeekSelector() {
    const router = useRouter()
    const params = useParams()
    const weekId = params.weekId as string
    const supabase = createClient()
    const [student, setStudent] = useState<any>(null)
    const [modules, setModules] = useState<any[]>([])
    const [weekTitle, setWeekTitle] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const session = localStorage.getItem('study_bee_student_session')
        if (!session) {
            router.push('/login')
            return
        }
        setStudent(JSON.parse(session))
        fetchModules()
    }, [])

    const fetchModules = async () => {
        // Fetch the week details
        if (weekId.startsWith('simulated')) {
            setWeekTitle(weekId === 'simulated-week-1' ? "March 1st" : "March 6")
            // Simulated modules
            setModules([
                { id: 'vocab', subject: 'vocab', name: 'Vocab Match', desc: 'Octopus Escapes Again!', items: [] },
                { id: 'spelling', subject: 'spelling', name: 'Spelling: /ûr/ Sound', desc: 'nurse, shirt, turkey...', items: [] },
                { id: 'math', subject: 'math', name: 'Math: Data Cycles', desc: 'Line plots, Addition...', items: [] },
                { id: 'science', subject: 'science', name: 'Science: Animals', desc: 'Animal Adaptations', items: [] }
            ])
            setIsLoading(false)
            return
        }

        const { data: weekData } = await supabase.from('curriculum_weeks').select('*').eq('id', weekId).single()
        if (weekData) setWeekTitle(weekData.title)

        const { data: moduleData } = await supabase.from('study_modules').select('*').eq('week_id', weekId)
        if (moduleData) {
            // Map subjects to UI names/icons
            const mapped = moduleData.map(m => ({
                id: m.id,
                subject: m.subject,
                name: getModuleName(m.subject),
                desc: m.topics_prompt || "Tap to practice!",
                items: m.exact_content || []
            }))
            setModules(mapped)
        }
        setIsLoading(false)
    }

    const getModuleName = (subject: string) => {
        switch (subject.toLowerCase()) {
            case 'vocab': return 'Vocab Match'
            case 'spelling': return 'Spelling Test'
            case 'math': return 'Math Review'
            case 'grammar': return 'Grammar Guru'
            case 'science': return 'Science Explorer'
            case 'reading': return 'Reading Comp.'
            case 'figurative': return 'Figurative Language'
            default: return subject
        }
    }

    const getModuleIconColor = (subject: string) => {
        switch (subject.toLowerCase()) {
            case 'vocab': return { icon: BookOpen, color: 'bg-blue-100 text-blue-600 border-blue-200' }
            case 'spelling': return { icon: Award, color: 'bg-pink-100 text-pink-600 border-pink-200' }
            case 'math': return { icon: Calculator, color: 'bg-green-100 text-green-600 border-green-200' }
            case 'science': return { icon: Leaf, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' }
            case 'grammar': return { icon: Pencil, color: 'bg-orange-100 text-orange-600 border-orange-200' }
            case 'reading': return { icon: Layout, color: 'bg-purple-100 text-purple-600 border-purple-200' }
            default: return { icon: Star, color: 'bg-slate-100 text-slate-600 border-slate-200' }
        }
    }

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-orange-50"><Loader2 className="animate-spin text-orange-500" size={48} /></div>

    return (
        <div className="min-h-screen bg-orange-50 font-sans text-slate-800 p-4 md:p-8">
            <header className="max-w-5xl mx-auto flex items-center mb-12 relative">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="absolute left-0 flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm text-slate-500 hover:text-blue-500 hover:scale-105 transition-all"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="w-full text-center">
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">{weekTitle}</h1>
                    <p className="text-slate-500 font-bold text-sm">Select a Subject</p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map(mod => {
                        const { icon: Icon, color } = getModuleIconColor(mod.subject)
                        return (
                            <Link href={`/quiz/${weekId}/${mod.subject}`} key={mod.id} className="group block h-full">
                                <div className={`h-full bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:${color.split(' ')[2]} transition-all flex items-center gap-5 hover:-translate-y-1`}>
                                    <div className={`p-4 rounded-2xl ${color.split(' ')[0]} ${color.split(' ')[1]} group-hover:scale-110 transition-transform flex-shrink-0`}>
                                        <Icon size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{mod.name}</h3>
                                        <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-tight mt-1">{mod.desc}</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}
