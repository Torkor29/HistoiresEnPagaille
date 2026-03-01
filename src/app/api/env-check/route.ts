/**
 * Vérification (sans exposer de secret) que les variables d'environnement
 * sont bien chargées côté serveur. Utile pour débugger "ça marche en local, pas en ligne".
 */
import { NextResponse } from 'next/server';
import { isGeminiAvailable } from '@/server/services/gemini-client';

export async function GET() {
  const geminiConfigured = isGeminiAvailable();
  return NextResponse.json({
    geminiConfigured,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV ?? 'undefined',
  });
}
