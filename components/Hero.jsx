'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Sample readings shown with the two example faces. These are curated demo data, not live analysis.
const MODELS = [
  {
    src: '/models/male.jpg',
    alt: 'Portrait of a man with a beard and tied-back hair',
    season: 'Autumn',
    traits: 'Warm undertone · deep depth',
    best: [['Terracotta', '#B85C38'], ['Moss green', '#6B7A3A'], ['Mustard', '#D2A03C']],
    avoid: [['Icy blue', '#BFD9F2'], ['Stone gray', '#8E8E8A']],
  },
  {
    src: '/models/female.jpg',
    alt: 'Portrait of a woman with long curly hair',
    season: 'Winter',
    traits: 'Cool undertone · high contrast',
    best: [['Emerald', '#0F7A5C'], ['Royal blue', '#2748A8'], ['Raspberry', '#B0204F']],
    avoid: [['Beige', '#CDB79E'], ['Peach', '#F0B99B']],
  },
]

const SPARK = 'M12 1c.6 6.4 4.6 10.4 11 11-6.4.6-10.4 4.6-11 11-.6-6.4-4.6-10.4-11-11C7.4 11.4 11.4 7.4 12 1z'
const icon = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

const Chip = ({ c }) => (
  <span className="sc">
    <i style={{ background: c[1] }} />
    {c[0]}
  </span>
)

export default function Hero() {
  const [cur, setCur] = useState(0)
  const [shown, setShown] = useState(0) // the season card fades out, swaps, then fades back in
  const [swap, setSwap] = useState(false)
  const reduce = useRef(false)
  const timer = useRef(null)
  const n = MODELS.length

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (cur === shown) return
    setSwap(true)
    const t = setTimeout(() => {
      setShown(cur)
      setSwap(false)
    }, 380)
    return () => clearTimeout(t)
  }, [cur, shown])

  const stop = useCallback(() => {
    clearInterval(timer.current)
    timer.current = null
  }, [])
  const play = useCallback(() => {
    if (reduce.current || timer.current) return
    timer.current = setInterval(() => setCur((c) => (c + 1) % n), 5000)
  }, [n])

  useEffect(() => {
    play()
    return stop
  }, [play, stop])

  const m = MODELS[shown]

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">✦ AI-Powered Color Analysis</span>
        <h1>
          A new <em>hue</em>, a new you.
        </h1>
        <p className="lede">
          Discover your seasonal color palette with multi-angle analysis. Your best three colors, held right under your
          own face.
        </p>
        <div className="cta">
          <a className="pill solid" href="#try">Start free analysis →</a>
          <a className="pill" href="#live">Use live camera</a>
        </div>
        <div className="feats">
          <div className="feat">
            {icon(<><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>)}
            <span>3 guided<br />photos</span>
          </div>
          <div className="feat">
            {icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>)}
            <span>Seasonal<br />analysis</span>
          </div>
          <div className="feat">
            {icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />)}
            <span>Personalized<br />recommendations</span>
          </div>
        </div>
      </div>

      <div className="portrait" onMouseEnter={stop} onMouseLeave={play} onFocus={stop} onBlur={play}>
        <div className="pimg slider" aria-roledescription="carousel" aria-label="Example faces">
          <div className="track" style={{ transform: `translateX(${-100 * cur}%)` }}>
            {MODELS.map((x) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={x.src} src={x.src} alt={x.alt} />
            ))}
          </div>
          <div className="dots" role="group" aria-label="Choose a model">
            {MODELS.map((x, i) => (
              <button
                key={x.src}
                className="sdot"
                aria-label={`Show model ${i + 1}`}
                aria-pressed={i === cur}
                onClick={() => {
                  stop()
                  setCur(i)
                  play()
                }}
              />
            ))}
          </div>
        </div>
        <svg className="sparkle a" viewBox="0 0 24 24" aria-hidden="true"><path d={SPARK} fill="currentColor" /></svg>
        <svg className="sparkle b" viewBox="0 0 24 24" aria-hidden="true"><path d={SPARK} fill="currentColor" /></svg>

        <div className="season glass" aria-live="polite">
          <div className={`sbody ${swap ? 'swap' : ''}`}>
            <div className="shead">
              <small>Your season</small>
              <strong>{m.season}</strong>
              <span className="straits">{m.traits}</span>
            </div>
            <div className="sgroup">
              <b>Best three</b>
              <div className="sw">{m.best.map((c) => <Chip key={c[1]} c={c} />)}</div>
            </div>
            <div className="sgroup">
              <b>Avoid</b>
              <div className="sw avoid">{m.avoid.map((c) => <Chip key={c[1]} c={c} />)}</div>
            </div>
            <em>Sample reading</em>
          </div>
        </div>
      </div>
    </section>
  )
}
