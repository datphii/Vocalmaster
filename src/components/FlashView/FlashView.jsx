import { useState, useEffect } from 'react'
import Button from '../Button/Button.jsx'
import { speak } from '../../utils/index.js'

export default function FlashView({ words, desk }) {
  const [i, setI] = useState(0)
  const [f, setF] = useState(false)
  useEffect(() => setF(false), [i])

  const w = words[i]
  if (!w) return <div style={{ textAlign: 'center', padding: 40 }}>No words</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0', maxWidth: desk ? 560 : '100%', margin: '0 auto' }}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Card {i + 1} of {words.length}</div>
      <div onClick={() => setF(!f)} style={{ width: '100%', maxWidth: 520, minHeight: 300, cursor: 'pointer', perspective: 1000 }}>
        <div style={{ width: '100%', minHeight: 300, transition: 'transform .6s', transformStyle: 'preserve-3d', position: 'relative', transform: f ? 'rotateY(180deg)' : 'none' }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'linear-gradient(135deg, var(--primary), #7c3aed)', borderRadius: 20, padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 300, boxShadow: 'var(--shadow-primary)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Tap to reveal →</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'white', marginBottom: 8 }}>{w.word}</div>
            <span style={{ background: 'rgba(255,255,255,.15)', color: 'white', fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600, alignSelf: 'flex-start', marginBottom: 10 }}>{w.cat}</span>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', fontFamily: 'monospace' }}>{w.phonetic}</div>
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'var(--surface)', borderRadius: 20, padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 300, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Definition</div>
            <div style={{ fontSize: 17, color: 'var(--text)', lineHeight: 1.8, marginBottom: 16 }}>{w.def}</div>
            {w.ex && <div style={{ fontSize: 13, color: 'var(--orange)', fontStyle: 'italic', paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>💡 {w.ex}</div>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="outline" onClick={() => setI((i - 1 + words.length) % words.length)}>← Prev</Button>
        <Button variant="blue" onClick={() => setF(!f)}>Flip</Button>
        <Button variant="outline" onClick={() => speak(w.word)}>🔊</Button>
        <Button variant="outline" onClick={() => setI((i + 1) % words.length)}>Next →</Button>
      </div>
    </div>
  )
}
