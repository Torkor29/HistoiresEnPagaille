import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/server/services/image-providers';

export async function GET() {
  const providers = getAvailableProviders();
  return NextResponse.json(providers);
}
