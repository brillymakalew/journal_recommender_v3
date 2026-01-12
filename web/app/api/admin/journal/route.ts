import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXCL_PATH = path.join(DATA_DIR, 'exclusions.json');

export async function POST(req: Request) {
    try {
        const { id, excluded } = await req.json();

        // Load existing
        let excludedIds = new Set<string>();
        if (fs.existsSync(EXCL_PATH)) {
            const raw = fs.readFileSync(EXCL_PATH, 'utf-8');
            JSON.parse(raw).forEach((i: string) => excludedIds.add(i));
        }

        // Update
        if (excluded) {
            excludedIds.add(id);
        } else {
            excludedIds.delete(id);
        }

        // Save
        fs.writeFileSync(EXCL_PATH, JSON.stringify(Array.from(excludedIds)), 'utf-8');

        return NextResponse.json({ success: true, excluded });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
