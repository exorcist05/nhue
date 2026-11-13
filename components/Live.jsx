'use client'

import { useEffect, useRef, useState } from 'react'

const X = (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const STEPS = [
  { id: 'front', label: 'Front' },
  { id: 'left', label: 'Left side' },
  { id: 'right', label: 'Right side' },
]

export default function Live({ photos, openCamera, addFile }) {
  const [guideOpen, setGuideOpen] = useState(true)
  const phone = useRef(null)

  // Remember whether the visitor closed the instructions. Storage can be blocked, so it is optional.
  useEffect(() => {
    try {
      if (localStorage.getItem('nhue-guide') === 'closed') setGuideOpen(false)
    } catch {}
  }, [])
  const setGuide = (open) => {
    setGuideOpen(open)
    try {
      localStorage.setItem('nhue-guide', open ? 'open' : 'closed')
    } catch {}
  }

  return (
    <section className="live" id="live">
      <div className="lpanel glass">
        <div className="lframe">
          <svg className="lghost" viewBox="0 0 300 400" aria-hidden="true">
            <ellipse cx="150" cy="184" rx="81" ry="108" />
            <line x1="150" y1="104" x2="150" y2="264" />
          </svg>
          <div className="lmsg">Camera is off</div>
        </div>

        <div className="linfo">
          <h2>Live camera</h2>
          <p className="lede soft">
            Line up with the outline. You get an instruction, a 3, 2, 1 count, then the photo. Front first, then left,
            then right.
          </p>

          {guideOpen ? (
            <div className="guide glass">
              <button className="xbtn" onClick={() => setGuide(false)} aria-label="Close instructions">{X}</button>
              <h3>Before you start</h3>
              <ul>
                <li>Allow camera access when your browser asks.</li>
                <li>Face a window or lamp so your face is evenly lit. No filters, hair off your forehead.</li>
                <li>Keep your face inside the dashed outline, about an arm's length from the screen.</li>
                <li>Front first. Then turn your head about 30° to your left, then to your right.</li>
                <li>Hold still when the count starts: 3, 2, 1. The photo is taken for you.</li>
                <li>If the camera is blocked, tap Take a photo on your phone, or upload one.</li>
              </ul>
            </div>
          ) : (
            <button className="linkbtn" onClick={() => setGuide(true)}>Show instructions</button>
          )}

          <div className="vidcard glass">
            <video controls playsInline preload="metadata" src="/video/how-it-works.mp4" aria-label="How the live camera works, 36 second video with sound" />
            <small className="soft">Watch how it works · 0:36 · sound on</small>
          </div>

          <ol className="lsteps">
            {STEPS.map((s) => (
              <li key={s.id} className={photos[s.id] ? 'now' : ''}>
                {photos[s.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[s.id].url} alt={`${s.label} photo`} />
                ) : (
                  <div className="ph" />
                )}
                {s.label}
              </li>
            ))}
          </ol>

          <div className="actions">
            <button className="pill solid" onClick={() => openCamera(['front', 'left', 'right'])}>Start live camera</button>
            <button className="pill" onClick={() => phone.current.click()}>Take a photo</button>
          </div>
          <input
            ref={phone}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) addFile('front', f).catch(() => {})
              e.target.value = ''
            }}
          />
          <p className="fine2 soft">Your head angle is checked live in the browser. Nothing is uploaded until you press Find my colors.</p>
        </div>
      </div>
    </section>
  )
}
