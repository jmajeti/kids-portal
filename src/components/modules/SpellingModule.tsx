"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowRightCircle, AlertCircle, XCircle, Volume2, Loader2, CheckCircle2, Award } from 'lucide-react'
import { checkMatch } from './VocabModule'

export function SpellingModule({ questions, score, setScore, onComplete }: any) {
    const [hasStarted, setHasStarted] = useState(false)
    const [currentIdx, setCurrentIdx] = useState(0)
    const [input, setInput] = useState('')
    const [showOptions, setShowOptions] = useState(false)
    const [feedback, setFeedback] = useState<any>(null)
    const [isAudioLoading, setIsAudioLoading] = useState(false)

    // Keep track of audio instance so we can cancel it
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const isFinished = currentIdx >= questions.length

    if (isFinished) {
        setTimeout(() => onComplete(), 0)
        return null
    }

    const currentItem = questions[currentIdx] || {}

    const options = useMemo(() => {
        if (currentItem.options && currentItem.options.length > 0) return [...currentItem.options].sort(() => Math.random() - 0.5);
        if (!currentItem.answer) return [];
        const uniqueWords = [...new Set(questions.map((v: any) => v.answer))];
        const pool = uniqueWords.filter(w => w !== currentItem.answer);
        const shuffledPool = pool.length < 3 ? ["Apple", "Run", "Jump"] : pool.sort(() => Math.random() - 0.5).slice(0, 3);
        return [currentItem.answer, ...shuffledPool].sort(() => Math.random() - 0.5);
    }, [currentItem, questions]);

    const playTTS = async (text: string) => {
        setIsAudioLoading(true)
        try {
            // Stop any currently playing audio
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }

            // Use Browser Speech Synthesis instead of Gemini direct for stability & offline support
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance("Spell the word: " + text);
                utterance.rate = 0.75; // Slower for clarity
                utterance.pitch = 1.1; // Slightly higher/clearer
                window.speechSynthesis.speak(utterance);
            } else {
                console.warn("TTS not supported in this browser.")
            }
        } catch (e) {
            console.error("TTS Error", e)
        } finally {
            setIsAudioLoading(false)
        }
    }

    useEffect(() => {
        if (hasStarted && !isFinished && currentItem.answer && feedback === null && !showOptions) {
            playTTS(currentItem.answer)
        }
    }, [currentIdx, isFinished, hasStarted, currentItem.answer, showOptions])

    if (!hasStarted) {
        return (
            <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-lg p-12 mt-12 text-center border-t-8 border-pink-500">
                <Award size={64} className="mx-auto text-pink-500 mb-6" />
                <h2 className="text-3xl font-black mb-4 text-slate-800">Spelling Test</h2>
                <p className="mb-8 text-lg font-medium text-slate-500">Make sure your device sound is turned ON. We will speak each word to you!</p>
                <button onClick={() => setHasStarted(true)} className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-200 text-xl transition-all active:scale-95">
                    Start Spelling Test
                </button>
            </div>
        );
    }

    const handleInputSubmit = (e: any) => {
        e.preventDefault();
        if (!input) return;
        if (checkMatch(input, currentItem.answer)) {
            setScore((s: number) => s + 1); setFeedback('correct');
        } else {
            setShowOptions(true); setInput('');
        }
    };

    const handleOptionSelect = (word: string) => {
        if (feedback) return;
        if (word === currentItem.answer) {
            setScore((s: number) => s + 1); setFeedback('correct');
        } else {
            setFeedback('wrong');
        }
    };

    const proceedToNext = () => { setFeedback(null); setShowOptions(false); setInput(''); setCurrentIdx((i: number) => i + 1); };

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans p-4 mt-8">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-pink-500 uppercase tracking-widest">Word {currentIdx + 1} of {questions.length}</span>
                <span className="text-lg font-black text-slate-800">Score: {score}</span>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-12 text-center border-2 border-pink-100">
                <h2 className="text-xl font-bold text-slate-600 mb-6">Listen and spell the word:</h2>

                <button
                    onClick={() => playTTS(currentItem.answer)}
                    disabled={isAudioLoading}
                    className="mx-auto flex items-center justify-center gap-3 bg-pink-100 hover:bg-pink-200 text-pink-700 py-6 px-10 rounded-full font-black text-xl transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 mb-8"
                    type="button"
                >
                    {isAudioLoading ? <Loader2 size={32} className="animate-spin" /> : <Volume2 size={32} />}
                    {isAudioLoading ? "Loading..." : "Play Word"}
                </button>

                {!showOptions ? (
                    <form onSubmit={handleInputSubmit} className="space-y-4">
                        <input
                            autoFocus
                            disabled={feedback === 'wrong' || feedback === 'correct'}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full text-center text-3xl font-black tracking-widest p-4 border-b-4 border-pink-200 outline-none focus:border-pink-500 transition-all text-slate-800 disabled:bg-slate-50"
                            placeholder="Type here..."
                        />
                        <button className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-lg shadow-pink-200 font-bold text-lg transition-all active:scale-95 disabled:opacity-50" disabled={!input}>
                            Check Spelling
                        </button>
                    </form>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="text-orange-500 font-bold mb-4 flex justify-center items-center gap-2"><AlertCircle size={20} /> Not quite! Let's try multiple choice.</div>
                        <p className="text-slate-500 font-medium mb-6 text-sm italic">Hint: {currentItem.words || "Sound it out!"}</p>
                        <div className="grid gap-4">
                            {options.map((word: string) => (
                                <button
                                    key={word}
                                    disabled={feedback === 'wrong'}
                                    onClick={() => handleOptionSelect(word)}
                                    className={`w-full text-xl py-4 rounded-xl font-bold border-2 transition-all active:scale-95
                    ${feedback === 'correct' && word === currentItem.answer ? 'bg-green-500 text-white border-green-500 shadow-lg' :
                                            feedback === 'wrong' && word !== currentItem.answer ? 'opacity-50 border-slate-200 text-slate-400' :
                                                feedback === 'wrong' && word === currentItem.answer ? 'bg-green-500 text-white border-green-500 shadow-lg' :
                                                    'bg-white border-pink-200 text-pink-600 hover:bg-pink-50'}`}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className={`mt-8 p-6 rounded-xl animate-in fade-in slide-in-from-top-2 border-2 ${feedback === 'correct' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex flex-col items-center gap-4">
                            <div className={`${feedback === 'correct' ? 'text-green-600' : 'text-red-600'} font-bold text-lg flex items-center gap-2`}>
                                {feedback === 'correct' ? <CheckCircle2 /> : <XCircle />}
                                {feedback === 'correct' ? '🎉 Perfect Spelling!' : 'Incorrect'}
                            </div>
                            {feedback === 'wrong' && (
                                <p className="text-slate-700 font-medium">The correct spelling is: <span className="font-black tracking-widest text-pink-600 text-2xl block mt-2">{currentItem.answer}</span></p>
                            )}

                            {currentItem.justification && (
                                <div className="bg-white/60 p-4 rounded-xl text-sm italic text-slate-600 border border-pink-50 mt-2 max-w-md">
                                    <span className="font-bold text-pink-500 not-italic uppercase tracking-wider block mb-1 text-[10px]">Teacher's Note</span>
                                    {currentItem.justification}
                                </div>
                            )}

                            <button onClick={proceedToNext} className="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-bold flex items-center gap-2 transition-all">
                                Next Word <ArrowRightCircle size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
