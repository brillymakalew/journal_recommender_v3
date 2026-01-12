import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { journalName, scope } = await req.json();

        if (!journalName) {
            return NextResponse.json({ error: 'Journal name is required' }, { status: 400 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'dummy',
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert academic publishing assistant."
                },
                {
                    role: "user",
                    content: `Generate a concise 5-item submission checklist for "${journalName}". 
          Context/Scope: "${scope || 'General'}".
          Return ONLY the 5 checklist items as a JSON string array.`
                }
            ],
            temperature: 0.7,
        });

        const content = completion.choices[0].message.content;
        let items = [];
        try {
            const cleanContent = content?.replace(/```json/g, '').replace(/```/g, '').trim();
            items = JSON.parse(cleanContent || '[]');
        } catch (e) {
            items = content?.split('\n').filter(l => l.trim().length > 0).slice(0, 5) || [];
        }

        return NextResponse.json({ checklist: items });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
