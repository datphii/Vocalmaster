import { useState } from 'react'
import Button from '../Button/Button.jsx'
import { makeQuiz } from '../../utils/index.js'
import { defaultVocab } from '../../data/vocab.js'

export default function QuizView({ words, onFinish, desk }) {
  const [qs] = useState(() => makeQuiz(words.length >= 4 ? words : defaultVocab))
  const [c, setC] = useState(0)
  const [s, setS] = useState(null)
  const [sc, setSc] = useState(0)
  const [done, setDone] = useState(false)

  if (done) {
    const p = sc / qs.length
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: 20 }}>
        <div style={{ background: `linear-gradient(135deg,${p >= .8 ? 'var(--green)' : p >= .5 ? 'var(--orange)' : 'var(--accent)'},${p >= .8 ? '#059669' : '#d97706'})`, borderRadius: 20, padding: 40, textAlign: 'center', color: 'white', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{p >= .8 ? '🏆' : p >= .5 ? '👍' : '📖'}</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{sc}/{qs.length}</div>
          <div style={{ fontSize: 16, opacity: .8, marginBottom: 20 }}>{Math.round(p * 100)}%</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Button variant="outline" onClick={onFinish} style={{ borderColor: 'rgba(255,255,255,.3)', color: 'white' }}>← Back</Button>
            <Button variant="outline" onClick={() => { setC(0); setS(null); setSc(0); setDone(false) }} style={{ borderColor: 'rgba(255,255,255,.3)', color: 'white', background: 'rgba(255,255,255,.15)' }}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  const q = qs[c]
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 16 }}>Q {c + 1}/{qs.length}</div>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '24px 20px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Which word?</div>
        <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7 }}>{q.def}</div>
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: desk ? '1fr 1fr' : '1fr' }}>
        {q.options.map((o, i) => {
          const pk = s === o, co = o === q.answer, sh = s !== null
          let bg = 'var(--surface)', bc = 'var(--border)'
          if (sh && co) { bg = 'var(--green-light)'; bc = 'var(--green)' }
          else if (sh && pk && !co) { bg = 'var(--pink-light)'; bc = 'var(--accent)' }
          return (
            <button key={i} disabled={sh} onClick={() => {
              setS(o)
              const ok = o === q.answer
              if (ok) setSc(x => x + 1)
              setTimeout(() => {
                if (c < qs.length - 1) { setC(x => x + 1); setS(null) }
                else setDone(true)
              }, 1000)
            }} style={{ padding: '14px 18px', borderRadius: 14, border: `1.5px solid ${bc}`, background: bg, fontSize: 14, fontWeight: 700, cursor: sh ? 'default' : 'pointer', textAlign: 'left', color: 'var(--text)', transition: 'all .2s' }}>
              {o}{sh && co && ' ✓'}{sh && pk && !co && ' ✗'}
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: 14, height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', width: `${((c + 1) / qs.length) * 100}%`, transition: 'width .3s', borderRadius: 3 }} />
      </div>
    </div>
  )
}
