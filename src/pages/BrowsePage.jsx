import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar/TopBar.jsx'
import DeckCard from '../components/DeckCard/DeckCard.jsx'
import { useIsDesktop } from '../utils/index.js'
import { categories } from '../data/vocab.js'

export default function BrowsePage({ state }) {
  const nav = useNavigate()
  const desk = useIsDesktop()

  return (
    <div style={{ maxWidth: desk ? 1000 : 600, margin: '0 auto', padding: desk ? '24px 32px' : '24px 16px' }}>
      {desk
        ? <TopBar user={state.user} isAdmin={state.isAdmin} login={state.login} logout={state.logout} title="Browse" subtitle="Explore vocabulary by category" />
        : <>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-dark)', marginBottom: 8 }}>Browse</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>Explore vocabulary by category</div>
          </>
      }
      <div style={{ display: 'grid', gridTemplateColumns: desk ? 'repeat(auto-fill,minmax(200px,1fr))' : '1fr 1fr', gap: 12 }}>
        {categories.filter(c => c.key !== 'all').map((c, i) => {
          const count = state.allWords.filter(w => w.cat === c.key).length
          const learnedCount = [...state.learned].filter(id => state.allWords.find(w => (w.id || w.fid) === id && w.cat === c.key)).length
          const icon = { general: '📋', tolerance: '📐', datum: '📍', symbol: '⊕', measurement: '📏', drawing: '✏️' }[c.key] || '🔧'
          return (
            <DeckCard key={c.key} variant={i % 2 === 0 ? 'ai' : 'manual'} icon={icon} title={c.label} description={`${count} words`} count={count} learned={learnedCount} onAction={() => nav(`/cards?cat=${c.key}`)} style={{ animationDelay: i * .05 + 's' }} />
          )
        })}
      </div>
    </div>
  )
}
