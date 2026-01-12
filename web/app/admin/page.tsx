"use client";

import { useState, useEffect } from 'react';

interface AdminJournal {
    id: string;
    name: string;
    publisher: string;
    excluded: boolean;
}

export default function AdminPage() {
    const [journals, setJournals] = useState<AdminJournal[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                alert("Upload successful! Ingestion started background.");
            } else {
                alert("Upload failed: " + data.error);
            }
        } catch (err) {
            alert("Upload error");
        } finally {
            setUploading(false);
        }
    };

    const fetchJournals = async (p = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/journals?q=${encodeURIComponent(search)}&page=${p}`);
            const data = await res.json();
            setJournals(data.items || []);
            setTotalPages(data.pages || 1);
            setPage(data.page || 1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const t = setTimeout(() => fetchJournals(1), 500);
        return () => clearTimeout(t);
    }, [search]);

    const toggleExclusion = async (id: string, current: boolean) => {
        // Optimistic update
        setJournals(journals.map(j => j.id === id ? { ...j, excluded: !current } : j));

        await fetch('/api/admin/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, excluded: !current })
        });
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white p-8 transition-colors duration-500">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <div className="flex gap-4">
                        <label className={`cursor-pointer bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 text-white transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <span className="flex items-center gap-2">
                                {uploading ? "Uploading..." : "📂 Upload Dataset"}
                            </span>
                            <input
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Search journals..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-white/10 p-3 rounded border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500"
                    />

                    <div className="border border-gray-200 dark:border-white/10 rounded overflow-hidden bg-white dark:bg-transparent shadow-sm dark:shadow-none">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 dark:bg-white/5">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Journal Name</th>
                                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Publisher</th>
                                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {loading && journals.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                                ) : journals.map(j => (
                                    <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium">{j.name}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{j.publisher}</td>
                                        <td className="p-4">
                                            {j.excluded ?
                                                <span className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-400/10 px-2 py-1 rounded text-xs font-medium">Excluded</span> :
                                                <span className="text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-400/10 px-2 py-1 rounded text-xs font-medium">Active</span>
                                            }
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleExclusion(j.id, j.excluded)}
                                                className={`px-3 py-1 rounded text-sm font-medium text-white transition-colors ${j.excluded ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                                            >
                                                {j.excluded ? "Restore" : "Exclude"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                        <button
                            disabled={page === 1}
                            onClick={() => fetchJournals(page - 1)}
                            className="bg-gray-200 dark:bg-white/10 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                        >
                            Previous
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => fetchJournals(page + 1)}
                            className="bg-gray-200 dark:bg-white/10 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
