// Copies the Face Mesh model + wasm files into public/ so the camera works offline, with no CDN.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const src = 'node_modules/@mediapipe/face_mesh'
const dest = 'public/mediapipe/face_mesh'
if (!existsSync(src)) process.exit(0)
mkdirSync(dest, { recursive: true })
for (const f of readdirSync(src)) {
  if (f === 'package.json' || f.endsWith('.ts') || f.endsWith('.md')) continue
  cpSync(join(src, f), join(dest, f))
}
console.log('Face Mesh files copied to', dest)
