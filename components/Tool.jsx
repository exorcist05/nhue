'use client'

import { useEffect, useRef, useState } from 'react'
import { cropToChin, textOn } from '@/lib/image'

// Sample drape shown before the visitor has taken photos, so the section is never empty.
const SAMPLE = {
  sample: true,
  family: 'Autumn',
  undertone: 'warm',
  depth: 'medium',
  confidence: 'sample',
  skin_hex: '#B98563',
  summary: 'This is a sample reading on an illustrated face. Take your photos above and your own colors will appear here.',
  best: [
    { name: 'Terracotta', hex: '#B85C38', reason: 'Echoes golden warmth in the skin and brightens the complexion.' },
    { name: 'Moss green', hex: '#6B7A3A', reason: 'A warm green that makes brown eyes look deeper.' },
    { name: 'Mustard', hex: '#D2A03C', reason: 'Adds a sunlit glow that suits a warm undertone.' },
  ],
  avoid: [
    { name: 'Icy blue', hex: '#BFD9F2', reason: 'Cool and pale, it drains the warmth from warm skin.' },
    { name: 'Stone gray', hex: '#8E8E8A', reason: 'Flat and cool, it makes the face look tired.' },
  ],
  face_box: { ymin: 190, xmin: 300, ymax: 660, xmax: 700 },
}

function sampleFaceUrl() {
  const c = document.createElement('canvas')
  c.width = 600
  c.height = 700
  const x = c.getContext('2d')
  x.fillStyle = '#8c9f7d'; x.fillRect(0, 0, 600, 700)
  x.fillStyle = '#2b1d1a'; x.beginPath(); x.ellipse(300, 290, 175, 215, 0, 0, 7); x.fill()
  x.fillStyle = '#a97352'; x.fillRect(235, 430, 130, 170)
  x.fillStyle = '#6e7a52'; x.beginPath(); x.ellipse(300, 720, 300, 170, 0, 0, 7); x.fill()
  x.fillStyle = '#b98563'; x.beginPath(); x.ellipse(300, 300, 128, 165, 0, 0, 7); x.fill()
  x.fillStyle = '#2b1d1a'; x.beginPath(); x.ellipse(300, 168, 140, 70, 0, Math.PI, 0); x.fill()
  x.fillStyle = '#2a1c18'; [[255, 292], [345, 292]].forEach((q) => { x.beginPath(); x.ellipse(q[0], q[1], 11, 7, 0, 0, 7); x.fill() })
  x.strokeStyle = '#2b1d1a'; x.lineWidth = 6; x.lineCap = 'round'
  ;[[232, 268, 278, 263], [322, 263, 368, 268]].forEach((l) => { x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); x.stroke() })
  x.strokeStyle = '#8a4a3a'; x.lineWidth = 5; x.beginPath(); x.moveTo(262, 378); x.quadraticCurveTo(300, 402, 338, 378); x.stroke()
  x.strokeStyle = '#a06f50'; x.lineWidth = 4; x.beginPath(); x.moveTo(300, 300); x.lineTo(292, 342); x.lineTo(310, 344); x.stroke()
  return c.toDataURL('image/jpeg', 0.92)
}

function SampleDrape() {
  const [url, setUrl] = useState('')
  useEffect(() => setUrl(sampleFaceUrl()), [])
  if (!url) return null
  return <Result result={SAMPLE} photo={{ url }} />
}

const SLOTS = [
  { id: 'front', title: 'Front', hint: 'Look straight at the camera. Daylight by a window works best.', required: true },
  { id: 'left', title: 'Left side', hint: 'Turn your head about 30° to your left.' },
  { id: 'right', title: 'Right side', hint: 'Turn your head about 30° to your right.' },
]
const LABELS = ['Best match for you', 'Great match', 'Also flattering']

function Chevron({ dir }) {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true">
      <path d={dir === 'left' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Slot({ slot, photo, onFile, onClear, onCamera }) {
  const input = useRef(null)
  return (
    <div className="slot glass">
      <div className={`slot-frame ${photo ? 'has' : ''}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={`${slot.title} photo`} />
        ) : (
          <div className="slot-ghost" aria-hidden="true" />
        )}
        {photo && (
          <button className="slot-remove" onClick={onClear} aria-label={`Remove ${slot.title} photo`}>
            Remove
          </button>
        )}
      </div>
      <h3>
        {slot.title} <span className="tag">{slot.required ? 'Required' : 'Adds accuracy'}</span>
      </h3>
      <p className="soft">{slot.hint}</p>
      <div className="actions tight">
        <button className="pill" onClick={onCamera}>{photo ? 'Retake with camera' : 'Use camera'}</button>
        <button className="pill" onClick={() => input.current.click()}>Upload</button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

function Capture({ photos, addFile, clear, openCamera, onSubmit, error }) {
  const [msg, setMsg] = useState('')
  const count = Object.values(photos).filter(Boolean).length
  return (
    <>
      <p className="lede soft">
        The guided camera takes all three photos for you: front, then left, then right. It shows a head outline, tells
        you how to move, counts 3, 2, 1 and takes each photo when you're in position.
      </p>
      <div className="actions">
        <button className="pill solid" onClick={() => openCamera(['front', 'left', 'right'])}>Start guided camera</button>
        <span className="fine soft">Or add photos one at a time. Natural light, no filters, hair off your forehead.</span>
      </div>
      <div className="slots">
        {SLOTS.map((s) => (
          <Slot
            key={s.id}
            slot={s}
            photo={photos[s.id]}
            onFile={async (f) => {
              try {
                setMsg('')
                await addFile(s.id, f)
              } catch {
                setMsg("That file couldn't be read as an image. Try a JPG or PNG.")
              }
            }}
            onClear={() => clear(s.id)}
            onCamera={() => openCamera([s.id])}
          />
        ))}
      </div>
      {(error || msg) && <p className="msg" role="alert">{error || msg}</p>}
      <div className="actions">
        <button className="pill solid" onClick={() => (photos.front ? onSubmit() : setMsg('Add a front photo first.'))}>
          Find my colors
        </button>
        <span className="fine soft">{count} of 3 photos added</span>
      </div>
    </>
  )
}

function Drape({ photoUrl, box, items, index, setIndex }) {
  const [face, setFace] = useState(photoUrl)
  useEffect(() => {
    let live = true
    cropToChin(photoUrl, box).then((u) => live && setFace(u))
    return () => { live = false }
  }, [photoUrl, box])

  const n = items.length
  const item = items[index]
  const isAvoid = item.kind === 'avoid'
  const step = (d) => setIndex((index + d + n) % n)

  return (
    <div
      className="drape"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') step(-1)
        if (e.key === 'ArrowRight') step(1)
      }}
    >
      <div className="drape-main">
        <button className="arrow" onClick={() => step(-1)} aria-label="Previous color"><Chevron dir="left" /></button>
        <div className="card glass">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="faceimg" src={face} alt="Your front photo" />
          <div className="collar" style={{ background: item.hex, color: textOn(item.hex) }}>
            <span>{item.name}</span>
            <span>{item.hex}</span>
          </div>
        </div>
        <button className="arrow" onClick={() => step(1)} aria-label="Next color"><Chevron dir="right" /></button>
      </div>

      <div className="ctrl glass">
        <div className="caption" aria-live="polite">
          <span className={`badge ${isAvoid ? 'avoid' : ''}`}>{isAvoid ? 'Skip this one' : LABELS[index]}</span>
          <p>{item.reason}</p>
        </div>
        <div className="strip" role="group" aria-label="Color choices">
          <span className="soft">Best three</span>
          {items.map((it, i) => (
            <span key={it.hex + i} className="strip-item">
              {i === 3 && <span className="sep soft">Avoid</span>}
              <button
                className={`chip ${it.kind}`}
                style={{ background: it.hex }}
                onClick={() => setIndex(i)}
                aria-label={`${it.kind === 'avoid' ? 'Avoid: ' : ''}${it.name}`}
                aria-pressed={i === index}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Result({ result, photo, restart }) {
  const items = [
    ...result.best.map((c) => ({ ...c, kind: 'best' })),
    ...result.avoid.map((c) => ({ ...c, kind: 'avoid' })),
  ]
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const item = items[index]

  function copy() {
    const text = result.best.map((c) => `${c.name} ${c.hex}`).join('\n')
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <>
      {result.sample && <p className="note glass">Sample drape. Take your photos above to see your own colors here.</p>}
      {result.mock && (
        <p className="note glass">Demo data. Set MOCK_ANALYSIS=false and add your Gemini key to .env.local to analyze your own photos.</p>
      )}
      <div className="bigname" aria-live="polite">{item.name}</div>
      <div className="bighx soft">{item.hex}</div>
      <div className="bar" style={{ background: item.hex }} />

      <div className="grid">
        <Drape photoUrl={photo.url} box={result.face_box} items={items} index={index} setIndex={setIndex} />

        <div className="readout glass">
          <h2>You're {result.family === 'Autumn' ? 'an' : 'a'} {result.family}</h2>
          <p className="traits soft">{result.undertone} undertone · {result.depth} depth · {result.confidence} confidence</p>
          <p className="lede">{result.summary}</p>

          <ul className="picks">
            {result.best.map((c, i) => (
              <li key={c.hex}>
                <button onClick={() => setIndex(i)} aria-pressed={index === i}>
                  <span className="dot" style={{ background: c.hex }} />
                  <span>
                    <strong>{c.name}</strong>
                    <em className="hx">{c.hex}</em>
                    <small>{c.reason}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="skin">
            <span className="dot" style={{ background: result.skin_hex }} />
            <span>Skin tone we read: <strong>{result.skin_hex}</strong></span>
          </div>
          {result.photo_notes && <p className="fine soft">{result.photo_notes}</p>}

          <div className="actions">
            <button className="pill solid" onClick={copy}>{copied ? 'Copied' : 'Copy my colors'}</button>
            {restart && <button className="pill" onClick={restart}>Start over</button>}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Tool({ photos, addFile, clear, openCamera, phase, error, onSubmit, result, restart }) {
  return (
    <section className="tool" id="try">
      <div className="tool-head"><h2>{phase === 'result' ? 'Your drape' : 'Find your colors'}</h2></div>

      {phase === 'capture' && (
        <>
          <Capture photos={photos} addFile={addFile} clear={clear} openCamera={openCamera} onSubmit={onSubmit} error={error} />
          <div className="tool-head sampled"><h2>Your drape</h2></div>
          <SampleDrape />
        </>
      )}

      {phase === 'analyzing' && (
        <div className="analyzing glass" aria-live="polite">
          <div className="spin" aria-hidden="true" />
          <h3>Reading your skin tone…</h3>
          <p className="soft">Comparing your photos and correcting for the light in each one. This takes a few seconds.</p>
        </div>
      )}

      {phase === 'result' && result && <Result result={result} photo={photos.front} restart={restart} />}
    </section>
  )
}
