import { NextResponse } from 'next/server';
import { getJournals, ensureDataLoaded } from '@/lib/recommender';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXCL_PATH = path.join(DATA_DIR, 'exclusions.json');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    await ensureDataLoaded();
    const allJournals = getJournals();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').toLowerCase();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;

    // Load Exclusions
    let excludedIds = new Set<string>();
    try {
        if (fs.existsSync(EXCL_PATH)) {
            const raw = fs.readFileSync(EXCL_PATH, 'utf-8');
            JSON.parse(raw).forEach((id: string) => excludedIds.add(id));
        }
    } catch { }

    // Filter
    let filtered = allJournals;
    if (q) {
        filtered = allJournals.filter(j =>
            j.name.toLowerCase().includes(q) ||
            (j.publisher && j.publisher.toLowerCase().includes(q))
        );
    }

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit).map(j => ({
        id: j.id,
        name: j.name,
        publisher: j.publisher,
        excluded: excludedIds.has(j.id)
    }));

    return NextResponse.json({
        items: paginated,
        total,
        page,
        pages: Math.ceil(total / limit)
    });
}
