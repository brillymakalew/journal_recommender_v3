import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SDG } from '@/lib/types';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'sdgs.json');
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'SDG data not found' }, { status: 404 });
        }

        const raw = fs.readFileSync(filePath, 'utf-8');
        const sdgs: SDG[] = JSON.parse(raw);

        // Return lightweight list (we might not need embeddings here)
        const lightweight = sdgs.map(({ id, name, keywords }) => ({ id, name, keywords }));

        return NextResponse.json(lightweight);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to load SDGs' }, { status: 500 });
    }
}
