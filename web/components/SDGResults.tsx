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

    const toggleSDG = (id: number) => {
        if (selectedSDGs.includes(id)) {
            setSelectedSDGs(selectedSDGs.filter(s => s !== id));
        } else {
            setSelectedSDGs([...selectedSDGs, id]);
        }
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
                    sdgNames: results.filter(r => selectedSDGs.includes(r.id)).map(r => r.name)
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
                {results.map((sdg) => (
                    <div
                        key={sdg.id}
                        onClick={() => toggleSDG(sdg.id)}
                        className={`cursor-pointer p-4 rounded-xl border transition-all ${selectedSDGs.includes(sdg.id)
                            ? 'bg-blue-600/30 border-blue-500 ring-2 ring-blue-500'
                            : 'bg-white/60 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xl font-black text-gray-300 dark:text-white/50">#{sdg.id}</span>
                            <span className="text-xs font-mono text-blue-600 dark:text-blue-300">
                                {sdg.score ? Math.round(sdg.score * 100) : 0}%
                            </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{sdg.name}</h4>
                    </div>
                ))}
            </div>

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
