// Head pose + capture-quality checks on top of MediaPipe Face Mesh landmarks.

export const FRAME_ASPECT = 3 / 4 // the camera frame is shown as 3:4 portrait, video is cropped to fit (cover)

export const STAGE_INFO = {
  front: { title: 'Front', yaw: [-8, 8], target: 0, say: 'Look straight at the camera' },
  left: { title: 'Left side', yaw: [22, 46], target: 33, say: 'Turn your head to your left' },
  right: { title: 'Right side', yaw: [-46, -22], target: -33, say: 'Turn your head to your right' },
}

const deg = (r) => (r * 180) / Math.PI
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const NOSE_PROTRUSION = 1.15 // nose tip sits ~15% of head radius in front of the face outline

// Maps raw video coordinates (0-1) to what the user sees in the 3:4 mirrored frame.
export function mapper(vw, vh) {
  const va = vw / vh
  let visX = 1
  let visY = 1
  if (va > FRAME_ASPECT) visX = FRAME_ASPECT / va
  else visY = va / FRAME_ASPECT
  return {
    x: (x) => 1 - (x - (1 - visX) / 2) / visX, // mirrored
    y: (y) => (y - (1 - visY) / 2) / visY,
    visX,
    visY,
  }
}

// lm: 468 landmarks, normalized to the raw (unmirrored) video frame.
// Positive yaw = head turned to the person's own left.
export function computePose(lm, map) {
  const nose = lm[1]
  const a = lm[234]
  const b = lm[454]
  const xL = Math.min(a.x, b.x)
  const xR = Math.max(a.x, b.x)
  const half = (xR - xL) / 2 || 1e-6
  const centerX = (xL + xR) / 2
  // Nose offset from the face midline, relative to the projected half-width.
  // For a head of radius R turned by t: offset = 1.15 R sin(t), half-width = R cos(t) => ratio = 1.15 tan(t)
  const ratio = (nose.x - centerX) / half
  const yaw = deg(Math.atan(ratio / NOSE_PROTRUSION))

  const e1 = lm[33]
  const e2 = lm[263]
  const roll = deg(Math.atan2(e2.y - e1.y, e2.x - e1.x))

  let minY = 1
  let maxY = 0
  for (const p of lm) {
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const faceH = (maxY - minY) / map.visY
  const cx = map.x(centerX)
  const cy = map.y((minY + maxY) / 2)
  return {
    yaw,
    roll,
    faceH,
    cx,
    cy,
    halfW: half / map.visX,
    noseX: map.x(nose.x),
    noseY: map.y(nose.y),
    box: { x: minY, minY, maxY, xL, xR },
  }
}

// Where the nose should be (screen coords, 0-1) for the stage's target angle.
export function targetNoseX(stageId, pose) {
  const t = STAGE_INFO[stageId].target
  // mirrored: turning to your left moves the nose toward the screen's left
  const offset = NOSE_PROTRUSION * pose.halfW * Math.tan((t * Math.PI) / 180)
  return pose.cx - offset
}

// Returns { ok, msg } for the first thing the user should fix, in priority order.
export function evaluate(stageId, pose, light) {
  const stage = STAGE_INFO[stageId]
  if (!pose) return { ok: false, msg: 'Move your face into the outline' }
  if (pose.faceH < 0.38) return { ok: false, msg: 'Move closer' }
  if (pose.faceH > 0.74) return { ok: false, msg: 'Move back a little' }
  if (Math.abs(pose.cx - 0.5) > 0.11 || Math.abs(pose.cy - 0.46) > 0.11)
    return { ok: false, msg: 'Center your face in the outline' }
  if (light != null && light < 70) return { ok: false, msg: 'Too dark. Face a window or a lamp' }
  if (light != null && light > 220) return { ok: false, msg: 'Too bright. Step back from the light' }
  if (Math.abs(pose.roll) > 12) return { ok: false, msg: 'Keep your head level' }
  const [lo, hi] = stage.yaw
  if (stageId === 'front') {
    if (pose.yaw < lo) return { ok: false, msg: 'Turn your head back to the left, face the camera' }
    if (pose.yaw > hi) return { ok: false, msg: 'Turn your head back to the right, face the camera' }
  } else if (stageId === 'left') {
    if (pose.yaw < lo) return { ok: false, msg: stage.say }
    if (pose.yaw > hi) return { ok: false, msg: 'Turn back a little' }
  } else {
    if (pose.yaw > hi) return { ok: false, msg: stage.say }
    if (pose.yaw < lo) return { ok: false, msg: 'Turn back a little' }
  }
  return { ok: true, msg: 'Hold still' }
}

let facePromise
export function loadFaceMesh() {
  facePromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/mediapipe/face_mesh/face_mesh.js'
    s.onerror = () => reject(new Error('Face model files are missing. Run npm install in web/.'))
    s.onload = () => {
      try {
        const fm = new window.FaceMesh({ locateFile: (f) => `/mediapipe/face_mesh/${f}` })
        fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
        fm.initialize().then(() => resolve(fm), reject)
      } catch (e) {
        reject(e)
      }
    }
    document.head.appendChild(s)
  })
  return facePromise
}

// Average brightness (0-255) of the middle of the face, from the video frame.
const probe = typeof document !== 'undefined' ? document.createElement('canvas') : null
export function faceBrightness(video, pose, map) {
  if (!probe || !video.videoWidth) return null
  probe.width = probe.height = 24
  const ctx = probe.getContext('2d', { willReadFrequently: true })
  const vw = video.videoWidth
  const vh = video.videoHeight
  const w = (pose.box.xR - pose.box.xL) * 0.5 * vw
  const h = (pose.box.maxY - pose.box.minY) * 0.5 * vh
  const x = ((pose.box.xL + pose.box.xR) / 2) * vw - w / 2
  const y = ((pose.box.minY + pose.box.maxY) / 2) * vh - h / 2
  ctx.drawImage(video, x, y, w, h, 0, 0, 24, 24)
  const d = ctx.getImageData(0, 0, 24, 24).data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
  return sum / (d.length / 4)
}
