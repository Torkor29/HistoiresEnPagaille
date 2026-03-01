import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key?: string[] }> }
) {
  const keyParts = (await params).key;
  if (!keyParts?.length) return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  const key = keyParts.join('/');
  if (key.includes('..')) return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  try {
    const fullPath = join(UPLOAD_DIR, key);
    const buffer = await readFile(fullPath);
    const ext = key.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
