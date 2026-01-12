"use client";

import { SDG } from '@/lib/types';
import { useState } from 'react';

interface SDGResultsProps {
    results: SDG[];
}

export default function SDGResults({ results }: SDGResultsProps) {
    const [selectedSDGs, setSelectedSDGs] = useState<number[]>([]);
    const [rewrittenAbstract, setRewrittenAbstract] = useState("");
    const [rewriting, setRewriting] = useState(false);

    // New State for enhancements
    const [allSDGs, setAllSDGs] = useState<SDG[]>([]);
    const [extraSDGs, setExtraSDGs] = useState<SDG[]>([]); // Manually added SDGs
    const [isAddingString, setIsAddingString] = useState(false);
    const [viewingKeywords, setViewingKeywords] = useState<number | null>(null);

    // Combine prop results with manually added ones, ensuring NO duplicates (Key Collision Fix)
    const displayList = [
        ...results,
        ...extraSDGs.filter(e => !results.some(r => r.id === e.id))
    ].slice(0, 4);

    // Fetch all SDGs once for the picker
    const loadAllSDGs = async () => {
        if (allSDGs.length > 0) {
            setIsAddingString(true);
            return;
        }
        try {
            const res = await fetch('/api/sdgs');
            const data = await res.json();
            setAllSDGs(data);
            setIsAddingString(true);
        } catch (e) { console.error(e); }
    };

    const toggleSDG = (id: number) => {
        if (selectedSDGs.includes(id)) {
            setSelectedSDGs(selectedSDGs.filter(s => s !== id));
        } else {
            setSelectedSDGs([...selectedSDGs, id]);
        }
    };

    const handleAddSDG = (sdg: SDG) => {
        // Avoid duplicates
        if (!displayList.find(d => d.id === sdg.id)) {
            setExtraSDGs([...extraSDGs, { ...sdg, score: 0 }]); // Manually added match has 0 score or purely manual
        }
        setIsAddingString(false);
    };

    const handleRewrite = async () => {
        if (selectedSDGs.length === 0) return;
        setRewriting(true);
        try {
            const res = await fetch('/api/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    abstract: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || "",
                    sdgNames: displayList.filter(r => selectedSDGs.includes(r.id)).map(r => r.name)
                })
            });
            const data = await res.json();
            if (data.rewritten) {
                setRewrittenAbstract(data.rewritten);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRewriting(false);
        }
    };

    if (results.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayList.map((sdg) => (
                    <div
                        key={sdg.id}
                        onClick={() => toggleSDG(sdg.id)}
                        className={`relative cursor-pointer p-4 rounded-xl border transition-all group ${selectedSDGs.includes(sdg.id)
                            ? 'bg-blue-600/30 border-blue-500 ring-2 ring-blue-500'
                            : 'bg-white/60 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xl font-black text-gray-300 dark:text-white/50">#{sdg.id}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-blue-600 dark:text-blue-300">
                                    {sdg.score ? Math.round(sdg.score * 100) + '%' : 'MANUAL'}
                                </span>
                                {/* Info Button for Keywords */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setViewingKeywords(sdg.id); }}
                                    className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-white/20 text-blue-500 transition-colors"
                                    title="View Keywords"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight pr-6">{sdg.name}</h4>

                        {/* Selected Checkmark */}
                        {selectedSDGs.includes(sdg.id) && (
                            <div className="absolute top-2 right-2 text-blue-500">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add SDG Button (Empty Slot) */}
                {displayList.length < 4 && (
                    <button
                        onClick={loadAllSDGs}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all gap-2 text-gray-500 hover:text-blue-500"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium text-sm">Add SDG</span>
                    </button>
                )}
            </div>

            {/* Keyword Modal */}
            {viewingKeywords !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold dark:text-white">
                                    {(displayList.find(s => s.id === viewingKeywords) || allSDGs.find(s => s.id === viewingKeywords))?.name}
                                </h3>
                                <p className="text-sm text-gray-500">Target Keywords</p>
                            </div>
                            <button onClick={() => setViewingKeywords(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                            {((displayList.find(s => s.id === viewingKeywords) || allSDGs.find(s => s.id === viewingKeywords))?.keywords || []).map((k, i) => (
                                <span key={`${k}-${i}`} className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                                    {k}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add SDG Selector Modal */}
            {isAddingString && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold dark:text-white">Select an SDG</h3>
                            <button onClick={() => setIsAddingString(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto space-y-2 flex-1">
                            {allSDGs.filter(s => !displayList.find(d => d.id === s.id)).map(sdg => (
                                <button
                                    key={sdg.id}
                                    onClick={() => handleAddSDG(sdg)}
                                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                                >
                                    <span className="font-black text-gray-300 w-8">#{sdg.id}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{sdg.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Selected: <span className="text-gray-900 dark:text-white font-bold">{selectedSDGs.length}</span> SDGs.
                        Select SDGs to align your abstract.
                    </p>
                </div>
                <button
                    onClick={handleRewrite}
                    disabled={rewriting || selectedSDGs.length === 0}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                    {rewriting ? "Synthesizing..." : "✨ Rewrite Abstract with Selection"}
                </button>
            </div>

            {rewrittenAbstract && (
                <div className="glass-card p-6 border-green-500/30 relative bg-white/60 dark:bg-white/5">
                    <span className="absolute -top-3 -right-3 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full">AI Rewritten</span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Synthesized Abstract:</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-mono text-sm whitespace-pre-wrap">
                        {rewrittenAbstract}
                    </p>
                </div>
            )}
        </div>
    );
}
