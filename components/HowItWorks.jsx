'use client'

import { useEffect, useRef } from 'react'

const MARQUEE = [
  ['Rust', '#B85C38'], ['Olive', '#6B7A3A'], ['Mustard', '#D2A03C'], ['Teal', '#1F7A7A'], ['Plum', '#6B3A6B'],
  ['Coral', '#E8735A'], ['Navy', '#1F2F5C'], ['Rose', '#D98A9A'], ['Sage', '#9CAF88'], ['Burgundy', '#7A2A3A'],
]

export function Marquee() {
  const row = [...MARQUEE, ...MARQUEE]
  return (
    <div className="marquee" aria-hidden="true">
      <div>
        {row.map(([name, hex], i) => (
          <span key={i}>
            <i style={{ background: hex }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

// Small illustrated head at three angles for the "Why three photos?" card.
function Illustration({ yaw }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    const w = cv.width, h = cv.height, x = cv.getContext('2d'), k = w / 600
    const s = Math.sin(yaw), co = Math.cos(yaw)
    const g = x.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#F7DED4'); g.addColorStop(1, '#E9BEB3')
    x.fillStyle = g; x.fillRect(0, 0, w, h)
    x.save(); x.scale(k, k)
    x.fillStyle = '#2a1a1c'; x.beginPath(); x.arc(392 - s * 40, 92, 58, 0, 7); x.fill()
    x.beginPath(); x.ellipse(300 - s * 22, 300, (0.8 + 0.2 * co) * 168, 208, 0, 0, 7); x.fill()
    x.fillStyle = '#a97352'; x.fillRect(240 + s * 10, 410, 120, 170)
    x.fillStyle = '#7A1E2E'; x.beginPath(); x.ellipse(300 + s * 10, 730, 340, 190, 0, 0, 7); x.fill()
    x.fillStyle = '#a97352'; x.beginPath(); x.ellipse(300 + s * 10, 548, 70, 46, 0, 0, Math.PI); x.fill()
    x.fillStyle = '#b98563'; x.beginPath(); x.ellipse(300 + s * 14, 300, (0.5 + 0.5 * co) * 128, 166, 0, 0, 7); x.fill()
    x.fillStyle = '#2a1a1c'; x.beginPath(); x.ellipse(300 + s * 14, 178, (0.55 + 0.45 * co) * 136, 74, 0, Math.PI, 0); x.fill()
    const ex = (v) => 300 + s * 98 + v * co
    x.fillStyle = '#2a1c18'
    ;[-45, 45].forEach((v) => { x.beginPath(); x.ellipse(ex(v), 292, 12 * (0.6 + 0.4 * co), 7.5, 0, 0, 7); x.fill() })
    x.strokeStyle = '#2a1a1c'; x.lineWidth = 6; x.lineCap = 'round'
    ;[-1, 1].forEach((m) => { x.beginPath(); x.moveTo(ex(m * 72), 266); x.lineTo(ex(m * 20), 262 + m * 2); x.stroke() })
    x.strokeStyle = '#a06f50'; x.lineWidth = 4.5; x.beginPath()
    x.moveTo(300 + s * 100, 298); x.lineTo(300 + s * 148, 344); x.lineTo(300 + s * 106 + 6, 348); x.stroke()
    x.strokeStyle = '#A8445A'; x.lineWidth = 8; x.beginPath()
    x.moveTo(ex(-38) + s * 8, 392); x.quadraticCurveTo(ex(0) + s * 10, 414, ex(38) + s * 8, 392); x.stroke()
    x.restore()
  }, [yaw])
  return <canvas ref={ref} width="240" height="280" role="img" aria-label="Illustrated head" />
}

const ico = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

export default function HowItWorks() {
  return (
    <section className="how2" id="how">
      <div className="how2-head">
        <h2>How it <em>works</em></h2>
        <p>Three simple steps. A world of colors.</p>
      </div>
      <div className="steps">
        <div className="step glass">
          <span className="num">1</span>
          <div className="ic">{ico(<><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>)}</div>
          <h3>Capture</h3>
          <p>Take front, left and right photos with live guidance, or upload them.</p>
        </div>
        <div className="step glass">
          <span className="num">2</span>
          <div className="ic">{ico(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></>)}</div>
          <h3>Analyze</h3>
          <p>Gemini reads your skin tone and undertone, with lamp and window color corrected.</p>
        </div>
        <div className="step glass">
          <span className="num">3</span>
          <div className="ic">
            {ico(<><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.2-1-1.4-1-2.4 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="15" cy="7.5" r="1" /></>)}
          </div>
          <h3>Discover</h3>
          <p>Your best three colors are held under your chin, with two to avoid.</p>
        </div>
        <aside className="why glass">
          <h3>Why three photos?</h3>
          <p>Side views show how light falls across your face, so the reading is steadier than from one shot.</p>
          <div className="thumbs">
            <figure><Illustration yaw={0} />Front</figure>
            <figure><Illustration yaw={0.55} />Left</figure>
            <figure><Illustration yaw={-0.55} />Right</figure>
          </div>
        </aside>
      </div>
    </section>
  )
}
