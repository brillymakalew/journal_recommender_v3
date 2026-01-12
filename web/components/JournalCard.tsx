"use client";

import { useState } from 'react';
import { Journal } from '@/lib/types';

interface JournalCardProps {
    journal: Journal;
}

export default function JournalCard({ journal }: JournalCardProps) {
    const [showModal, setShowModal] = useState(false);
    const [checklist, setChecklist] = useState<string[]>([]);
    const [loadingChecklist, setLoadingChecklist] = useState(false);

    const matchScore = journal.score ? Math.round(journal.score * 100) : 0;

    // Determine badge color based on score
    const badgeColor = matchScore >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/30' :
        matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
            'bg-blue-500/20 text-blue-300 border-blue-500/30';

    const generateChecklist = async () => {
        if (checklist.length > 0) return;
        setLoadingChecklist(true);
        try {
            const res = await fetch('/api/checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journalName: journal.name,
                    scope: journal.scope
                })
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data.checklist)) {
                setChecklist(data.checklist);
            } else {
                throw new Error(data.error || 'Failed to generate');
            }
        } catch (e) {
            console.error(e);
            setChecklist([
                "Ensure manuscript fits scope: " + journal.scope.slice(0, 50) + "...",
                "Verify standard formatting.",
                "Check word count and figure limits.",
                "Include conflict of interest statement.",
                "Review specific author guidelines online."
            ]);
        } finally {
            setLoadingChecklist(false);
        }
    };

    return (
        <>
            <div className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl font-black text-black dark:text-white">{matchScore}%</span>
                </div>

                <div className="z-10">
                    <div className="flex flex-col items-start gap-1 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                            {matchScore}% Match
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 pr-12">{journal.name}</h3>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-2">
                        {journal.publisher || "Publisher Unknown"}
                    </p>

                    <p className="text-gray-700 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                        {journal.scope}
                    </p>

                    <button
                        onClick={() => { setShowModal(true); generateChecklist(); }}
                        className="w-full py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-900 dark:text-white text-sm font-medium transition-colors border border-black/10 dark:border-white/10"
                    >
                        View Details & Submission Checklist
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1a1f3c] border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200 text-gray-900 dark:text-white">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-[#1a1f3c] z-10">
                            <h2 className="text-2xl font-bold pr-4">{journal.name}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 text-xl">✕</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                    <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Publisher</span>
                                    <span className="font-medium">{journal.publisher || "N/A"}</span>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                    <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Coverage</span>
                                    <span className="font-medium">{journal.coverage || "N/A"}</span>
                                </div>
                                <div className="col-span-2 p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                    <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">ASJC Codes</span>
                                    <span className="font-mono text-xs">{journal.asjc || "N/A"}</span>
                                </div>
                            </div>

                            {/* Scope */}
                            <div className="space-y-2">
                                <h4 className="text-lg font-semibold">Journal Scope</h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-black/20 p-4 border border-gray-200 dark:border-white/5">
                                    {journal.scope}
                                </p>
                            </div>

                            {/* AI Checklist */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-semibold flex items-center gap-2">
                                        ✨ AI Submission Checklist
                                    </h4>
                                    {loadingChecklist && <span className="text-xs text-blue-500 dark:text-blue-400 animate-pulse">Generating...</span>}
                                </div>

                                <div className="space-y-2">
                                    {checklist.length === 0 ? (
                                        <div className="h-32 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse"></div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {checklist.map((item, i) => (
                                                <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 p-3 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                                    <span className="text-green-600 dark:text-green-400 shrink-0">✓</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                {journal.link && (
                                    <a
                                        href={journal.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-3 text-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                                    >
                                        Visit Scopus Page ↗
                                    </a>
                                )}
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
