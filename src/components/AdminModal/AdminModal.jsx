import { useState } from 'react'
import Button from '../Button/Button.jsx'
import { categories } from '../../data/vocab.js'
import { LS } from '../../utils/index.js'
import { aiGenerate } from '../../utils/aiGenerate.js'

export default function AdminModal({ onClose, onSave, editWord, groups, setGroups }) {
  const [form, setForm] = useState(editWord || { word: '', phonetic: '', cat: 'general', group: 'GD&T Basics', def: '', ex: '', sentence: '' })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState('word')
  const [newGroup, setNewGroup] = useState('')

  const inp = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'inherit' }
  const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' }

  const handleAI = async () => {
    if (!form.word.trim()) return alert('Please enter a word first!')
    setGenerating(true)
    try {
      const result = await aiGenerate(form.word.trim(), form.cat)
      setForm(prev => ({
        ...prev,
        phonetic: result.phonetic || prev.phonetic,
        def: result.def || prev.def,
        ex: result.ex || prev.ex,
        sentence: result.sentence || prev.sentence,
      }))
    } catch (e) {
      alert('AI generation failed: ' + e.message + '\n\nPlease check:\n1. OpenAI API key is valid\n2. Try again in a few seconds\n\nYou can also fill fields manually.')
    }
    setGenerating(false)
  }

  const addGroup = () => {
    if (!newGroup.trim()) return
    const updated = [...new Set([...groups, newGroup.trim()])]
    LS.set('groups', updated)
    setGroups(updated)
    setNewGroup('')
  }

  const removeGroup = (g) => {
    const updated = groups.filter(x => x !== g)
    LS.set('groups', updated)
    setGroups(updated)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,.15)', animation: 'scaleIn .2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', padding: '20px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{editWord ? '✏️ Edit' : '➕ New Word'}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)' }}>
          {['word', 'groups'].map(t => <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 12, border: 'none', background: tab === t ? 'var(--primary-light)' : 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t === 'word' ? '📝 Word' : '📁 Groups'}</button>)}
        </div>
        <div style={{ padding: 20 }}>
          {tab === 'word' ? <>
            <label style={lbl}>Word *</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} placeholder="e.g. Tolerance" style={{ ...inp, flex: 1, marginBottom: 0 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAI() } }} />
              <button onClick={handleAI} disabled={generating || !form.word.trim()} style={{
                padding: '10px 16px', borderRadius: 'var(--r-md)', border: 'none',
                background: generating ? 'var(--border-light)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: 'white', fontWeight: 700, fontSize: 12, cursor: generating ? 'wait' : 'pointer',
                boxShadow: generating ? 'none' : '0 4px 14px rgba(245,158,11,.3)',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .2s', opacity: !form.word.trim() ? .5 : 1,
              }}>
                {generating ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⏳</span> Generating...</> : <>✨ AI Fill</>}
              </button>
            </div>

            {!editWord && <div style={{ background: 'var(--orange-light)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--orange)', lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <span>Type a word and click <strong>✨ AI Fill</strong> — GPT-4o-mini will auto-generate IPA, definition, example, and sentence. You can edit any field after.</span>
            </div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><label style={lbl}>IPA Phonetic</label><input value={form.phonetic} onChange={e => setForm({ ...form, phonetic: e.target.value })} placeholder="/ˈtɒl.ər.əns/" style={inp} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>Category</label><select value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>{categories.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            </div>
            <label style={lbl}>Group</label>
            <select value={form.group || ''} onChange={e => setForm({ ...form, group: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <label style={lbl}>Definition *</label>
            <textarea value={form.def} onChange={e => setForm({ ...form, def: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Clear English definition..." />
            <label style={lbl}>Example</label>
            <textarea value={form.ex || ''} onChange={e => setForm({ ...form, ex: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Real-world engineering example..." />
            <label style={lbl}>Sentence</label>
            <textarea value={form.sentence || ''} onChange={e => setForm({ ...form, sentence: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Example sentence using the word..." />
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Button variant="outline" full onClick={onClose}>Cancel</Button>
              <Button variant="blue" full onClick={async () => {
                if (!form.word || !form.def) return alert('Word & Definition required!')
                setSaving(true)
                const ok = await onSave(form, editWord?.fid)
                setSaving(false)
                if (ok) onClose()
              }} disabled={saving}>{saving ? 'Saving...' : editWord ? 'Update' : 'Add Word'}</Button>
            </div>
          </> : <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={newGroup} onChange={e => setNewGroup(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} placeholder="New group..." style={{ ...inp, flex: 1, marginBottom: 0 }} />
              <Button variant="primary" size="sm" onClick={addGroup}>+ Add</Button>
            </div>
            {groups.map((g, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border-light)', gap: 10 }}>
              <span>📁</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{g}</span>
              {g !== 'GD&T Basics' && <button onClick={() => removeGroup(g)} style={{ color: 'var(--accent)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
            </div>)}
          </>}
        </div>
      </div>
    </div>
  )
}
