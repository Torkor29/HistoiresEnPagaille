import { NextResponse } from 'next/server';
import { PREMADE_THEMES } from '@/lib/premade-themes';

export async function GET() {
  return NextResponse.json({ themes: PREMADE_THEMES });
}
