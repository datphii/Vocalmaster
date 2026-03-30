export default function TopBar({ user, isAdmin, login, logout, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '0 4px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-dark)' }}>{title || 'Dashboard'}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-full)', padding: '4px 14px 4px 4px' }}>
            {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{user.displayName?.split(' ')[0]}</div>
              {isAdmin && <div style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 700, letterSpacing: 1 }}>ADMIN</div>}
            </div>
          </div>
          <button onClick={logout} style={{ padding: '8px 14px', borderRadius: 'var(--r-full)', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Sign out</button>
        </> : <button onClick={login} style={{ padding: '8px 18px', borderRadius: 'var(--r-full)', border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-primary)' }}>Sign in with Google</button>}
      </div>
    </div>
  )
}
