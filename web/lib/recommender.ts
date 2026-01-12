import fs from 'fs';
import path from 'path';
import readline from 'readline';
import OpenAI from 'openai';
import { Journal, SDG, AnalysisResult } from './types';

// Singleton Data Cache
// Optimization: Matrix-based storage
const DIMENSIONS = 1536;
const MAX_JOURNALS = 100000; // Cap at 100k to reserve ~600MB RAM for the Float32Array
export let journalMatrix: Float32Array | null = null;
export let journalMetadata: any[] = [];
export let journalCount = 0; // Actual loaded count
let sdgs: SDG[] = [];

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data is loaded
export async function ensureDataLoaded() {
    await loadDataAsync();
}

export function getJournals() {
    return journalMetadata.slice(0, journalCount);
}

// OpenAI for embeddings
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy",
});

// Helper: Calculate Vector Norm (Magnitude)
function calculateNorm(vec: number[] | Float32Array): number {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
    return Math.sqrt(sum);
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
        console.log("Starting data load (Matrix Mode)...");
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

        // Load Journals (Streaming JSONL + Matrix Fill)
        if (!journalMatrix) {
            console.log("Allocating Matrix...");
            // Allocate 600MB buffer for vectors
            journalMatrix = new Float32Array(MAX_JOURNALS * DIMENSIONS);
            journalCount = 0;
            journalMetadata = new Array(MAX_JOURNALS);

            console.log("Loading journals.jsonl...");
            const jsonlPath = path.join(DATA_DIR, 'journals.jsonl');

            if (fs.existsSync(jsonlPath)) {
                const fileStream = fs.createReadStream(jsonlPath);
                const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

                for await (const line of rl) {
                    if (line.trim()) {
                        try {
                            if (journalCount >= MAX_JOURNALS) break;

                            const j = JSON.parse(line);

                            // 1. Store Embedding in Matrix
                            if (j.embedding && j.embedding.length === DIMENSIONS) {
                                const offset = journalCount * DIMENSIONS;
                                for (let k = 0; k < DIMENSIONS; k++) {
                                    journalMatrix[offset + k] = j.embedding[k];
                                }
                            }

                            // 2. Store minimal metadata (Memory Diet)
                            journalMetadata[journalCount] = {
                                id: j.id,
                                name: j.name,
                                publisher: j.publisher,
                                coverage: j.coverage,
                                scope: j.scope || "", // Keep scope for display? Or maybe drop if too huge? User needs it for UI.
                                link: j.link,
                                asjc: j.asjc,
                                tokens: tokenize(j.content || ""), // Still needed for fallback? If embedding exists we prioritize it.
                                norm: j.embedding ? calculateNorm(j.embedding) : 0,
                                hasEmbedding: !!j.embedding
                            };

                            journalCount++;

                        } catch (e) { }
                    }
                }
            }
            console.log(`Loaded ${journalCount} journals into Matrix.`);
        }

        return excludedIds;
    })().catch(e => {
        console.error("Data load failed:", e);
        loadingPromise = null;
        throw e;
    });

    return loadingPromise;
}

export async function analyzeAbstract(abstract: string, topK: number = 3): Promise<AnalysisResult> {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    console.time("Analysis");
    console.log(`Analyzing abstract. Length: ${abstract.length}. API Key present: ${hasApiKey}`);

    // 1. Generate Input Embedding
    const embeddingPromise = hasApiKey
        ? openai.embeddings.create({
            model: "text-embedding-3-small",
            input: abstract.replace("\n", " ")
        }).then(res => res.data[0].embedding).catch(e => { console.error("Embedding failed", e); return null; })
        : Promise.resolve(null);

    // Ensure data is loaded
    const dataPromise = loadDataAsync();

    const [embedding, excludedIds] = await Promise.all([embeddingPromise, dataPromise]);
    console.log(`Data loaded. Journals: ${journalCount}. Embedding generated: ${!!embedding}`);

    const inputTokens = tokenize(abstract);

    // 2. Score Journals (Matrix Scan)
    const scores = new Array(journalCount);
    const matrix = journalMatrix!; // Safe assertion if loaded
    const metadata = journalMetadata;

    // Optimization: Pre-calculate query norm once
    let queryNorm = 0;
    if (embedding) {
        queryNorm = calculateNorm(embedding);
    }

    // High Performance Loop
    // Accessing typed array linearly is much faster
    let validCount = 0;

    // Cache standard for loop vars
    const useSemantic = !!(embedding && matrix);

    console.time("ScoringLoop");
    for (let i = 0; i < journalCount; i++) {
        const meta = metadata[i];
        if (excludedIds.has(meta.id)) continue;

        let score = 0;

        if (useSemantic && meta.hasEmbedding) {
            // Optimized Dot Product against Flat Matrix
            let dot = 0;
            const offset = i * DIMENSIONS;

            // Manual loop is often faster than subarray for small overhead
            for (let k = 0; k < DIMENSIONS; k++) {
                dot += embedding![k] * matrix[offset + k];
            }

            score = dot / (queryNorm * meta.norm);
        } else {
            // Jaccard Fallback
            score = calculateJaccard(inputTokens, meta.tokens);
        }

        // Store result
        scores[validCount++] = { index: i, score };
    }
    console.timeEnd("ScoringLoop");

    // Trim
    const validScores = scores.slice(0, validCount);

    // Sort: High to Low
    validScores.sort((a, b) => b.score - a.score);

    // Take Top K and map back to full objects
    const topJournals = validScores.slice(0, topK).map(item => {
        const meta = metadata[item.index];
        return { ...meta, score: item.score };
    });

    // 3. Score SDGs (SDGs are few, optimization less critical)
    let scoredSdgs = sdgs.map(sdg => {
        // Hybrid Score
        let semanticScore = 0;
        if (embedding && sdg.embedding) {
            const sdgNorm = (sdg as any).norm || calculateNorm(sdg.embedding);
            // Standard dot product for SDG (not in matrix)
            let dot = 0;
            for (let k = 0; k < DIMENSIONS; k++) dot += embedding![k] * sdg.embedding[k];
            semanticScore = dot / (queryNorm * sdgNorm);
        }

        // Keyword Bonus
        const keywordsFound = sdg.keywords.filter(kw => {
            try {
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

    console.timeEnd("Analysis");
    return {
        journals: topJournals,
        sdgs: topSdgs
    };
}
