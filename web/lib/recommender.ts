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

// Helper: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
async function loadDataAsync() {
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
                        // Store minimal needed in memory? 
                        // Actually we need embeddings. 48k * 1536 floats is ~300MB RAM. Fine.
                        // We also need tokens for fallback.
                        journalsIndex.push({
                            ...j,
                            tokens: tokenize(j.content)
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
                journalsIndex = list.map((j: any) => ({
                    ...j,
                    tokens: tokenize(j.content)
                }));
            }
        }
        console.log(`Loaded ${journalsIndex.length} journals.`);
    }

    return excludedIds;
}

export async function analyzeAbstract(abstract: string, topK: number = 3): Promise<AnalysisResult> {
    const excludedIds = await loadDataAsync();

    // 1. Generate Embedding
    let embedding: number[] | null = null;
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    if (hasApiKey) {
        try {
            const resp = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: abstract.replace("\n", " ")
            });
            embedding = resp.data[0].embedding;
        } catch (e) {
            console.error("Embedding failed", e);
        }
    }

    const inputTokens = tokenize(abstract);

    // 2. Score Journals
    const scoredJournals = journalsIndex
        .filter(j => !excludedIds.has(j.id)) // FILTER EXCLUDED
        .map(j => {
            let score = 0;
            if (hasApiKey && embedding && j.embedding) {
                score = cosineSimilarity(embedding, j.embedding);
            } else {
                // Jaccard Fallback
                score = calculateJaccard(inputTokens, j.tokens);
            }
            return { ...j, score };
        });

    // Sort and Take Top K
    scoredJournals.sort((a, b) => b.score - a.score);
    const topJournals = scoredJournals.slice(0, topK);

    // 3. Score SDGs
    let scoredSdgs = sdgs.map(sdg => {
        // Hybrid Score
        let semanticScore = 0;
        if (hasApiKey && embedding && sdg.embedding) {
            semanticScore = cosineSimilarity(embedding, sdg.embedding);
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

    // Filter by threshold or top N?
    // Let's take top 3 or > 0.4
    scoredSdgs.sort((a, b) => b.score - a.score);
    const topSdgs = scoredSdgs.slice(0, 3);

    return {
        journals: topJournals,
        sdgs: topSdgs
    };
}
