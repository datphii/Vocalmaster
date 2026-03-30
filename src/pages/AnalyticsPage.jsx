import TopBar from '../components/TopBar/TopBar.jsx'
import { useIsDesktop } from '../utils/index.js'
import { categories } from '../data/vocab.js'

export default function AnalyticsPage({ state }) {
  const desk = useIsDesktop()
  const { allWords, learned } = state
  const pct = allWords.length > 0 ? Math.round(learned.size / allWords.length * 100) : 0
  const catStats = categories.filter(c => c.key !== 'all').map(c => {
    const total = allWords.filter(w => w.cat === c.key).length
    const done = [...learned].filter(id => allWords.find(w => (w.id || w.fid) === id && w.cat === c.key)).length
    return { ...c, total, done, pct: total > 0 ? Math.round(done / total * 100) : 0 }
  })

  return (
    <div style={{ maxWidth: desk ? 1000 : 600, margin: '0 auto', padding: desk ? '24px 32px' : '24px 16px' }}>
      {desk
        ? <TopBar user={state.user} isAdmin={state.isAdmin} login={state.login} logout={state.logout} title="Analytics" subtitle="Track your learning progress" />
        : <div style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', borderRadius: 20, padding: '28px 24px', marginBottom: 20, color: 'white' }}>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Your <span style={{ color: '#fbbf24' }}>Stats</span></div>
            <div style={{ fontSize: 13, opacity: .6 }}>Track your learning progress</div>
          </div>
      }

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { n: pct + '%', l: 'Retention', icon: '🎯', c: 'var(--primary)' },
          { n: learned.size, l: 'Learned', icon: '✅', c: 'var(--green)' },
          { n: allWords.length - learned.size, l: 'Remaining', icon: '📚', c: 'var(--orange)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 16, padding: '18px 14px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', animation: `fadeIn .3s ease ${i * .08}s both` }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--text-dark)' }}>By category</div>
      <div style={{ display: desk ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {catStats.map((c, i) => (
          <div key={c.key} style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 16px', marginBottom: desk ? 0 : 8, boxShadow: 'var(--shadow-sm)', animation: `fadeIn .3s ease ${i * .05}s both` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ background: c.color + '18', color: c.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{c.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.done}/{c.total}</span>
            </div>
            <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: c.color, width: c.pct + '%', transition: 'width .5s', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
