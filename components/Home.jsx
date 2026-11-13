'use client'

import { useCallback, useState } from 'react'
import { analyze } from '@/lib/api'
import { prepareImage } from '@/lib/image'
import GuidedCamera from './GuidedCamera'
import Hero from './Hero'
import HowItWorks, { Marquee } from './HowItWorks'
import Tool from './Tool'
import Live from './Live'

const EMPTY = { front: null, left: null, right: null }

export default function Home() {
  const [photos, setPhotos] = useState(EMPTY)
  const [phase, setPhase] = useState('capture') // capture | analyzing | result
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [cam, setCam] = useState(null) // list of stages while the guided camera is open

  const addFile = useCallback(async (id, file) => {
    const p = await prepareImage(file)
    setPhotos((cur) => ({ ...cur, [id]: p }))
  }, [])
  const clear = (id) => setPhotos((cur) => ({ ...cur, [id]: null }))

  async function analyzePhotos(p) {
    setError('')
    setPhase('analyzing')
    document.getElementById('try')?.scrollIntoView({ behavior: 'smooth' })
    try {
      const data = await analyze({ front: p.front.blob, left: p.left?.blob, right: p.right?.blob })
      setResult(data)
      setPhase('result')
    } catch (e) {
      setError(e.message)
      setPhase('capture')
    }
  }

  // "Submit photos" in the guided camera: keep the photos and send them for analysis.
  async function guidedDone(shots) {
    setCam(null)
    const next = { ...photos }
    for (const [id, blob] of Object.entries(shots)) {
      try {
        next[id] = await prepareImage(blob)
      } catch {}
    }
    setPhotos(next)
    if (next.front) analyzePhotos(next)
    else {
      setError('Add a front photo first.')
      document.getElementById('try')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const run = () => analyzePhotos(photos)

  function restart() {
    setPhotos(EMPTY)
    setResult(null)
    setError('')
    setPhase('capture')
  }

  return (
    <>
      <div className="orbs" aria-hidden="true">
        <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      </div>
      <div className="wrap">
        <header className="nav glass">
          <span className="mark">nhue</span>
          <a className="pill solid" href="#try">Try it now</a>
        </header>

        <Hero />
        <Marquee />
        <HowItWorks />
        <Tool
          photos={photos}
          addFile={addFile}
          clear={clear}
          openCamera={setCam}
          phase={phase}
          error={error}
          onSubmit={run}
          result={result}
          restart={restart}
        />
        <Live photos={photos} openCamera={setCam} addFile={addFile} />

        <footer className="foot">
          <span className="mark" style={{ fontSize: 22 }}>nhue</span>
          <span className="soft">Color analysis is guidance, not a verdict. Trust what makes you feel good. Photos are sent to Google's Gemini API for analysis and are not stored by nhue.</span>
        </footer>
      </div>

      {cam && <GuidedCamera stages={cam} onDone={guidedDone} onClose={() => setCam(null)} />}
    </>
  )
}
