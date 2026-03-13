"use client"

import { useState, useMemo } from 'react'
import { ArrowRightCircle, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react'
import { checkMatch } from './VocabModule'

export function GenericMCModule({ questions, score, setScore, onComplete }: any) {
    const [currentIdx, setCurrentIdx] = useState(0)
    const [input, setInput] = useState('')
    const [showOptions, setShowOptions] = useState(false)
    const [feedback, setFeedback] = useState<any>(null)

    const isFinished = currentIdx >= questions.length

    if (isFinished) {
        setTimeout(() => onComplete(), 0)
        return null
    }

    const item = questions[currentIdx] || {}

    const options = useMemo(() => {
        if (item.options && item.options.length > 0) return [...item.options].sort(() => Math.random() - 0.5);
        if (!item.answer) return [];
        const unique = [...new Set(questions.map((q: any) => q.answer))].filter(a => a !== item.answer);
        let distractors = unique.sort(() => Math.random() - 0.5).slice(0, 3);
        if (distractors.length < 3) distractors = [...distractors, "Noun", "Verb", "Entertain", "10", "20"].slice(0, 3);
        return [item.answer, ...distractors].sort(() => Math.random() - 0.5);
    }, [item, questions]);

    const handleInputSubmit = (e: any) => {
        e.preventDefault();
        if (!input) return;
        if (checkMatch(input, item.answer)) {
            setScore((s: number) => s + 1); setFeedback('correct');
        } else {
            setShowOptions(true); setInput('');
        }
    };

    const handleOptionSelect = (ans: string) => {
        if (feedback) return;
        if (ans === item.answer) {
            setScore((s: number) => s + 1); setFeedback('correct');
        } else {
            setFeedback('wrong');
        }
    };

    const proceedToNext = () => { setFeedback(null); setShowOptions(false); setInput(''); setCurrentIdx((i: number) => i + 1); };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans p-4 mt-8">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-orange-500 uppercase tracking-widest">Question {currentIdx + 1} of {questions.length}</span>
                <span className="text-lg font-black text-slate-800">Score: {score}</span>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-12 text-center border-2 border-orange-100">
                <h2 className="text-2xl font-bold text-slate-700 mb-8 leading-snug">{item.question}</h2>

                {!showOptions ? (
                    <form onSubmit={handleInputSubmit} className="space-y-4">
                        <input
                            autoFocus
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full text-center text-xl p-4 border-b-4 border-orange-200 outline-none focus:border-orange-500 transition-all font-bold text-slate-800"
                            placeholder="Type your answer..."
                        />
                        <button className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 font-bold text-lg transition-all active:scale-95 disabled:opacity-50" disabled={!input}>
                            Check Result
                        </button>
                    </form>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="text-orange-500 font-bold mb-4 flex justify-center items-center gap-2"><AlertCircle size={20} /> Not quite! Select the correct answer:</div>
                        <div className="grid gap-4">
                            {options.map((ans: string) => (
                                <button
                                    key={ans}
                                    disabled={feedback === 'wrong'}
                                    onClick={() => handleOptionSelect(ans)}
                                    className={`w-full py-4 rounded-xl font-bold border-2 transition-all active:scale-95
                    ${feedback === 'correct' && ans === item.answer ? 'bg-green-500 text-white border-green-500 shadow-lg' :
                                            feedback === 'wrong' && ans !== item.answer ? 'opacity-50 border-slate-200 text-slate-400' :
                                                feedback === 'wrong' && ans === item.answer ? 'bg-green-500 text-white border-green-500 shadow-lg' :
                                                    'bg-white border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                                >
                                    {ans}
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
                                {feedback === 'correct' ? '🎉 Correct!' : 'Incorrect'}
                            </div>
                            {feedback === 'wrong' && <p className="text-slate-700">The correct answer is: <span className="font-black text-orange-600 text-xl">{item.answer}</span></p>}
                            
                            {item.justification && (
                                <div className="bg-white/60 p-4 rounded-xl text-sm italic text-slate-600 border border-orange-50 mt-2 max-w-md">
                                    <span className="font-bold text-orange-500 not-italic uppercase tracking-wider block mb-1 text-[10px]">Teacher's Note</span>
                                    {item.justification}
                                </div>
                            )}

                            <button onClick={proceedToNext} className="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-bold flex items-center gap-2 transition-all">
                                Next <ArrowRightCircle size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
