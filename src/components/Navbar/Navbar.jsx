import { useNavigate, useLocation } from 'react-router-dom'
import s from './Navbar.module.css'

export default function Navbar({ onToggleTheme, isAdmin }) {
  const nav = useNavigate()
  const loc = useLocation()

  const tabs = [
    { path: '/', icon: '📚', label: 'Decks' },
    { path: '/cards', icon: '🃏', label: 'Cards' },
    { path: '/create', icon: '+', label: '', center: true },
    { path: '/browse', icon: '🔍', label: 'Browse' },
    ...(isAdmin
      ? [{ path: '/admin', icon: '🛡️', label: 'Admin' }]
      : [{ path: '/analytics', icon: '📊', label: 'Stats' }]
    ),
  ]

  return (
    <nav className={s.navbar}>
      <div className={s.logo} onClick={() => nav('/')}>V</div>
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
      <div className={s.spacer} />
      <button className={s.settingsBtn} onClick={onToggleTheme}>⚙️</button>
    </nav>
  )
}
