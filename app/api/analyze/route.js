import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { PROMPT, RESPONSE_SCHEMA, cleanAnalysis, mockAnalysis } from '@/lib/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 8 * 1024 * 1024
const fail = (status, detail) => NextResponse.json({ detail }, { status })

async function readPhoto(form, name) {
  const file = form.get(name)
  if (!file || typeof file === 'string') return null
  if (!file.type?.startsWith('image/')) throw { status: 415, detail: `The ${name} photo must be an image.` }
  if (file.size > MAX_BYTES) throw { status: 413, detail: `The ${name} photo is larger than 8 MB.` }
  const bytes = Buffer.from(await file.arrayBuffer())
  return bytes.length ? { label: name, mimeType: file.type, data: bytes.toString('base64') } : null
}

export async function POST(request) {
  // Read the settings from the .env.local file on every request, so edits only need a restart.
  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
  const mock = ['1', 'true', 'yes'].includes((process.env.MOCK_ANALYSIS || '').toLowerCase())

  let photos
  try {
    const form = await request.formData()
    photos = (await Promise.all(['front', 'left', 'right'].map((n) => readPhoto(form, n)))).filter(Boolean)
  } catch (e) {
    if (e?.status) return fail(e.status, e.detail)
    return fail(400, 'Could not read the upload.')
  }
  if (!photos.length || photos[0].label !== 'front') return fail(400, 'A front photo is required.')

  if (mock) return NextResponse.json({ ...mockAnalysis(), mock: true })

  if (!apiKey) {
    return fail(503, 'GEMINI_API_KEY is missing. Add it to the .env.local file and restart the server.')
  }

  const parts = []
  for (const p of photos) {
    parts.push({ text: `${p.label[0].toUpperCase()}${p.label.slice(1)} view:` })
    parts.push({ inlineData: { mimeType: p.mimeType, data: p.data } })
  }
  parts.push({ text: PROMPT })

  let analysis
  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    })
    analysis = cleanAnalysis(JSON.parse(response.text))
  } catch (e) {
    console.error('[nhue] Gemini analysis failed:', e?.message || e)
    const msg = String(e?.message || '')
    if (/API key|API_KEY|permission|401|403/i.test(msg)) {
      return fail(502, 'Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.')
    }
    if (/not found|404/i.test(msg)) {
      return fail(502, `Gemini couldn't find the model "${model}". Check GEMINI_MODEL in .env.local.`)
    }
    return fail(502, 'The color analysis failed. Try again in a moment.')
  }

  if (!analysis.face_found) {
    return fail(422, "We couldn't find a clear face in the front photo. Try a closer, well-lit shot.")
  }
  return NextResponse.json({ ...analysis, mock: false })
}
