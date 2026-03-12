"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock, User, GraduationCap, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
    const [isParent, setIsParent] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Student Login State
    const [username, setUsername] = useState('')
    const [pin, setPin] = useState('')

    // Parent Login State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleStudentLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        // In a full production app without RLS compromises, we would use an edge function
        // to verify the username/pin and mint a custom JWT.
        // For this MVP, we are using standard auth for parents, and simulating student session via local state / simplified check.
        try {
            const { data: students, error: fetchError } = await supabase
                .from('students')
                .select('*')
                .eq('username', username)
                .eq('pin_code', pin)

            if (fetchError || !students || students.length === 0) {
                throw new Error("Invalid username or PIN.")
            }

            // Store student session info in local storage for the dashboard to pick up
            localStorage.setItem('study_bee_student_session', JSON.stringify(students[0]))
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const [isSignUp, setIsSignUp] = useState(false)

    const handleParentLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            if (isSignUp) {
                // New parent registration
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`
                    }
                })
                if (error) throw error
                alert("Check your email for the confirmation link to complete registration!")
            } else {
                // Existing parent login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/admin')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to authenticate')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
            >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white text-center">
                    <GraduationCap size={48} className="mx-auto mb-4 text-yellow-300" />
                    <h1 className="text-3xl font-black uppercase tracking-wider">Study Bee</h1>
                    <p className="text-blue-100 mt-2 font-medium">Log in to start learning!</p>
                </div>

                <div className="p-8">
                    {/* Toggle between Student and Parent login */}
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                        <button
                            onClick={() => setIsParent(false)}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${!isParent ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Student Login
                        </button>
                        <button
                            onClick={() => setIsParent(true)}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${isParent ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Parent / Teacher
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2">
                            <Lock size={16} /> {error}
                        </div>
                    )}

                    {!isParent ? (
                        <form onSubmit={handleStudentLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Secret PIN</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        required
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700 tracking-widest"
                                        placeholder="****"
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                            <button
                                disabled={isLoading}
                                type="submit"
                                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-blue-200"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={24} /> : <>Let's Go! <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleParentLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                                        placeholder="parent@email.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                disabled={isLoading}
                                type="submit"
                                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-indigo-200"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={24} /> : (isSignUp ? "Create Parent Account" : "Admin Login")}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setIsSignUp(!isSignUp); setError(''); }}
                                    className="text-indigo-500 font-bold hover:text-indigo-700 text-sm"
                                >
                                    {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </motion.div>
        </div>
    )
}
