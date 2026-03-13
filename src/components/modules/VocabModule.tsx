"use client"

import { useState, useMemo } from 'react'
import { ArrowRightCircle, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react'
import { GenericMCModule } from './GenericMCModule'

// Smart string matcher for kids typing answers
export const checkMatch = (val1: string, val2: string) => {
    if (!val1 || !val2) return false;
    const clean1 = String(val1).toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = String(val2).toLowerCase().replace(/[^a-z0-9]/g, '');
    const superClean1 = clean1.replace(/^(a|an|the)/, '');
    const superClean2 = clean2.replace(/^(a|an|the)/, '');
    return clean1 === clean2 || superClean1 === superClean2;
};

export function VocabModule({ questions, score, setScore, onComplete }: any) {
    const [currentIdx, setCurrentIdx] = useState(0)
    const [input, setInput] = useState('')
    const [showOptions, setShowOptions] = useState(false)
    const [feedback, setFeedback] = useState<any>(null)

    const isFinished = currentIdx >= questions.length

    // Need to handle finish correctly outside of render loop
    if (isFinished) {
        setTimeout(() => onComplete(), 0)
        return null
    }

    const currentItem = questions[currentIdx] || {}

    const options = useMemo(() => {
        if (currentItem.options && currentItem.options.length > 0) return [...currentItem.options].sort(() => Math.random() - 0.5);
        if (!currentItem.word) return [];
        const uniqueWords = [...new Set(questions.map((v: any) => v.word))];
        const pool = uniqueWords.filter(w => w !== currentItem.word);
        const shuffledPool = pool.length < 2 ? ["Apple", "Run"] : pool.sort(() => Math.random() - 0.5).slice(0, 2);
        return [currentItem.word, ...shuffledPool].sort(() => Math.random() - 0.5);
    }, [currentItem, questions]);

    const handleInputSubmit = (e: any) => {
        e.preventDefault();
        if (!input) return;
        if (checkMatch(input, currentItem.word)) {
            setScore((s: number) => s + 1); setFeedback('correct'); setTimeout(() => proceedToNext(), 1500);
        } else {
            setShowOptions(true); setInput('');
        }
    };

    const handleOptionSelect = (word: string) => {
        if (feedback) return;
        if (word === currentItem.word) {
            setFeedback('correct'); setTimeout(() => proceedToNext(), 1500);
        } else {
            setFeedback('wrong');
        }
    };

    const proceedToNext = () => { setFeedback(null); setShowOptions(false); setInput(''); setCurrentIdx((i: number) => i + 1); };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans p-4 mt-8">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">Question {currentIdx + 1} of {questions.length}</span>
                <span className="text-lg font-black text-slate-800">Score: {score}</span>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-12 text-center border-2 border-blue-100">
                <h2 className="text-2xl font-bold text-slate-600 mb-8 italic leading-relaxed">"{currentItem.definition}"</h2>

                {!showOptions ? (
                    <form onSubmit={handleInputSubmit} className="space-y-4">
                        <input
                            autoFocus
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full text-center text-2xl p-4 border-b-4 border-blue-200 outline-none focus:border-blue-500 transition-all text-slate-800 font-bold"
                            placeholder="Type the exact word..."
                        />
                        <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 font-bold text-lg transition-all active:scale-95 disabled:opacity-50" disabled={!input}>
                            Check Answer
                        </button>
                    </form>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="text-orange-500 font-bold mb-4 flex justify-center items-center gap-2"><AlertCircle size={20} /> Not quite! Choose from the options below:</div>
                        <div className="grid gap-4">
                            {options.map((word: string) => (
                                <button
                                    key={word}
                                    disabled={feedback === 'wrong'}
                                    onClick={() => handleOptionSelect(word)}
                                    className={`w-full text-lg py-4 rounded-xl font-bold border-2 transition-all active:scale-95
                    ${feedback === 'correct' && word === currentItem.word ? 'bg-green-500 text-white border-green-500 shadow-lg' :
                                            feedback === 'wrong' && word !== currentItem.word ? 'opacity-50 border-slate-200 text-slate-400' :
                                                feedback === 'wrong' && word === currentItem.word ? 'bg-green-500 text-white border-green-500 shadow-lg' :
                                                    'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(feedback === 'wrong' || (feedback === 'correct' && !showOptions && false)) && (
                    <div className={`mt-8 p-6 rounded-xl animate-in fade-in slide-in-from-top-2 border-2 ${feedback === 'correct' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex flex-col items-center gap-4">
                            <div className={`${feedback === 'correct' ? 'text-green-600' : 'text-red-600'} font-bold text-lg flex items-center gap-2`}>
                                {feedback === 'correct' ? <CheckCircle2 /> : <XCircle />}
                                {feedback === 'correct' ? 'Great Job!' : 'Incorrect'}
                            </div>
                            {feedback === 'wrong' && <p className="text-slate-700">The definition describes: <span className="font-black text-blue-600 text-xl">{currentItem.word}</span></p>}
                            
                            {currentItem.justification && (
                                <div className="bg-white/60 p-4 rounded-xl text-sm italic text-slate-600 border border-blue-50 mt-2 max-w-md">
                                    <span className="font-bold text-blue-500 not-italic uppercase tracking-wider block mb-1 text-[10px]">Teacher's Note</span>
                                    {currentItem.justification}
                                </div>
                            )}

                            <button onClick={proceedToNext} className="mt-2 flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800">
                                Next <ArrowRightCircle size={18} />
                            </button>
                        </div>
                    </div>
                )}
                
                {feedback === 'correct' && showOptions && (
                     <div className="mt-8 p-6 bg-green-50 border-2 border-green-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-green-600 font-bold text-lg flex items-center gap-2"><CheckCircle2 /> Correct!</div>
                            {currentItem.justification && (
                                <div className="bg-white/60 p-4 rounded-xl text-sm italic text-slate-600 border border-blue-50 mt-2 max-w-md">
                                    <span className="font-bold text-blue-500 not-italic uppercase tracking-wider block mb-1 text-[10px]">Teacher's Note</span>
                                    {currentItem.justification}
                                </div>
                            )}
                            <button onClick={proceedToNext} className="mt-2 flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800">
                                Next <ArrowRightCircle size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
