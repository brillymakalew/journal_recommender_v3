import { NextResponse } from 'next/server';
import { analyzeAbstract } from '@/lib/recommender';

export async function POST(req: Request) {
    try {
        const { abstract, topK } = await req.json();

        if (!abstract) {
            return NextResponse.json({ error: 'Abstract required' }, { status: 400 });
        }

        // Limit topK
        const k = Math.min(Math.max(topK, 1), 20);

        const result = await analyzeAbstract(abstract, k);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
