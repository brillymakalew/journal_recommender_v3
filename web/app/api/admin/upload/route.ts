import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const RESOURCES_DIR = path.join(process.cwd(), 'resources'); // /app/resources

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(RESOURCES_DIR, "List Scopus Outlet.xlsx");

        // Save file (overwrite)
        await writeFile(filePath, buffer);
        console.log(`Saved file to ${filePath}`);

        // Trigger Ingestion (Background?)
        // If we await, it might timeout the request.
        // But user wants to know if it succeeds.
        // Ingest takes time. Let's return success and run in background, 
        // OR run small batch.
        // The script is robust now.
        // Let's spawn it detached?
        // Or just run it and hope it's fast (it won't be if partial).
        // Let's run it non-blocking and return "Ingestion Started".

        exec('python3 scripts/ingest_data.py', { cwd: '/app' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Ingestion error: ${error}`);
                return;
            }
            console.log(`Ingestion output: ${stdout}`);
            if (stderr) console.error(`Ingestion stderr: ${stderr}`);
        });

        return NextResponse.json({ success: true, message: "File uploaded. Ingestion started in background." });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
