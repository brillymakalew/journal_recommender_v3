import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    try {
        const { abstract, sdgNames } = await req.json();

        if (!abstract || !sdgNames || sdgNames.length === 0) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an expert academic editor." },
                { role: "user", content: `Rewrite the following abstract to better emphasize its alignment with these UN SDGs: ${sdgNames.join(', ')}. Keep it academic and concise.\n\nAbstract: ${abstract}` }
            ]
        });

        return NextResponse.json({ rewritten: completion.choices[0].message.content });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
