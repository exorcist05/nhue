// Prompt, response schema, validation and demo data for the color analysis.
// Server-only: imported by app/api/analyze/route.js.
import { Type } from '@google/genai'

export const PROMPT = `You are an expert personal color analyst. You will see one to three photos of the
same person: the first is a front view, the others (if present) are left and right views.

Task:
1. Judge the person's natural skin undertone (warm, cool or neutral), depth (light, medium, deep)
   and seasonal family (Spring, Summer, Autumn, Winter).
2. Base this on skin on the cheeks, forehead, jaw and neck, plus natural eye and hair color.
   Compensate for lighting: ignore color casts from windows, lamps, flash, filters, makeup and
   tinted backgrounds. If several photos disagree, trust the most evenly lit one.
3. skin_hex is your best estimate of their true skin color under neutral light, as #RRGGBB.
4. Choose exactly 3 colors in "best" that flatter this person most when worn near the face
   (clothing). Make them clearly different from one another (not three shades of one hue), ordered
   from best match to third. Each needs a short everyday color name, an exact #RRGGBB hex, and a
   one-sentence reason (max 18 words) about how it works with their skin, eyes or hair.
5. Choose 2 colors in "avoid" that would wash them out or clash, in the same format.
6. face_box is the bounding box of the face in the FIRST image, normalized to 0-1000
   (ymin, xmin, ymax, xmax), from the top of the forehead to the very bottom of the chin.
7. confidence reflects how reliable the lighting and image quality make your reading.
   photo_notes: one short sentence on anything that limited accuracy (or "Good lighting.").
8. summary: two plain sentences describing their coloring and why this season fits.

If there is no clear human face in the first image, set face_found to false, and fill the other
fields with neutral placeholder values.
Write in plain, friendly English with no jargon.`

const colorPick = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    hex: { type: Type.STRING },
    reason: { type: Type.STRING },
  },
  required: ['name', 'hex', 'reason'],
  propertyOrdering: ['name', 'hex', 'reason'],
}

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    face_found: { type: Type.BOOLEAN },
    family: { type: Type.STRING, enum: ['Spring', 'Summer', 'Autumn', 'Winter'] },
    undertone: { type: Type.STRING, enum: ['warm', 'cool', 'neutral'] },
    depth: { type: Type.STRING, enum: ['light', 'medium', 'deep'] },
    skin_hex: { type: Type.STRING },
    summary: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    photo_notes: { type: Type.STRING },
    best: { type: Type.ARRAY, items: colorPick },
    avoid: { type: Type.ARRAY, items: colorPick },
    face_box: {
      type: Type.OBJECT,
      properties: {
        ymin: { type: Type.INTEGER },
        xmin: { type: Type.INTEGER },
        ymax: { type: Type.INTEGER },
        xmax: { type: Type.INTEGER },
      },
      required: ['ymin', 'xmin', 'ymax', 'xmax'],
    },
  },
  required: [
    'face_found', 'family', 'undertone', 'depth', 'skin_hex', 'summary',
    'confidence', 'photo_notes', 'best', 'avoid', 'face_box',
  ],
}

const FAMILIES = ['Spring', 'Summer', 'Autumn', 'Winter']
const UNDERTONES = ['warm', 'cool', 'neutral']
const DEPTHS = ['light', 'medium', 'deep']
const CONFIDENCE = ['low', 'medium', 'high']
const HEX = /^#?[0-9a-fA-F]{6}$/

function hex(value) {
  const v = String(value ?? '').trim()
  if (!HEX.test(v)) throw new Error(`Bad hex from model: ${JSON.stringify(value)}`)
  return '#' + v.replace('#', '').toUpperCase()
}

function oneOf(value, list, label) {
  const v = String(value ?? '').trim().toLowerCase()
  const found = list.find((x) => x.toLowerCase() === v)
  if (!found) throw new Error(`Bad ${label} from model: ${JSON.stringify(value)}`)
  return found
}

function picks(list, min, max, label) {
  if (!Array.isArray(list) || list.length < min) throw new Error(`Model returned fewer than ${min} ${label} colors`)
  return list.slice(0, max).map((c) => ({
    name: String(c?.name ?? '').trim() || 'Color',
    hex: hex(c?.hex),
    reason: String(c?.reason ?? '').trim(),
  }))
}

const clamp = (n) => Math.max(0, Math.min(1000, Math.round(Number(n) || 0)))

// Turns the model's JSON into the exact shape the front end expects. Throws if it is unusable.
export function cleanAnalysis(raw) {
  const box = raw?.face_box ?? {}
  return {
    face_found: Boolean(raw?.face_found),
    family: oneOf(raw?.family, FAMILIES, 'season'),
    undertone: oneOf(raw?.undertone, UNDERTONES, 'undertone'),
    depth: oneOf(raw?.depth, DEPTHS, 'depth'),
    skin_hex: hex(raw?.skin_hex),
    summary: String(raw?.summary ?? '').trim(),
    confidence: oneOf(raw?.confidence, CONFIDENCE, 'confidence'),
    photo_notes: String(raw?.photo_notes ?? '').trim(),
    best: picks(raw?.best, 3, 3, 'best'),
    avoid: picks(raw?.avoid, 1, 3, 'avoid'),
    face_box: { ymin: clamp(box.ymin), xmin: clamp(box.xmin), ymax: clamp(box.ymax), xmax: clamp(box.xmax) },
  }
}

export function mockAnalysis() {
  return {
    face_found: true,
    family: 'Autumn',
    undertone: 'warm',
    depth: 'medium',
    skin_hex: '#B98563',
    summary:
      'Your skin has a golden, warm glow and your eyes and hair are deep and rich. Earthy, saturated colors echo that warmth instead of fighting it.',
    confidence: 'medium',
    photo_notes: 'Demo data. No photo was analyzed.',
    best: [
      { name: 'Terracotta', hex: '#B85C38', reason: 'Echoes the golden warmth in your skin and brightens your complexion.' },
      { name: 'Moss green', hex: '#6B7A3A', reason: 'A warm green that makes your brown eyes look deeper.' },
      { name: 'Mustard', hex: '#D2A03C', reason: 'Adds a sunlit glow that suits your warm undertone.' },
    ],
    avoid: [
      { name: 'Icy blue', hex: '#BFD9F2', reason: 'Cool and pale, it drains the warmth from your skin.' },
      { name: 'Stone gray', hex: '#8E8E8A', reason: 'Flat and cool, it makes your face look tired.' },
    ],
    face_box: { ymin: 90, xmin: 180, ymax: 810, xmax: 840 },
  }
}
