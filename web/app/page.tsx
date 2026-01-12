"use client";

import { useState } from "react";
import JournalCard from "@/components/JournalCard";
import SDGResults from "@/components/SDGResults";
import { Journal, SDG } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
    const [abstract, setAbstract] = useState("");
    const [loading, setLoading] = useState(false);
    const [journals, setJournals] = useState<Journal[]>([]);
    const [sdgs, setSdgs] = useState<SDG[]>([]);
    const [topK, setTopK] = useState(3);

    const handleAnalyze = async () => {
        if (!abstract.trim()) return;
        setLoading(true);
        setJournals([]);
        setSdgs([]);

        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ abstract, topK }),
            });
            const data = await res.json();
            if (res.ok) {
                setJournals(data.journals || []);
                setSdgs(data.sdgs || []);
            } else {
                alert("Analysis failed: " + (data.error || "Unknown"));
            }
        } catch (e) {
            console.error(e);
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const { theme, toggleTheme } = useTheme();

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-black text-gray-900 dark:text-white p-6 md:p-12 transition-colors duration-500">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 pb-2">
                            Journal Recommender
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                            AI-powered semantic search to find the perfect Scopus-indexed journal for your manuscript.
                            Align with UN Sustainable Development Goals instantly.
                        </p>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-3 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>

                {/* Input Section */}
                <div className="glass-panel p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-none">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Your Manuscript Abstract
                        </label>
                        <textarea
                            className="w-full h-48 bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-xl p-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Paste your abstract here (min 50 words)..."
                            value={abstract}
                            onChange={(e) => setAbstract(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Recommendations:</span>
                            <input
                                type="range"
                                min="3"
                                max="10"
                                value={topK}
                                onChange={(e) => setTopK(parseInt(e.target.value))}
                                className="w-32 h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="font-mono bg-gray-200 dark:bg-white/10 px-2 py-1 rounded text-xs text-gray-900 dark:text-white">{topK}</span>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={loading || abstract.length < 50}
                            className="btn-primary w-full md:w-auto shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : (
                                "Analyze Abstract"
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Section - Vertical Stack */}
                {(journals.length > 0 || sdgs.length > 0) && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">

                        {/* 1. Journals Block */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Recommended Journals</h2>
                            </div>
                            {/* Vertical List as requested */}
                            <div className="grid grid-cols-1 gap-6">
                                {journals.map((j) => (
                                    <JournalCard key={j.id} journal={j} />
                                ))}
                            </div>
                        </section>

                        {/* 2. SDGs Block */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-green-500 rounded-full"></div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">SDG Alignment</h2>
                            </div>
                            <SDGResults results={sdgs} />
                        </section>

                    </div>
                )}
            </div>
        </main>
    );
}
