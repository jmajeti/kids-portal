"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Users, FileText, Upload, LogOut, Loader2, CheckCircle2, Trash2, Edit3, BookOpen, XCircle } from 'lucide-react'

export default function AdminDashboard() {
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [students, setStudents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // New Student State
    const [isAddingStudent, setIsAddingStudent] = useState(false)
    const [newStudentName, setNewStudentName] = useState('')
    const [newStudentUsername, setNewStudentUsername] = useState('')
    const [newStudentPin, setNewStudentPin] = useState('')

    // File Upload State
    const [isUploading, setIsUploading] = useState(false)
    const [uploadMessage, setUploadMessage] = useState('')
    const [selectedStudentForUpload, setSelectedStudentForUpload] = useState('')

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push('/login')
            return
        }
        setUser(session.user)
        fetchStudents(session.user.id)
    }

    const fetchStudents = async (parentId: string) => {
        const { data: studentsData } = await supabase
            .from('students')
            .select('*')
            .eq('parent_id', parentId)

        if (studentsData) {
            // Fetch curriculum for all of this parent's students
            const { data: curriculumData } = await supabase
                .from('curriculum_weeks')
                .select('id, title, student_id, start_date, end_date')
                .eq('created_by', parentId)

            const studentsWithCurriculum = studentsData.map(student => ({
                ...student,
                curriculum: curriculumData?.filter(c => c.student_id === student.id || c.student_id === null) || []
            }))
            
            setStudents(studentsWithCurriculum)
        } else {
            setStudents([])
        }
        setIsLoading(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setIsLoading(true)

        const { error } = await supabase.from('students').insert([{
            parent_id: user.id,
            name: newStudentName,
            username: newStudentUsername,
            pin_code: newStudentPin
        }])

        if (!error) {
            setNewStudentName('')
            setNewStudentUsername('')
            setNewStudentPin('')
            setIsAddingStudent(false)
            fetchStudents(user.id)
        } else {
            alert(error.message)
            setIsLoading(false)
        }
    }

    const handleDeleteStudent = async (studentId: string) => {
        if (!confirm("Are you sure you want to delete this student and all their curriculum data?")) return
        setIsLoading(true)
        const { error } = await supabase.from('students').delete().eq('id', studentId)
        if (!error && user) {
            fetchStudents(user.id)
        } else {
            alert(error?.message)
            setIsLoading(false)
        }
    }

    const handleDeleteCurriculum = async (weekId: string) => {
        if (!confirm("Are you sure you want to delete this curriculum week and all its subjects?")) return
        setIsLoading(true)
        const { error } = await supabase.from('curriculum_weeks').delete().eq('id', weekId)
        if (!error && user) {
            fetchStudents(user.id)
        } else {
            alert(error?.message)
            setIsLoading(false)
        }
    }

    const handleUpdatePin = async (studentId: string, currentPin: string) => {
        const newPin = prompt("Enter new 4-digit PIN for this student:", currentPin)
        if (!newPin || newPin === currentPin) return
        if (newPin.length !== 4 || isNaN(Number(newPin))) {
            alert("PIN must be exactly 4 digits.")
            return
        }

        setIsLoading(true)
        const { error } = await supabase.from('students').update({ pin_code: newPin }).eq('id', studentId)
        if (!error && user) {
            fetchStudents(user.id)
        } else {
            alert(error?.message)
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setUploadMessage('Extracting text locally from PDF...')

        try {
            const pdfjsLib = await import('pdfjs-dist')
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
            
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            let extractedText = ''
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const content = await page.getTextContent()
                const strings = content.items.map((item: any) => item.str)
                extractedText += strings.join(' ') + '\n'
            }

            setUploadMessage('Analyzing curriculum with AI... This may take up to 60 seconds.')

            const formData = new FormData()
            formData.append('rawText', extractedText)
            formData.append('studentId', selectedStudentForUpload)

            const res = await fetch('/api/admin/curriculum/process', {
                method: 'POST',
                body: formData
            })

            const json = await res.json()

            if (json.success) {
                setUploadMessage(`✓ Saved "${json.weekTitle}" with ${json.modules} modules!`)
                if (user) {
                    fetchStudents(user.id)
                }
            } else {
                setUploadMessage(`⚠️ Error: ${json.error}`)
            }
        } catch (e: any) {
            console.error(e)
            setUploadMessage('⚠️ Network error processing the file.')
        } finally {
            setIsUploading(false)
            setTimeout(() => setUploadMessage(''), 8000)
        }
    }

    if (isLoading && !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl">
                        <Users className="text-white" size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">Parent Dashboard</h1>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-500 font-bold transition-colors">
                    <LogOut size={20} /> Sign Out
                </button>
            </header>

            <main className="max-w-5xl mx-auto p-8 grid md:grid-cols-2 gap-8">

                {/* Left Column: Student Management */}
                <section className="space-y-6">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-indigo-500" /> My Students</h2>
                        {!isAddingStudent && (
                            <button
                                onClick={() => setIsAddingStudent(true)}
                                className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} /> Add Student
                            </button>
                        )}
                    </div>

                    {isAddingStudent && (
                        <form onSubmit={handleAddStudent} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 space-y-4 mb-6 animation-in slide-in-from-top-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                <input required value={newStudentName} onChange={e => setNewStudentName(e.target.value)} type="text" className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500" placeholder="e.g. Tommy Smith" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Login Username</label>
                                    <input required value={newStudentUsername} onChange={e => setNewStudentUsername(e.target.value)} type="text" className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500" placeholder="tommy123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">4-Digit PIN</label>
                                    <input required maxLength={4} value={newStudentPin} onChange={e => setNewStudentPin(e.target.value)} type="text" className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500 font-mono tracking-widest" placeholder="1234" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsAddingStudent(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Save Student'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid gap-4">
                        {students.length === 0 && !isLoading && !isAddingStudent && (
                            <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium">
                                No students added yet. Click "Add Student" to start.
                            </div>
                        )}
                        {students.map(student => (
                            <div key={student.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col group">
                                <div className="flex justify-between items-center w-full">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{student.name}</h3>
                                        <p className="text-sm text-slate-500 font-mono">@{student.username}</p>
                                    </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 px-4 py-2 rounded-lg font-mono text-slate-600 font-bold text-sm tracking-widest flex items-center gap-2">
                                        PIN: {student.pin_code}
                                        <button onClick={() => handleUpdatePin(student.id, student.pin_code)} className="text-slate-400 hover:text-indigo-600 transition-colors bg-white p-1 rounded-md shadow-sm ml-2">
                                            <Edit3 size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteStudent(student.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Student"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="w-full mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <BookOpen size={12} /> Assigned Curriculum
                                    </h4>
                                    {student.curriculum && student.curriculum.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {student.curriculum.map((c: any) => (
                                                <div key={c.id} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-2 group/pill">
                                                    {c.title}
                                                    <button 
                                                        onClick={() => handleDeleteCurriculum(c.id)}
                                                        className="text-indigo-300 hover:text-red-500 transition-colors"
                                                        title="Delete this curriculum"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No curriculum assigned yet.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Right Column: PDF Curriculum Upload */}
                <section className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-500" /> Upload Curriculum</h2>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100 text-center space-y-6">
                        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-blue-500">
                            <Upload size={32} />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Upload School Newsletter</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                First, select a student to personalize this curriculum for, then upload their specific weekly PDF.
                            </p>
                        </div>

                        <div className="text-left max-w-sm mx-auto">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign to Student:</label>
                            <select
                                value={selectedStudentForUpload}
                                onChange={(e) => setSelectedStudentForUpload(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700"
                                disabled={students.length === 0}
                            >
                                <option value="" disabled>-- Select a Student --</option>
                                <option value="all">Assign to All Students</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                disabled={isUploading || (!selectedStudentForUpload && students.length > 0)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <button disabled={isUploading || (!selectedStudentForUpload && students.length > 0)} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                {isUploading ? (
                                    <><Loader2 className="animate-spin" size={20} /> Parsing Document...</>
                                ) : (
                                    <>Select PDF File</>
                                )}
                            </button>
                        </div>

                        {uploadMessage && (
                            <div className="p-4 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 flex items-center justify-center gap-2 animate-in fade-in zoom-in">
                                <CheckCircle2 size={20} /> {uploadMessage}
                            </div>
                        )}
                    </div>
                </section>

            </main>
        </div>
    )
}
