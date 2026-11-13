'use client'

import { useEffect, useRef, useState } from 'react'
import { STAGE_INFO, computePose, evaluate, faceBrightness, loadFaceMesh, mapper, targetNoseX } from '@/lib/pose'

const HOLD_MS = 700 // pose must stay good this long before the countdown starts
const COUNT_MS = 3000 // 3, 2, 1
const GRACE_MS = 450 // how long the pose may slip during the countdown before it restarts
const W = 300
const H = 400

export default function GuidedCamera({ stages = ['front', 'left', 'right'], onDone, onClose }) {
  const videoRef = useRef(null)
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const [err, setErr] = useState('')
  const [idx, setIdx] = useState(0)
  const [ui, setUi] = useState({ msg: 'Starting camera…', ok: false, count: 0, phase: 'loading', turn: '' })
  const [flash, setFlash] = useState(false)
  const [voice, setVoice] = useState(false)
  const [urls, setUrls] = useState({}) // preview URLs of the photos taken so far, by stage id
  const act = useRef({})
  const run = useRef({ idx: 0, phase: 'loading', okSince: 0, badSince: 0, countStart: 0, shots: {}, voice: false, spoke: '', spokeAt: 0, frame: 0, light: null, stop: false })

  useEffect(() => {
    run.current.voice = voice
    if (!voice) window.speechSynthesis?.cancel()
  }, [voice])

  useEffect(() => {
    const r = run.current
    let stream
    let dead = false // per-mount flag: React dev mode mounts, unmounts and remounts this effect
    r.phase = 'loading'
    r.shots = {}
    const push = (n) => setUi((c) => (c.msg === n.msg && c.ok === n.ok && c.count === n.count && c.phase === n.phase && c.turn === n.turn ? c : n))
    const say = (text) => {
      if (!r.voice || !window.speechSynthesis) return
      const now = performance.now()
      if (text === r.spoke && now - r.spokeAt < 4000) return
      if (now - r.spokeAt < 1200) return
      r.spoke = text
      r.spokeAt = now
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
    }

    function startStage(i) {
      r.idx = i
      r.phase = 'align'
      r.okSince = 0
      r.badSince = 0
      setIdx(i)
      const next = STAGE_INFO[stages[i]]
      push({ msg: next.say, ok: false, count: 0, phase: 'align', turn: stages[i] })
      say(next.say)
    }

    // A photo was taken: show it so the person can keep it or retake it.
    function finishStage(id, blob) {
      r.shots[id] = blob
      setUrls((u) => {
        if (u[id]) URL.revokeObjectURL(u[id])
        return { ...u, [id]: URL.createObjectURL(blob) }
      })
      r.phase = 'review'
      push({ msg: `${STAGE_INFO[id].title} photo taken`, ok: true, count: 0, phase: 'review', turn: '' })
      say(`${STAGE_INFO[id].title} photo taken`)
    }

    act.current = {
      retake: (i) => startStage(i),
      keep: () => {
        if (r.idx + 1 >= stages.length) {
          r.phase = 'summary'
          push({ msg: 'All photos taken', ok: true, count: 0, phase: 'summary', turn: '' })
        } else startStage(r.idx + 1)
      },
      submit: () => {
        dead = true
        onDone(r.shots)
      },
    }

    function capture(id) {
      const v = videoRef.current
      const c = document.createElement('canvas')
      c.width = v.videoWidth
      c.height = v.videoHeight
      c.getContext('2d').drawImage(v, 0, 0)
      r.phase = 'saving'
      setFlash(true)
      setTimeout(() => setFlash(false), 220)
      c.toBlob((blob) => blob && finishStage(id, blob), 'image/jpeg', 0.92)
    }

    function onResults(res) {
      if (dead || r.phase === 'review' || r.phase === 'summary' || r.phase === 'saving' || r.phase === 'loading') return
      const v = videoRef.current
      const id = stages[r.idx]
      const lm = res.multiFaceLandmarks && res.multiFaceLandmarks[0]
      const map = mapper(v.videoWidth, v.videoHeight)
      const pose = lm ? computePose(lm, map) : null
      if (pose && r.frame++ % 6 === 0) r.light = faceBrightness(v, pose, map)

      if (pose && dotRef.current && ringRef.current) {
        dotRef.current.setAttribute('cx', (pose.noseX * W).toFixed(1))
        dotRef.current.setAttribute('cy', (pose.noseY * H).toFixed(1))
        ringRef.current.setAttribute('cx', (targetNoseX(id, pose) * W).toFixed(1))
        ringRef.current.setAttribute('cy', (pose.noseY * H).toFixed(1))
      }

      const ev = evaluate(id, pose, r.light)
      const now = performance.now()
      if (r.phase === 'align') {
        if (ev.ok) {
          if (!r.okSince) r.okSince = now
          if (now - r.okSince >= HOLD_MS) {
            r.phase = 'count'
            r.countStart = now
            r.badSince = 0
            push({ msg: 'Hold still', ok: true, count: 3, phase: 'count', turn: '' })
            say('Hold still. 3')
          } else push({ msg: 'Hold still', ok: true, count: 0, phase: 'align', turn: '' })
        } else {
          r.okSince = 0
          push({ msg: ev.msg, ok: false, count: 0, phase: 'align', turn: ev.turn || '' })
          say(ev.msg)
        }
      } else if (r.phase === 'count') {
        if (!ev.ok) {
          if (!r.badSince) r.badSince = now
          if (now - r.badSince > GRACE_MS) {
            r.phase = 'align'
            r.okSince = 0
            push({ msg: ev.msg, ok: false, count: 0, phase: 'align', turn: ev.turn || '' })
            return
          }
        } else r.badSince = 0
        const elapsed = now - r.countStart
        if (elapsed >= COUNT_MS) capture(id)
        else push({ msg: 'Hold still', ok: true, count: 3 - Math.floor(elapsed / 1000), phase: 'count', turn: '' })
      }
    }

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        })
      } catch {
        if (!dead) setErr('camera')
        return
      }
      if (dead) return stream.getTracks().forEach((t) => t.stop())
      const v = videoRef.current
      v.srcObject = stream
      try {
        await v.play()
      } catch {}
      let fm
      try {
        fm = await loadFaceMesh()
      } catch {
        if (!dead) setErr('model')
        return
      }
      fm.onResults(onResults)
      r.phase = 'align'
      const first = STAGE_INFO[stages[0]]
      push({ msg: first.say, ok: false, count: 0, phase: 'align', turn: stages[0] })
      say(first.say)
      while (!dead) {
        try {
          await fm.send({ image: v })
        } catch {
          break
        }
        await new Promise((res) => setTimeout(res, 30))
      }
    })()

    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      dead = true
      window.removeEventListener('keydown', onKey)
      window.speechSynthesis?.cancel()
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const id = stages[idx]
  const info = STAGE_INFO[id]
  const side = id === 'front' ? 0 : id === 'left' ? -1 : 1 // screen direction the nose should move
  const live = ui.phase === 'align' || ui.phase === 'count'

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Guided photo capture">
      <div className="gcam">
        <div className="gtop">
          <ol className="gsteps" aria-label="Progress">
            {stages.map((s, i) => (
              <li key={s} className={urls[s] && !(ui.phase === 'align' || ui.phase === 'count') ? 'done' : urls[s] && i !== idx ? 'done' : i === idx ? 'now' : ''}>
                {STAGE_INFO[s].title}
              </li>
            ))}
          </ol>
          <div className="gtools">
            <button className="gbtn" onClick={() => setVoice((v) => !v)} aria-pressed={voice}>
              Voice {voice ? 'on' : 'off'}
            </button>
            <button className="gbtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {err ? (
          <div className="gerr">
            <h3>{err === 'camera' ? "Can't use your camera" : "Couldn't load the face model"}</h3>
            <p>
              {err === 'camera'
                ? 'Allow camera access in your browser, or close this and upload photos instead.'
                : 'Run npm install so the face model files are copied into public/mediapipe, then reload.'}
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
          <div className={`gframe ${ui.ok && live ? 'good' : ''}`} hidden={ui.phase === 'summary'}>
            <video ref={videoRef} playsInline muted />
            <svg className="ghost" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              <ellipse className="ghost-oval" cx="150" cy="184" rx="81" ry="108" />
              <line className="ghost-axis" x1="150" y1="104" x2="150" y2="264" />
              {side !== 0 && !ui.ok && live && (
                <g className="chev" transform={`translate(${150 + side * 118} 200)`}>
                  {[0, 1, 2].map((i) => (
                    <polyline key={i} points={side < 0 ? `${-6 - i * 12},-12 ${-18 - i * 12},0 ${-6 - i * 12},12` : `${6 + i * 12},-12 ${18 + i * 12},0 ${6 + i * 12},12`} style={{ animationDelay: `${i * 140}ms` }} />
                  ))}
                </g>
              )}
              <circle ref={ringRef} className="ghost-ring" cx="150" cy="200" r="13" />
              <circle ref={dotRef} className="ghost-dot" cx="150" cy="200" r="5" />
            </svg>

            {ui.phase === 'review' && urls[id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="greview" src={urls[id]} alt={`Your ${info.title.toLowerCase()} photo`} />
            )}
            <div className="gtitle">{info.title}</div>
            {ui.count > 0 && (
              <div className="count" key={ui.count} aria-live="assertive">
                {ui.count}
              </div>
            )}
            {flash && <div className="flash" />}
            <div className="gmsg" aria-live="polite">
              <p className="gmain">{ui.msg}</p>
              {ui.phase === 'align' && !ui.ok && <p className="gsub">Line up the white dot with the ring, then hold still.</p>}
              {ui.phase === 'loading' && <p className="gsub">Allow camera access if your browser asks.</p>}
              {ui.phase === 'review' && <p className="gsub">Is this one okay? You can retake it as many times as you like.</p>}
            </div>
          </div>

          {ui.phase === 'review' && (
            <div className="gactions">
              <button className="gbtn big" onClick={() => act.current.retake(idx)}>Retake</button>
              <button className="gbtn big solid" onClick={() => act.current.keep()}>
                {idx + 1 >= stages.length ? 'Looks good' : 'Looks good, next'}
              </button>
            </div>
          )}

          {ui.phase === 'summary' && (
            <div className="gsummary">
              <p className="gmain">Check your photos</p>
              <p className="gsub">Retake any angle until you're happy, then submit.</p>
              <div className="gthumbs">
                {stages.map((s, i) => (
                  <figure key={s}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls[s]} alt={`${STAGE_INFO[s].title} photo`} />
                    <figcaption>{STAGE_INFO[s].title}</figcaption>
                    <button className="gbtn" onClick={() => act.current.retake(i)}>Retake</button>
                  </figure>
                ))}
              </div>
              <button className="gbtn big solid wide" onClick={() => act.current.submit()}>Submit photos</button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
