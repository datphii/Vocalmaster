import { useNavigate, useLocation } from 'react-router-dom'
import s from './Navbar.module.css'

const tabs = [
  { path: '/', icon: '📚', label: 'Decks' },
  { path: '/cards', icon: '🃏', label: 'Cards' },
  { path: '/create', icon: '+', label: '', center: true },
  { path: '/browse', icon: '🔍', label: 'Browse' },
  { path: '/analytics', icon: '📊', label: 'Stats' },
]

export default function Navbar() {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <nav className={s.navbar}>
      {tabs.map(t => t.center ? (
        <button key={t.path} className={s.centerBtn} onClick={() => nav(t.path)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      ) : (
        <button key={t.path} className={`${s.tab} ${loc.pathname === t.path ? s.active : ''}`} onClick={() => nav(t.path)}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span className={s.tabLabel}>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
