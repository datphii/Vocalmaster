import { useState } from 'react'
import TopBar from '../components/TopBar/TopBar.jsx'
import AdminModal from '../components/AdminModal/AdminModal.jsx'
import DeckCard from '../components/DeckCard/DeckCard.jsx'
import { useIsDesktop } from '../utils/index.js'

export default function CreateDeckPage({ state }) {
  const desk = useIsDesktop()
  const [showAdmin, setShowAdmin] = useState(false)

  return (
    <div style={{ maxWidth: desk ? 900 : 600, margin: '0 auto', padding: desk ? '24px 32px' : '24px 16px' }}>
      {desk
        ? <TopBar user={state.user} isAdmin={state.isAdmin} login={state.login} logout={state.logout} title="Create a deck" subtitle="Choose how to build your vocabulary" />
        : <>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-dark)', marginBottom: 8 }}>Create a deck</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>Choose how you want to build your vocabulary</div>
          </>
      }
      <div style={{ display: desk ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DeckCard variant="ai" icon="✨" title="AI Generated" description="Let AI create flashcards from any topic or text you provide" buttonText="Generate with AI" onAction={() => alert('Coming soon!')} style={{ marginBottom: desk ? 0 : 16, animationDelay: '.05s' }} />
        <DeckCard variant="manual" icon="🎯" title="Create own cards" description="Manually add your own vocabulary words and definitions" buttonText="Start creating"
          onAction={() => {
            if (state.isAdmin) setShowAdmin(true)
            else if (!state.user) state.login()
            else alert('Only admin can add words')
          }}
          style={{ animationDelay: '.1s' }} />
      </div>
      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} onSave={state.saveWord} groups={state.groups} setGroups={state.setGroups} />}
    </div>
  )
}
