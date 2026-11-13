import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Quick check that the .env.local settings were picked up. Never returns the key itself.
export function GET() {
  return NextResponse.json({
    ok: true,
    model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
    key_configured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
    mock: ['1', 'true', 'yes'].includes((process.env.MOCK_ANALYSIS || '').toLowerCase()),
  })
}
