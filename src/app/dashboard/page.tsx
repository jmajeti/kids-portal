"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BookOpen, CalendarDays, Star, ArrowLeft, Loader2, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function StudentDashboard() {
    const router = useRouter()
    const supabase = createClient()
    const [student, setStudent] = useState<any>(null)
    const [weeks, setWeeks] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check local storage for the simulated student session from the login page
        const session = localStorage.getItem('study_bee_student_session')
        if (!session) {
            router.push('/login')
            return
        }
        const parsedStudent = JSON.parse(session)
        setStudent(parsedStudent)
        fetchCurriculum(parsedStudent.id)
    }, [])

    const fetchCurriculum = async (studentId: string) => {
        // Fetch globally active curriculums OR curriculums explicitly assigned to this student
        const { data } = await supabase
            .from('curriculum_weeks')
            .select('*')
            .or(`active.eq.true,student_id.eq.${studentId}`)
            .order('created_at', { ascending: false })

        // We will inject some hardcoded fallback data if the db is empty 
        // to ensure the UI can be tested immediately without admin setup.
        if (!data || data.length === 0) {
            setWeeks([])
        } else {
            setWeeks(data)
        }

        setIsLoading(false)
    }

    const handleLogout = () => {
        localStorage.removeItem('study_bee_student_session')
        router.push('/login')
    }

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-orange-50"><Loader2 className="animate-spin text-orange-500" size={48} /></div>

    return (
        <div className="min-h-screen bg-orange-50 font-sans text-slate-800 p-4 md:p-8">
            <header className="max-w-5xl mx-auto flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-400 p-2 rounded-xl shadow-md">
                        <Star className="text-white fill-current" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Study Bee</h1>
                        <p className="text-slate-500 font-bold text-sm">Welcome back, {student?.name}!</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-500 font-bold transition-colors bg-white px-4 py-2 rounded-full shadow-sm">
                    <LogOut size={16} /> Exit
                </button>
            </header>

            <main className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl shadow-lg p-8 text-center space-y-8 border-t-8 border-orange-400">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-wide">Select Your Study Week</h2>
                    <p className="text-lg text-slate-500 max-w-lg mx-auto mb-8">Choose the week you want to practice. The AI automatically creates fresh questions every time!</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {weeks.map((week, idx) => (
                            <Link href={`/dashboard/week/${week.id}`} key={week.id} className="group text-left">
                                <div className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 text-center h-full shadow-sm hover:shadow-md
                  ${idx % 3 === 0 ? 'bg-teal-50 border-teal-100 hover:border-teal-400 hover:bg-teal-100' :
                                        idx % 3 === 1 ? 'bg-indigo-50 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-100' :
                                            'bg-pink-50 border-pink-100 hover:border-pink-400 hover:bg-pink-100'}`}>

                                    <CalendarDays size={40} className={
                                        idx % 3 === 0 ? 'text-teal-500' :
                                            idx % 3 === 1 ? 'text-indigo-500' : 'text-pink-500'
                                    } />

                                    <div>
                                        <h3 className={`text-xl font-bold mb-1 ${idx % 3 === 0 ? 'text-teal-900' :
                                            idx % 3 === 1 ? 'text-indigo-900' : 'text-pink-900'
                                            }`}>{week.title}</h3>
                                        {week.start_date && week.end_date ? (
                                            <p className="text-sm font-medium opacity-80 mb-2">
                                                {new Date(week.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                {' - '}
                                                {new Date(week.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </p>
                                        ) : null}
                                        <p className="text-xs font-bold opacity-70 uppercase tracking-wider bg-white/50 py-1 px-3 rounded-full inline-block mt-2">Tap to start</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                </div>
            </main>
        </div>
    )
}
