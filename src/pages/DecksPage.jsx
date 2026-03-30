import { useNavigate } from 'react-router-dom'
import Button from '../components/Button/Button.jsx'
import TopBar from '../components/TopBar/TopBar.jsx'
import { useIsDesktop, speak } from '../utils/index.js'
import { catColor } from '../data/vocab.js'

export default function DecksPage({ state }) {
  const nav = useNavigate()
  const desk = useIsDesktop()
  const { allWords, allGroups, learned, user, isAdmin, login, logout, dark, setDark } = state
  const todayWord = allWords[new Date().getDate() % allWords.length]
  const pct = allWords.length > 0 ? Math.round(learned.size / allWords.length * 100) : 0

  return (
    <div style={{ maxWidth: desk ? 1200 : 600, margin: '0 auto', padding: desk ? '24px 32px' : '0 16px 24px' }}>
      {desk
        ? <TopBar user={user} isAdmin={isAdmin} login={login} logout={logout}
            title="Dashboard" subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
        : <div style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', borderRadius: '0 0 24px 24px', padding: '36px 24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: .05, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='2' fill='white'/%3E%3C/svg%3E\")", pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              {user
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{user.photoURL && <img src={user.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)' }} />}<span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{user.displayName?.split(' ')[0] || 'User'}</span></div>
                : <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 13 }}>✦ VocabMaster</span>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDark(!dark)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.15)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dark ? '☀️' : '🌙'}</button>
                {user
                  ? <button onClick={logout} style={{ padding: '8px 14px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,.3)', background: 'transparent', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Sign Out</button>
                  : <button onClick={login} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: 'white', color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>G Sign In</button>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginBottom: 4 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>Your <span style={{ color: '#fbbf24' }}>Progress!</span></div>
          </div>
      }

      <div style={{ display: desk ? 'grid' : 'block', gridTemplateColumns: desk ? '1fr 1fr' : '1fr', gap: 24 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '📚', n: allWords.length, l: 'Total Words', bg: 'var(--primary-light)', c: 'var(--primary)' },
              { icon: '🔥', n: learned.size, l: 'Words Learned', bg: 'var(--orange-light)', c: 'var(--orange)' },
              { icon: '✅', n: pct + '%', l: 'Completion', bg: 'var(--green-light)', c: 'var(--green)' },
              { icon: '📁', n: allGroups.length, l: 'Groups', bg: 'var(--purple-light)', c: 'var(--purple)' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 16, padding: '18px 16px', animation: `fadeIn .3s ease ${i * .08}s both` }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.n}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '18px 20px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Learning Progress</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{learned.size}/{allWords.length}</span>
            </div>
            <div style={{ height: 10, background: 'var(--border-light)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', width: pct + '%', transition: 'width .5s', borderRadius: 5 }} />
            </div>
          </div>

          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--text-dark)' }}>Quick actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '📇', title: 'Browse Cards', desc: 'Study vocabulary', fn: () => nav('/cards') },
              { icon: '⚡', title: 'Flashcards', desc: 'Quick memory test', fn: () => nav('/cards?mode=flash') },
              { icon: '🧠', title: 'Take Quiz', desc: 'Challenge yourself', fn: () => nav('/cards?mode=quiz') },
              ...(user ? [{ icon: '➕', title: 'Add Word', desc: isAdmin ? 'Public word' : 'My word', fn: () => nav('/create'), accent: true }] : []),
              ...(isAdmin ? [{ icon: '🛡️', title: 'Admin Panel', desc: 'Manage users', fn: () => nav('/admin') }] : []),
            ].map((a, i) => (
              <button key={i} onClick={a.fn} style={{ background: a.accent ? 'linear-gradient(135deg, var(--green), #059669)' : 'var(--surface)', borderRadius: 16, padding: '20px 16px', border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: 'var(--shadow-sm)', transition: 'transform .2s', animation: `fadeIn .3s ease ${i * .06}s both` }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{a.icon}</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: a.accent ? 'white' : 'var(--text-dark)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: a.accent ? 'rgba(255,255,255,.7)' : 'var(--text-secondary)', marginTop: 4 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {todayWord && <div style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', borderRadius: 20, padding: '22px 20px', marginBottom: 20, color: 'white', boxShadow: 'var(--shadow-primary)', animation: 'slideUp .4s ease .1s both' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, opacity: .6, marginBottom: 12, textTransform: 'uppercase' }}>✨ Today's word!</div>
            <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 2 }}>{todayWord.word}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, opacity: .7, fontFamily: 'monospace' }}>{todayWord.phonetic}</span>
                <button onClick={() => speak(todayWord.word)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.2)', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔊</button>
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, opacity: .85, marginBottom: 14 }}>✨ {todayWord.def}</div>
            {todayWord.ex && <div style={{ fontSize: 12, opacity: .6, fontStyle: 'italic', marginBottom: 14 }}>💡 {todayWord.ex}</div>}
            <Button variant="secondary" onClick={() => nav('/cards')} style={{ background: 'white', color: 'var(--primary)' }}>See all words →</Button>
          </div>}

          {desk && <>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: 'var(--text-dark)' }}>Recent words</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {allWords.slice(0, 6).map((v, i) => (
                <div key={v.id || v.fid} onClick={() => nav('/cards')} style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'transform .2s', animation: `fadeIn .3s ease ${i * .04}s both` }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <span style={{ background: catColor(v.cat) + '18', color: catColor(v.cat), fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>{v.cat}</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginTop: 6 }}>{v.word}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.def}</div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}
