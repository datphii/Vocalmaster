import { useState, useEffect } from 'react'

export const speak = t => {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(t)
  u.lang = 'en-US'
  u.rate = 0.78
  window.speechSynthesis.speak(u)
}

export const LS = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('vm_' + k)) ?? d } catch { return d } },
  set: (k, v) => { try { localStorage.setItem('vm_' + k, JSON.stringify(v)) } catch {} }
}

export const makeQuiz = (pool, n = 10) => {
  const s = [...pool].sort(() => Math.random() - .5).slice(0, Math.min(n, pool.length))
  return s.map(w => {
    const wr = pool.filter(o => (o.id || o.fid) !== (w.id || w.fid)).sort(() => Math.random() - .5).slice(0, 3)
    return { def: w.def, answer: w.word, options: [...wr.map(o => o.word), w.word].sort(() => Math.random() - .5) }
  })
}

export function useIsDesktop() {
  const [d, setD] = useState(window.innerWidth >= 768)
  useEffect(() => {
    const h = () => setD(window.innerWidth >= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return d
}
