import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Button from '../components/Button/Button.jsx'
import TopBar from '../components/TopBar/TopBar.jsx'
import AdminModal from '../components/AdminModal/AdminModal.jsx'
import FlashView from '../components/FlashView/FlashView.jsx'
import QuizView from '../components/QuizView/QuizView.jsx'
import TableView from '../components/TableView/TableView.jsx'
import { useIsDesktop, speak } from '../utils/index.js'
import { categories, catColor } from '../data/vocab.js'

export default function CardsPage({ state }) {
  const nav = useNavigate()
  const desk = useIsDesktop()
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const initMode = params.get('mode') || 'card'
  const { allWords, allGroups, learned, toggleLearned, delWord, user, login, logout, saveWord, groups, setGroups } = state
  const [mode, setMode] = useState(initMode)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState(params.get('cat') || 'all')
  const [groupF, setGroupF] = useState('all')
  const [showAdmin, setShowAdmin] = useState(false)
  const [editWord, setEditWord] = useState(null)

  const filtered = useMemo(() =>
    allWords.filter(v =>
      (cat === 'all' || v.cat === cat) &&
      (groupF === 'all' || v.group === groupF) &&
      (!search || v.word.toLowerCase().includes(search.toLowerCase()) || v.def.toLowerCase().includes(search.toLowerCase()))
    ), [cat, groupF, search, allWords])

  return (
    <div style={{ maxWidth: desk ? 1200 : 1000, margin: '0 auto', padding: desk ? '24px 32px' : '16px 16px 24px' }}>
      {desk
        ? <TopBar user={user} isAdmin={isAdmin} login={login} logout={logout}
            title="Vocabulary" subtitle={`${filtered.length} words · ${learned.size} learned`} />
        : <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => nav('/')} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--surface)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)' }}>Vocabulary</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{filtered.length} words · {learned.size} learned</div>
            </div>
            {user && <Button variant="primary" size="sm" onClick={() => { setEditWord(null); setShowAdmin(true) }}>➕ Add</Button>}
          </div>
      }

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-light)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words..." style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 14, padding: 4, boxShadow: 'var(--shadow-sm)' }}>
          {[{ k: 'card', l: '📇 Cards' }, { k: 'flash', l: '⚡ Flash' }, { k: 'quiz', l: '🧠 Quiz' }, { k: 'table', l: '📊 Table' }].map(m => (
            <button key={m.k} onClick={() => setMode(m.k)} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: mode === m.k ? 'var(--primary)' : 'transparent', color: mode === m.k ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}>{m.l}</button>
          ))}
        </div>
        {desk && user && <Button variant="primary" size="sm" onClick={() => { setEditWord(null); setShowAdmin(true) }}>➕ Add word</Button>}
      </div>

      {mode !== 'quiz' && <>
        {allGroups.length > 1 && <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setGroupF('all')} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${groupF === 'all' ? 'var(--primary)' : 'var(--border)'}`, background: groupF === 'all' ? 'var(--primary-light)' : 'transparent', color: groupF === 'all' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>All Groups</button>
          {allGroups.map(g => <button key={g} onClick={() => setGroupF(g)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${groupF === g ? 'var(--primary)' : 'var(--border)'}`, background: groupF === g ? 'var(--primary-light)' : 'transparent', color: groupF === g ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g}</button>)}
        </div>}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map(c => <button key={c.key} onClick={() => setCat(c.key)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${cat === c.key ? c.color : 'var(--border)'}`, background: cat === c.key ? c.color + '15' : 'transparent', color: cat === c.key ? c.color : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.label}</button>)}
        </div>
      </>}

      {mode === 'card' && (filtered.length === 0
        ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>No words found</div>
        : <div style={{ display: 'grid', gridTemplateColumns: desk ? 'repeat(auto-fill,minmax(280px,1fr))' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {filtered.map((v, i) => {
              const isL = learned.has(v.id || v.fid)
              return (
                <div key={v.fid || v.id} style={{ background: 'var(--surface)', borderRadius: 16, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', animation: `fadeIn .3s ease ${Math.min(i * .03, .3)}s both`, position: 'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: catColor(v.cat) + '18', color: catColor(v.cat), fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{v.cat}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 2 }}>{v.word}</div>
                  <div style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'monospace', marginBottom: 8 }}>{v.phonetic}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{v.def}</div>
                  {v.ex && <div style={{ background: 'var(--border-light)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>💡 {v.ex}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); speak(v.word) }} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔊</button>
                    <button onClick={e => { e.stopPropagation(); toggleLearned(v.id || v.fid) }} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: isL ? 'var(--green)' : 'var(--border-light)', color: isL ? 'white' : 'var(--text-light)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</button>
                    {v.fromFS && <>
                      <button onClick={e => { e.stopPropagation(); setEditWord(v); setShowAdmin(true) }} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) delWord(v.fid) }} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--pink-light)', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                    </>}
                  </div>
                </div>
              )
            })}
          </div>
      )}

      {mode === 'flash' && <FlashView words={filtered} desk={desk} />}
      {mode === 'quiz' && <QuizView words={filtered} onFinish={() => setMode('card')} desk={desk} />}
      {mode === 'table' && <TableView words={filtered} learned={learned} />}

      {showAdmin && <AdminModal
        onClose={() => { setShowAdmin(false); setEditWord(null) }}
        onSave={saveWord}
        editWord={editWord}
        groups={groups}
        setGroups={setGroups}
      />}
    </div>
  )
}
