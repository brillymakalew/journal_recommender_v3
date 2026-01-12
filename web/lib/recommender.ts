import fs from 'fs';
import path from 'path';
import readline from 'readline';
import OpenAI from 'openai';
import { Journal, SDG, AnalysisResult } from './types';

// Singleton Data Cache
export let journalsIndex: any[] = [];
let sdgs: SDG[] = [];

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data is loaded
export async function ensureDataLoaded() {
    await loadDataAsync();
}

export function getJournals() {
    return journalsIndex;
}

// OpenAI for embeddings
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy",
});

// Helper: Calculate Vector Norm (Magnitude)
function calculateNorm(vec: number[]): number {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
    return Math.sqrt(sum);
}

// Optimized Cosine: Uses precomputed normB
function cosineSimilarityOptimized(vecA: number[], vecB: number[], normA: number, normB: number): number {
    let dot = 0;
    // Unrolling loop slightly might help V8, but simple loop is usually good enough.
    // Length is 1536 for OpenAI embeddings.
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
    }
    return dot / (normA * normB);
}

// Tokenizer
function tokenize(text: string): Set<string> {
    return new Set(
        text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3)
    );
}

// Jaccard Fallback
function calculateJaccard(setA: Set<string>, setB: Set<string>): number {
    let intersection = 0;
    const [smaller, larger] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    smaller.forEach(item => {
        if (larger.has(item)) intersection++;
    });
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

// Data Loader
let loadingPromise: Promise<Set<string>> | null = null;

async function loadDataAsync() {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        console.log("Starting data load...");
        // Load Exclusions
        let excludedIds = new Set<string>();
        try {
            const exclPath = path.join(DATA_DIR, 'exclusions.json');
            if (fs.existsSync(exclPath)) {
                const raw = fs.readFileSync(exclPath, 'utf-8');
                const list = JSON.parse(raw);
                list.forEach((id: string) => excludedIds.add(id));
            }
        } catch (e) { console.warn("Exclusions load failed"); }

        // Load SDGs
        if (sdgs.length === 0) {
            try {
                const raw = fs.readFileSync(path.join(DATA_DIR, 'sdgs.json'), 'utf-8');
                sdgs = JSON.parse(raw);
                // Precompute SDG norms
                sdgs.forEach(s => {
                    if (s.embedding) {
                        (s as any).norm = calculateNorm(s.embedding);
                    }
                });
            } catch (e) {
                console.warn("SDG data not found");
            }
        }

        // Load Journals (Streaming JSONL)
        if (journalsIndex.length === 0) {
            console.log("Loading journals.jsonl...");
            const jsonlPath = path.join(DATA_DIR, 'journals.jsonl');

            if (fs.existsSync(jsonlPath)) {
                const fileStream = fs.createReadStream(jsonlPath);
                const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

                for await (const line of rl) {
                    if (line.trim()) {
                        try {
                            const j = JSON.parse(line);
                            // MEMORY OPTIMIZATION: Drop huge text fields
                            delete j.content;
                            delete j.abstract; // if exists

                            journalsIndex.push({
                                ...j,
                                tokens: tokenize(j.content || ""), // Generate tokens first
                                norm: j.embedding ? calculateNorm(j.embedding) : 0
                            });
                        } catch (e) { }
                    }
                }
            } else {
                // Fallback to JSON
                const jsonPath = path.join(DATA_DIR, 'journals.json');
                if (fs.existsSync(jsonPath)) {
                    console.log("Fallback to legacy JSON load");
                    const raw = fs.readFileSync(jsonPath, 'utf-8');
                    const list = JSON.parse(raw);
                    journalsIndex = list.map((j: any) => {
                        const tokens = tokenize(j.content || "");
                        // MEMORY OPTIMIZATION
                        const { content, abstract, ...rest } = j;
                        return {
                            ...rest,
                            tokens,
                            norm: j.embedding ? calculateNorm(j.embedding) : 0
                        };
                    });
                }
            }
            console.log(`Loaded ${journalsIndex.length} journals.`);
        }

        return excludedIds;
    })().catch(e => {
        console.error("Data load failed:", e);
        loadingPromise = null; // Reset lock so we can retry
        throw e;
    });

    return loadingPromise;
}

// Helper: Min-Heap or QuickSelect is overkill for K=20, simple sort on mapped array is fine if mapped objects are small.
// But we can avoid mapping the WHOLE journal object.

export async function analyzeAbstract(abstract: string, topK: number = 3): Promise<AnalysisResult> {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    console.log(`Analyzing abstract. Length: ${abstract.length}. API Key present: ${hasApiKey}`);

    // 1. Parallelize IO
    const embeddingPromise = hasApiKey
        ? openai.embeddings.create({
            model: "text-embedding-3-small",
            input: abstract.replace("\n", " ")
        }).then(res => res.data[0].embedding).catch(e => { console.error("Embedding failed", e); return null; })
        : Promise.resolve(null);

    // Ensure data is loaded
    const dataPromise = loadDataAsync();

    const [embedding, excludedIds] = await Promise.all([embeddingPromise, dataPromise]);
    console.log(`Data loaded. Journals: ${journalsIndex.length}. Embedding generated: ${!!embedding}`);

    const inputTokens = tokenize(abstract);

    // 2. Score Journals (Optimized Loop)
    // We only create small objects { index, score } instead of cloning the massive journal objects
    const scores = new Array(journalsIndex.length);
    let count = 0;

    // Optimization: Pre-calculate query norm once
    let queryNorm = 0;
    if (embedding) {
        queryNorm = calculateNorm(embedding);
    }

    // Optimization: Cache journalsIndex reference to local scope
    const journals = journalsIndex;
    const len = journals.length;

    for (let i = 0; i < len; i++) {
        const j = journals[i];
        if (excludedIds.has(j.id)) continue;

        let score = 0;
        if (embedding && j.embedding) {
            // Use optimized Similarity
            score = cosineSimilarityOptimized(embedding, j.embedding, queryNorm, j.norm);
        } else {
            // Jaccard Fallback
            score = calculateJaccard(inputTokens, j.tokens);
        }

        // Store only necessary data for sorting
        scores[count++] = { index: i, score };
    }

    // Trim array to actual count (since we skipped exclusions)
    const validScores = scores.slice(0, count);

    // Sort: High to Low
    validScores.sort((a, b) => b.score - a.score);

    // Take Top K and map back to full objects
    const topJournals = validScores.slice(0, topK).map(item => {
        const j = journals[item.index];
        return { ...j, score: item.score };
    });

    // 3. Score SDGs (SDGs are few, optimization less critical but good to keep consistent)
    // We can just keep the map logic for SDGs as there are only ~17-20 of them.
    let scoredSdgs = sdgs.map(sdg => {
        // Hybrid Score
        let semanticScore = 0;
        if (embedding && sdg.embedding) {
            // Only use optimized if SDG has norm precomputed (we added that to loader)
            const sdgNorm = (sdg as any).norm || calculateNorm(sdg.embedding);
            semanticScore = cosineSimilarityOptimized(embedding, sdg.embedding, queryNorm, sdgNorm);
        }

        // Keyword Bonus
        const keywordsFound = sdg.keywords.filter(kw => {
            try {
                // Regex for whole word match is safer but slower? 
                // Let's stick to includest/regex hybrid or just simple includes for speed if needed.
                // The original logic was fine, just keeping it.
                const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                return regex.test(abstract);
            } catch { return abstract.toLowerCase().includes(kw); }
        });

        const keywordBonus = keywordsFound.length * 0.1;
        const finalScore = (semanticScore * 0.5) + keywordBonus;

        return { ...sdg, score: finalScore, keywordsFound };
    });

    scoredSdgs.sort((a, b) => b.score - a.score);
    const topSdgs = scoredSdgs.slice(0, 3);

    return {
        journals: topJournals,
        sdgs: topSdgs
    };
}
