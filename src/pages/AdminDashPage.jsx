import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import TopBar from '../components/TopBar/TopBar.jsx'
import { useIsDesktop } from '../utils/index.js'

export default function AdminDashPage({ state }) {
  const desk = useIsDesktop()
  const { user, isAdmin, login, logout, loadAllUsers, toggleAdmin } = state
  const [userStats, setUserStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => { if (isAdmin) loadData() }, [isAdmin])

  const loadData = async () => {
    setLoading(true)
    try {
      const allU = await loadAllUsers()
      const stats = []
      for (const u of allU) {
        try {
          const wordsSnap = await getDocs(collection(db, 'users', u.uid, 'my_words')).catch(() => null)
          const progressSnap = await getDocs(collection(db, 'users', u.uid, 'progress')).catch(() => null)
          const activitySnap = await getDocs(collection(db, 'app_users', u.uid, 'activity')).catch(() => null)
          let wordCount = 0, learnedCount = 0, loginDays = []
          if (wordsSnap) wordCount = wordsSnap.size
          if (progressSnap) progressSnap.docs.forEach(d => { if (d.data().words) learnedCount = d.data().words.length })
          if (activitySnap) activitySnap.docs.forEach(d => { if (d.data().loginDays) loginDays = d.data().loginDays })
          stats.push({ ...u, wordCount, learnedCount, loginDays, totalLogins: loginDays.length })
        } catch {
          stats.push({ ...u, wordCount: 0, learnedCount: 0, loginDays: [], totalLogins: 0 })
        }
      }
      setUserStats(stats)
    } catch (e) { console.log('Admin load error:', e) }
    setLoading(false)
  }

  const totalUsers = userStats.length
  const totalCustomWords = userStats.reduce((s, u) => s + u.wordCount, 0)
  const totalLearned = userStats.reduce((s, u) => s + u.learnedCount, 0)
  const todayLogins = userStats.filter(u => u.loginDays?.includes(new Date().toISOString().split('T')[0])).length
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    return { date: ds, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], count: userStats.filter(u => u.loginDays?.includes(ds)).length }
  })
  const maxLogin = Math.max(...last7.map(d => d.count), 1)

  if (!isAdmin) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 8 }}>Admin only</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>This page is restricted to administrators.</div>
    </div>
  )

  return (
    <div style={{ maxWidth: desk ? 1200 : 600, margin: '0 auto', padding: desk ? '24px 32px' : '16px 16px 24px' }}>
      {desk
        ? <TopBar user={user} isAdmin={isAdmin} login={login} logout={logout} title="Admin Dashboard" subtitle={`${totalUsers} users · ${totalCustomWords} custom words`} />
        : <>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-dark)', marginBottom: 4 }}>Admin Dashboard</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{totalUsers} users · {totalCustomWords} custom words</div>
          </>
      }

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading...</div> : <>

        <div style={{ display: 'grid', gridTemplateColumns: desk ? '1fr 1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '👥', n: totalUsers, l: 'Total Users', c: 'var(--primary)', bg: 'var(--primary-light)' },
            { icon: '📝', n: totalCustomWords, l: 'Custom Words', c: 'var(--purple)', bg: 'var(--purple-light)' },
            { icon: '✅', n: totalLearned, l: 'Words Learned', c: 'var(--green)', bg: 'var(--green-light)' },
            { icon: '📅', n: todayLogins, l: 'Logins Today', c: 'var(--orange)', bg: 'var(--orange-light)' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 16, padding: '18px 16px', animation: `fadeIn .3s ease ${i * .08}s both` }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.c }}>{s.n}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 14, padding: 4, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          {[{ k: 'overview', l: '📊 Overview' }, { k: 'users', l: '👥 Users' }, { k: 'activity', l: '📅 Activity' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', background: tab === t.k ? 'var(--primary)' : 'transparent', color: tab === t.k ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all .2s' }}>{t.l}</button>
          ))}
        </div>

        {tab === 'overview' && <div style={{ display: desk ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: desk ? 0 : 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>Logins (last 7 days)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {last7.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{d.count}</span>
                  <div style={{ width: '100%', background: 'linear-gradient(180deg, var(--primary), var(--purple))', borderRadius: 6, height: `${Math.max((d.count / maxLogin) * 100, 4)}%`, minHeight: 4, opacity: d.count > 0 ? 1 : .2 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>Top Learners</div>
            {[...userStats].sort((a, b) => b.learnedCount - a.learnedCount).slice(0, 5).map((u, i) => (
              <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-light)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                  {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: 28, height: 28 }} /> : (u.displayName?.[0] || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{u.displayName || u.email}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{u.learnedCount} learned · {u.wordCount} added</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{u.learnedCount}</div>
              </div>
            ))}
          </div>
        </div>}

        {tab === 'users' && <div style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: desk ? '2fr 1fr 1fr 1fr 100px' : '2fr 1fr 80px', gap: 8, padding: '14px 18px', background: 'var(--primary)', color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            <span>User</span>{desk && <span>Words</span>}<span>Learned</span>{desk && <span>Last Login</span>}<span>Role</span>
          </div>
          {userStats.map((u, i) => (
            <div key={u.uid} style={{ display: 'grid', gridTemplateColumns: desk ? '2fr 1fr 1fr 1fr 100px' : '2fr 1fr 80px', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border-light)', alignItems: 'center', animation: `fadeIn .3s ease ${i * .04}s both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                  {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: 32, height: 32 }} /> : (u.displayName?.[0] || '?')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName || 'No name'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
              </div>
              {desk && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--purple)' }}>{u.wordCount}</span>}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{u.learnedCount}</span>
              {desk && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '-'}</span>}
              <button onClick={async () => {
                await toggleAdmin(u.uid, u.email, u.isAdmin)
                setUserStats(prev => prev.map(x => x.uid === u.uid ? { ...x, isAdmin: !x.isAdmin } : x))
              }} style={{ padding: '5px 10px', borderRadius: 20, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: u.isAdmin ? 'var(--primary)' : 'var(--border-light)', color: u.isAdmin ? 'white' : 'var(--text-secondary)' }}>
                {u.isAdmin ? 'Admin' : 'User'}
              </button>
            </div>
          ))}
        </div>}

        {tab === 'activity' && <div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>Daily Logins (30 days)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, overflowX: 'auto', paddingBottom: 8 }}>
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - 29 + i)
                const ds = d.toISOString().split('T')[0]
                const count = userStats.filter(u => u.loginDays?.includes(ds)).length
                const maxC = Math.max(...Array.from({ length: 30 }, (_, j) => { const dd = new Date(); dd.setDate(dd.getDate() - 29 + j); return userStats.filter(u => u.loginDays?.includes(dd.toISOString().split('T')[0])).length }), 1)
                return (
                  <div key={i} style={{ flex: '0 0 auto', width: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 600 }}>{count || ''}</span>
                    <div style={{ width: 16, background: count > 0 ? 'linear-gradient(180deg, var(--primary), var(--purple))' : 'var(--border-light)', borderRadius: 4, height: `${Math.max((count / maxC) * 120, 4)}px` }} />
                    <span style={{ fontSize: 7, color: 'var(--text-light)' }}>{d.getDate()}/{d.getMonth() + 1}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>Recent Logins</div>
            {[...userStats].sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)).slice(0, 10).map((u, i) => (
              <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 9 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
                  {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: 28, height: 28 }} /> : (u.displayName?.[0] || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{u.displayName || u.email}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</div>
              </div>
            ))}
          </div>
        </div>}

      </>}
    </div>
  )
}
