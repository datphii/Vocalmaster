import { useState, useEffect, useCallback, useMemo } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore'
import { auth, db, googleProvider, ADMIN_EMAILS } from './firebase.js'
import { defaultVocab, categories, catColor } from './data/vocab.js'
import Navbar from './components/Navbar/Navbar.jsx'
import Button from './components/Button/Button.jsx'
import DeckCard from './components/DeckCard/DeckCard.jsx'
import './styles/global.css'

const speak = t => { if(!('speechSynthesis' in window))return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); u.lang='en-US'; u.rate=0.78; window.speechSynthesis.speak(u) }
const LS = { get:(k,d)=>{try{return JSON.parse(localStorage.getItem('vm_'+k))??d}catch{return d}}, set:(k,v)=>{try{localStorage.setItem('vm_'+k,JSON.stringify(v))}catch{}} }
const makeQuiz = (pool,n=10) => { const s=[...pool].sort(()=>Math.random()-.5).slice(0,Math.min(n,pool.length)); return s.map(w=>{const wr=pool.filter(o=>(o.id||o.fid)!==(w.id||w.fid)).sort(()=>Math.random()-.5).slice(0,3);return{def:w.def,answer:w.word,options:[...wr.map(o=>o.word),w.word].sort(()=>Math.random()-.5)}}) }

// ═══ GLOBAL STATE HOOK ═══
function useAppState() {
  const [user,setUser]=useState(null)
  const [customWords,setCustomWords]=useState([])
  const [learned,setLearned]=useState(()=>new Set(LS.get('learned',[])))
  const [groups,setGroups]=useState(()=>LS.get('groups',['GD&T Basics']))
  const [dark,setDark]=useState(()=>LS.get('dark',false))

  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  useEffect(()=>{const u=onAuthStateChanged(auth,u=>setUser(u));return u},[])
  useEffect(()=>{getRedirectResult(auth).catch(()=>{})},[])
  useEffect(()=>{loadWords()},[])
  useEffect(()=>{LS.set('learned',[...learned])},[learned])
  useEffect(()=>{LS.set('dark',dark);document.documentElement.setAttribute('data-theme',dark?'dark':'light')},[dark])

  const loadWords=async()=>{try{const snap=await getDocs(query(collection(db,'custom_words'),orderBy('createdAt','desc')));const w=snap.docs.map(d=>({...d.data(),fid:d.id,fromFS:true}));setCustomWords(w);const fg=[...new Set(w.map(x=>x.group).filter(Boolean))];setGroups([...new Set(['GD&T Basics',...LS.get('groups',[]),...fg])])}catch(e){console.log(e)}}
  const login=async()=>{try{await signInWithPopup(auth,googleProvider)}catch{try{await signInWithRedirect(auth,googleProvider)}catch(e){alert(e.message)}}}
  const logout=()=>signOut(auth)
  const saveWord=async(form,id)=>{try{if(id)await updateDoc(doc(db,'custom_words',id),{...form,updatedAt:new Date().toISOString()});else await addDoc(collection(db,'custom_words'),{...form,createdAt:new Date().toISOString(),addedBy:user.email});await loadWords();return true}catch(e){alert(e.message);return false}}
  const delWord=async id=>{try{await deleteDoc(doc(db,'custom_words',id));await loadWords()}catch(e){alert(e.message)}}
  const toggleLearned=useCallback(id=>{setLearned(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n})},[])

  const allWords=useMemo(()=>[...customWords,...defaultVocab],[customWords])
  const allGroups=useMemo(()=>[...new Set(allWords.map(w=>w.group).filter(Boolean))],[allWords])

  return { user,isAdmin,allWords,customWords,allGroups,learned,groups,dark,setDark,login,logout,saveWord,delWord,toggleLearned,loadWords,setGroups }
}

// ═══ ADMIN MODAL ═══
function AdminModal({onClose,onSave,editWord,groups}){
  const [form,setForm]=useState(editWord||{word:'',phonetic:'',cat:'general',group:'GD&T Basics',def:'',ex:'',sentence:''})
  const [saving,setSaving]=useState(false)
  const [tab,setTab]=useState('word')
  const [newGroup,setNewGroup]=useState('')
  const inp={width:'100%',padding:'12px 14px',border:'1.5px solid var(--border)',borderRadius:'var(--r-md)',background:'var(--surface)',fontSize:14,color:'var(--text)',outline:'none',marginBottom:12,fontFamily:'inherit'}
  const lbl={fontSize:11,fontWeight:700,color:'var(--text-secondary)',letterSpacing:1,textTransform:'uppercase',marginBottom:4,display:'block'}
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:'var(--surface)',borderRadius:20,width:'100%',maxWidth:500,maxHeight:'90vh',overflow:'auto',boxShadow:'0 25px 50px rgba(0,0,0,.15)',animation:'scaleIn .2s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',padding:'20px 24px',borderRadius:'20px 20px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'white',fontWeight:800,fontSize:18}}>{editWord?'✏️ Edit':'➕ New Word'}</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.2)',border:'none',color:'white',width:32,height:32,borderRadius:'50%',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{display:'flex',borderBottom:'1.5px solid var(--border)'}}>
          {['word','groups'].map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:12,border:'none',background:tab===t?'var(--primary-light)':'transparent',color:tab===t?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>{t==='word'?'📝 Word':'📁 Groups'}</button>)}
        </div>
        <div style={{padding:20}}>
          {tab==='word'?<>
            <label style={lbl}>Word *</label><input value={form.word} onChange={e=>setForm({...form,word:e.target.value})} placeholder="e.g. Tolerance" style={inp}/>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}><label style={lbl}>IPA</label><input value={form.phonetic} onChange={e=>setForm({...form,phonetic:e.target.value})} style={inp}/></div>
              <div style={{flex:1}}><label style={lbl}>Category</label><select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} style={{...inp,cursor:'pointer'}}>{categories.filter(c=>c.key!=='all').map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            </div>
            <label style={lbl}>Group</label><select value={form.group||''} onChange={e=>setForm({...form,group:e.target.value})} style={{...inp,cursor:'pointer'}}>{groups.map(g=><option key={g} value={g}>{g}</option>)}</select>
            <label style={lbl}>Definition *</label><textarea value={form.def} onChange={e=>setForm({...form,def:e.target.value})} rows={3} style={{...inp,resize:'vertical'}}/>
            <label style={lbl}>Example</label><textarea value={form.ex||''} onChange={e=>setForm({...form,ex:e.target.value})} rows={2} style={{...inp,resize:'vertical'}}/>
            <label style={lbl}>Sentence</label><textarea value={form.sentence||''} onChange={e=>setForm({...form,sentence:e.target.value})} rows={2} style={{...inp,resize:'vertical'}}/>
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <Button variant="outline" full onClick={onClose}>Cancel</Button>
              <Button variant="blue" full onClick={async()=>{if(!form.word||!form.def)return alert('Required!');setSaving(true);const ok=await onSave(form,editWord?.fid);setSaving(false);if(ok)onClose()}} disabled={saving}>{saving?'...':editWord?'Update':'Add Word'}</Button>
            </div>
          </>:<>
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              <input value={newGroup} onChange={e=>setNewGroup(e.target.value)} placeholder="New group..." style={{...inp,flex:1,marginBottom:0}}/>
              <Button variant="primary" size="sm" onClick={()=>{if(newGroup.trim()){LS.set('groups',[...groups,newGroup.trim()]);window.location.reload()}}}>+ Add</Button>
            </div>
            {groups.map((g,i)=><div key={i} style={{display:'flex',alignItems:'center',padding:'12px 14px',borderBottom:'1px solid var(--border-light)',gap:10}}>
              <span>📁</span><span style={{flex:1,fontWeight:600}}>{g}</span>
              {g!=='GD&T Basics'&&<button onClick={()=>{LS.set('groups',groups.filter(x=>x!==g));window.location.reload()}} style={{color:'var(--accent)',fontSize:18}}>✕</button>}
            </div>)}
          </>}
        </div>
      </div>
    </div>
  )
}

// ═══ PAGE: DECKS (HOME) ═══
function DecksPage({state}){
  const nav=useNavigate()
  const {allWords,allGroups,learned,user,isAdmin,login,logout,dark,setDark}=state
  const todayWord=allWords[new Date().getDate()%allWords.length]
  const pct=allWords.length>0?Math.round(learned.size/allWords.length*100):0

  return(
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 16px 24px'}}>
      {/* Hero */}
      <div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:'0 0 24px 24px',padding:'36px 24px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,opacity:.05,backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='2' fill='white'/%3E%3C/svg%3E\")",pointerEvents:'none'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          {user?<div style={{display:'flex',alignItems:'center',gap:10}}>{user.photoURL&&<img src={user.photoURL} alt="" style={{width:36,height:36,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)'}}/>}<span style={{color:'white',fontWeight:700,fontSize:14}}>{user.displayName?.split(' ')[0]||'User'}</span></div>:<span style={{color:'rgba(255,255,255,.7)',fontWeight:700,fontSize:13}}>✦ VocabMaster</span>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setDark(!dark)} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.15)',color:'white',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{dark?'☀️':'🌙'}</button>
            {user?<button onClick={logout} style={{padding:'8px 14px',borderRadius:20,border:'1.5px solid rgba(255,255,255,.3)',background:'transparent',color:'white',fontSize:11,fontWeight:700,cursor:'pointer'}}>Sign Out</button>
            :<button onClick={login} style={{padding:'8px 16px',borderRadius:20,border:'none',background:'white',color:'var(--primary)',fontSize:12,fontWeight:700,cursor:'pointer'}}>G Sign In</button>}
          </div>
        </div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.5)',fontWeight:600,marginBottom:4}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        <div style={{fontSize:26,fontWeight:900,color:'white',lineHeight:1.2}}>Your <span style={{color:'#fbbf24'}}>Progress!</span></div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.6)',marginTop:6}}>Track your learning, day by day!</div>
      </div>

      {/* Stats Grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        {[
          {icon:'📚',n:allWords.length,l:'Total Words',bg:'var(--primary-light)',c:'var(--primary)'},
          {icon:'🔥',n:learned.size,l:'Words Learned',bg:'var(--orange-light)',c:'var(--orange)'},
          {icon:'✅',n:pct+'%',l:'Completion',bg:'var(--green-light)',c:'var(--green)'},
          {icon:'📁',n:allGroups.length,l:'Groups',bg:'var(--purple-light)',c:'var(--purple)'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:16,padding:'18px 16px',animation:`fadeIn .3s ease ${i*.08}s both`}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:900,color:s.c}}>{s.n}</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{background:'var(--surface)',borderRadius:16,padding:'18px 20px',marginBottom:20,boxShadow:'var(--shadow-sm)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <span style={{fontSize:14,fontWeight:700}}>Learning Progress</span>
          <span style={{fontSize:14,fontWeight:800,color:'var(--primary)'}}>{learned.size}/{allWords.length}</span>
        </div>
        <div style={{height:10,background:'var(--border-light)',borderRadius:5,overflow:'hidden'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg, var(--primary), var(--accent))',width:pct+'%',transition:'width .5s',borderRadius:5}}/>
        </div>
      </div>

      {/* Today's Word */}
      {todayWord&&<div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:20,padding:'22px 20px',marginBottom:20,color:'white',boxShadow:'var(--shadow-primary)',animation:'slideUp .4s ease .1s both'}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:2,opacity:.6,marginBottom:12,textTransform:'uppercase'}}>✨ Today's Word!</div>
        <div style={{background:'rgba(255,255,255,.12)',borderRadius:14,padding:'16px 18px',marginBottom:14}}>
          <div style={{fontSize:24,fontWeight:900,marginBottom:2}}>{todayWord.word}</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,opacity:.7,fontFamily:'monospace'}}>{todayWord.phonetic}</span>
            <button onClick={()=>speak(todayWord.word)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.2)',color:'white',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔊</button>
          </div>
        </div>
        <div style={{fontSize:13,lineHeight:1.7,opacity:.85,marginBottom:14}}>✨ {todayWord.def}</div>
        <Button variant="secondary" onClick={()=>nav('/cards')} style={{background:'white',color:'var(--primary)'}}>See Details →</Button>
      </div>}

      {/* Quick Actions */}
      <div style={{fontSize:16,fontWeight:800,marginBottom:12,color:'var(--text-dark)'}}>Quick Actions</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        {[
          {icon:'📇',title:'Browse Cards',desc:'Study vocabulary',fn:()=>nav('/cards')},
          {icon:'⚡',title:'Flashcards',desc:'Quick memory test',fn:()=>nav('/cards?mode=flash')},
          {icon:'🧠',title:'Take Quiz',desc:'Challenge yourself',fn:()=>nav('/cards?mode=quiz')},
          ...(isAdmin?[{icon:'➕',title:'Add Word',desc:'Admin only',fn:()=>nav('/create'),accent:true}]:[]),
        ].map((a,i)=>(
          <button key={i} onClick={a.fn} style={{background:a.accent?'linear-gradient(135deg, var(--green), #059669)':'var(--surface)',borderRadius:16,padding:'20px 16px',border:'none',cursor:'pointer',textAlign:'left',boxShadow:'var(--shadow-sm)',transition:'transform .2s',animation:`fadeIn .3s ease ${i*.06}s both`}}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.03)'}
            onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            <span style={{fontSize:28,display:'block',marginBottom:8}}>{a.icon}</span>
            <div style={{fontSize:15,fontWeight:700,color:a.accent?'white':'var(--text-dark)'}}>{a.title}</div>
            <div style={{fontSize:11,color:a.accent?'rgba(255,255,255,.7)':'var(--text-secondary)',marginTop:4}}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══ PAGE: CARDS ═══
function CardsPage({state}){
  const nav=useNavigate()
  const loc=useLocation()
  const params=new URLSearchParams(loc.search)
  const initMode=params.get('mode')||'card'

  const {allWords,allGroups,learned,toggleLearned,isAdmin,delWord,dark}=state
  const [mode,setMode]=useState(initMode)
  const [search,setSearch]=useState('')
  const [cat,setCat]=useState('all')
  const [groupF,setGroupF]=useState('all')
  const [showAdmin,setShowAdmin]=useState(false)
  const [editWord,setEditWord]=useState(null)

  const filtered=useMemo(()=>allWords.filter(v=>(cat==='all'||v.cat===cat)&&(groupF==='all'||v.group===groupF)&&(!search||v.word.toLowerCase().includes(search.toLowerCase())||v.def.toLowerCase().includes(search.toLowerCase()))),[cat,groupF,search,allWords])

  return(
    <div style={{maxWidth:1000,margin:'0 auto',padding:'16px 16px 24px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={()=>nav('/')} style={{width:40,height:40,borderRadius:'50%',border:'none',background:'var(--surface)',color:'var(--text)',fontSize:18,cursor:'pointer',boxShadow:'var(--shadow-sm)',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <div style={{flex:1}}><div style={{fontSize:20,fontWeight:800,color:'var(--text-dark)'}}>Vocabulary</div><div style={{fontSize:11,color:'var(--text-secondary)'}}>{filtered.length} words · {learned.size} learned</div></div>
        {isAdmin&&<Button variant="primary" size="sm" onClick={()=>{setEditWord(null);setShowAdmin(true)}}>➕ Add</Button>}
      </div>

      {/* Search */}
      <div style={{position:'relative',marginBottom:14}}>
        <span style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--text-light)'}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search words..." style={{width:'100%',padding:'14px 16px 14px 44px',borderRadius:14,border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:14,color:'var(--text)',outline:'none'}}/>
      </div>

      {/* Mode tabs */}
      <div style={{display:'flex',background:'var(--surface)',borderRadius:14,padding:4,marginBottom:14,boxShadow:'var(--shadow-sm)'}}>
        {[{k:'card',l:'📇 Cards'},{k:'flash',l:'⚡ Flash'},{k:'quiz',l:'🧠 Quiz'},{k:'table',l:'📊 Table'}].map(m=>(
          <button key={m.k} onClick={()=>setMode(m.k)} style={{flex:1,padding:'10px 8px',borderRadius:10,border:'none',background:mode===m.k?'var(--primary)':'transparent',color:mode===m.k?'white':'var(--text-secondary)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .2s'}}>{m.l}</button>
        ))}
      </div>

      {/* Filters */}
      {mode!=='quiz'&&<>
        {allGroups.length>1&&<div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap',overflowX:'auto'}}>
          <button onClick={()=>setGroupF('all')} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${groupF==='all'?'var(--primary)':'var(--border)'}`,background:groupF==='all'?'var(--primary-light)':'transparent',color:groupF==='all'?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer'}}>All Groups</button>
          {allGroups.map(g=><button key={g} onClick={()=>setGroupF(g)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${groupF===g?'var(--primary)':'var(--border)'}`,background:groupF===g?'var(--primary-light)':'transparent',color:groupF===g?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{g}</button>)}
        </div>}
        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',overflowX:'auto'}}>
          {categories.map(c=><button key={c.key} onClick={()=>setCat(c.key)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${cat===c.key?c.color:'var(--border)'}`,background:cat===c.key?c.color+'15':'transparent',color:cat===c.key?c.color:'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{c.label}</button>)}
        </div>
      </>}

      {/* Content */}
      {mode==='card'&&(filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--text-secondary)'}}>No words found</div>:
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map((v,i)=>{
            const isL=learned.has(v.id||v.fid)
            return(
              <div key={v.fid||v.id} style={{background:'var(--surface)',borderRadius:16,padding:'16px 18px',boxShadow:'var(--shadow-sm)',cursor:'pointer',transition:'transform .2s',animation:`fadeIn .3s ease ${Math.min(i*.03,.3)}s both`,position:'relative'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-3px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                {v.fromFS&&<div style={{position:'absolute',top:12,right:12,background:'var(--green)',color:'white',fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>NEW</div>}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{background:catColor(v.cat)+'18',color:catColor(v.cat),fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20}}>{v.cat}</span>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:'var(--text-dark)',marginBottom:2}}>{v.word}</div>
                <div style={{fontSize:12,color:'var(--primary)',fontFamily:'monospace',marginBottom:8}}>{v.phonetic}</div>
                <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:12}}>{v.def}</div>
                {v.ex&&<div style={{background:'var(--border-light)',borderRadius:10,padding:'8px 12px',fontSize:12,color:'var(--text-secondary)',lineHeight:1.5,marginBottom:10,fontStyle:'italic'}}>💡 {v.ex}</div>}
                <div style={{display:'flex',gap:6}}>
                  <button onClick={e=>{e.stopPropagation();speak(v.word)}} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'var(--primary-light)',color:'var(--primary)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔊</button>
                  <button onClick={e=>{e.stopPropagation();toggleLearned(v.id||v.fid)}} style={{width:36,height:36,borderRadius:'50%',border:'none',background:isL?'var(--green)':'var(--border-light)',color:isL?'white':'var(--text-light)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>✓</button>
                  {isAdmin&&v.fromFS&&<>
                    <button onClick={e=>{e.stopPropagation();setEditWord(v);setShowAdmin(true)}} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'var(--primary-light)',color:'var(--primary)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>
                    <button onClick={e=>{e.stopPropagation();if(confirm('Delete?'))delWord(v.fid)}} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'var(--pink-light)',color:'var(--accent)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mode==='flash'&&<FlashView words={filtered}/>}
      {mode==='quiz'&&<QuizView words={filtered} onFinish={()=>setMode('card')}/>}
      {mode==='table'&&<TableView words={filtered} learned={learned}/>}

      {showAdmin&&<AdminModal onClose={()=>{setShowAdmin(false);setEditWord(null)}} onSave={state.saveWord} editWord={editWord} groups={state.groups}/>}
    </div>
  )
}

// ═══ FLASH VIEW ═══
function FlashView({words}){
  const [i,setI]=useState(0),[f,setF]=useState(false)
  useEffect(()=>setF(false),[i])
  const w=words[i]; if(!w) return <div style={{textAlign:'center',padding:40}}>No words</div>
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,padding:'20px 0'}}>
      <div style={{fontSize:14,color:'var(--text-secondary)',fontWeight:600}}>Card {i+1} of {words.length}</div>
      <div onClick={()=>setF(!f)} style={{width:'100%',maxWidth:480,minHeight:280,cursor:'pointer',perspective:1000}}>
        <div style={{width:'100%',minHeight:280,transition:'transform .6s',transformStyle:'preserve-3d',position:'relative',transform:f?'rotateY(180deg)':'none'}}>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:20,padding:'36px 28px',display:'flex',flexDirection:'column',justifyContent:'center',minHeight:280,boxShadow:'var(--shadow-primary)'}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.5)',fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:20}}>Tap to reveal →</div>
            <div style={{fontSize:34,fontWeight:900,color:'white',marginBottom:8}}>{w.word}</div>
            <span style={{background:'rgba(255,255,255,.15)',color:'white',fontSize:11,padding:'4px 12px',borderRadius:20,fontWeight:600,alignSelf:'flex-start',marginBottom:10}}>{w.cat}</span>
            <div style={{fontSize:14,color:'rgba(255,255,255,.6)',fontFamily:'monospace'}}>{w.phonetic}</div>
          </div>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',background:'var(--surface)',borderRadius:20,padding:'36px 28px',display:'flex',flexDirection:'column',justifyContent:'center',minHeight:280,boxShadow:'var(--shadow-md)'}}>
            <div style={{fontSize:12,color:'var(--text-secondary)',fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>Definition</div>
            <div style={{fontSize:16,color:'var(--text)',lineHeight:1.8,marginBottom:16}}>{w.def}</div>
            {w.ex&&<div style={{fontSize:13,color:'var(--orange)',fontStyle:'italic',paddingTop:14,borderTop:'1px solid var(--border-light)'}}>💡 {w.ex}</div>}
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:10}}>
        <Button variant="outline" onClick={()=>setI((i-1+words.length)%words.length)}>← Prev</Button>
        <Button variant="blue" onClick={()=>setF(!f)}>Flip</Button>
        <Button variant="outline" onClick={()=>speak(w.word)}>🔊</Button>
        <Button variant="outline" onClick={()=>setI((i+1)%words.length)}>Next →</Button>
      </div>
    </div>
  )
}

// ═══ QUIZ VIEW ═══
function QuizView({words,onFinish}){
  const [qs]=useState(()=>makeQuiz(words.length>=4?words:defaultVocab))
  const [c,setC]=useState(0),[s,setS]=useState(null),[sc,setSc]=useState(0),[log,setLog]=useState([]),[done,setDone]=useState(false)
  if(done){const p=sc/qs.length;return(
    <div style={{maxWidth:480,margin:'0 auto',padding:20}}>
      <div style={{background:`linear-gradient(135deg,${p>=.8?'var(--green)':p>=.5?'var(--orange)':'var(--accent)'},${p>=.8?'#059669':'#d97706'})`,borderRadius:20,padding:40,textAlign:'center',color:'white',boxShadow:'var(--shadow-lg)'}}>
        <div style={{fontSize:56,marginBottom:8}}>{p>=.8?'🏆':p>=.5?'👍':'📖'}</div>
        <div style={{fontSize:42,fontWeight:900}}>{sc}/{qs.length}</div>
        <div style={{fontSize:16,opacity:.8,marginBottom:20}}>{Math.round(p*100)}%</div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <Button variant="outline" onClick={onFinish} style={{borderColor:'rgba(255,255,255,.3)',color:'white'}}>← Back</Button>
          <Button variant="outline" onClick={()=>{setC(0);setS(null);setSc(0);setLog([]);setDone(false)}} style={{borderColor:'rgba(255,255,255,.3)',color:'white',background:'rgba(255,255,255,.15)'}}>Retry</Button>
        </div>
      </div>
    </div>
  )}
  const q=qs[c];return(
    <div style={{maxWidth:480,margin:'0 auto',padding:16}}>
      <div style={{textAlign:'center',fontSize:14,color:'var(--text-secondary)',fontWeight:600,marginBottom:16}}>Q {c+1}/{qs.length}</div>
      <div style={{background:'var(--surface)',borderRadius:16,padding:'24px 20px',marginBottom:16,boxShadow:'var(--shadow-sm)'}}>
        <div style={{fontSize:11,color:'var(--primary)',fontWeight:700,letterSpacing:2,marginBottom:8,textTransform:'uppercase'}}>Which word?</div>
        <div style={{fontSize:15,color:'var(--text)',lineHeight:1.7}}>{q.def}</div>
      </div>
      <div style={{display:'grid',gap:8}}>
        {q.options.map((o,i)=>{const pk=s===o,co=o===q.answer,sh=s!==null;let bg='var(--surface)',bc='var(--border)';if(sh&&co){bg='var(--green-light)';bc='var(--green)'}else if(sh&&pk&&!co){bg='var(--pink-light)';bc='var(--accent)'};return(
          <button key={i} disabled={sh} onClick={()=>{setS(o);const ok=o===q.answer;if(ok)setSc(x=>x+1);setLog(l=>[...l,{answer:q.answer,picked:o,ok}]);setTimeout(()=>{if(c<qs.length-1){setC(x=>x+1);setS(null)}else setDone(true)},1000)}} style={{padding:'14px 18px',borderRadius:14,border:`1.5px solid ${bc}`,background:bg,fontSize:14,fontWeight:700,cursor:sh?'default':'pointer',textAlign:'left',color:'var(--text)',transition:'all .2s'}}>{o}{sh&&co&&' ✓'}{sh&&pk&&!co&&' ✗'}</button>
        )})}
      </div>
      <div style={{marginTop:14,height:6,background:'var(--border-light)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',background:'linear-gradient(90deg, var(--primary), var(--accent))',width:`${((c+1)/qs.length)*100}%`,transition:'width .3s',borderRadius:3}}/></div>
    </div>
  )
}

// ═══ TABLE VIEW ═══
function TableView({words,learned}){
  return(
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'separate',borderSpacing:0,background:'var(--surface)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-sm)',fontSize:13}}>
        <thead><tr>{['#','Word','Cat','Definition'].map(h=><th key={h} style={{background:'var(--primary)',color:'white',fontWeight:700,fontSize:11,letterSpacing:1,textTransform:'uppercase',padding:'14px 16px',textAlign:'left'}}>{h}</th>)}</tr></thead>
        <tbody>{words.map((v,i)=><tr key={v.fid||v.id}>
          <td style={{padding:'12px 16px',color:'var(--text-light)',borderBottom:'1px solid var(--border-light)'}}>{i+1}</td>
          <td style={{padding:'12px 16px',borderBottom:'1px solid var(--border-light)'}}><div style={{fontWeight:700,color:'var(--text-dark)'}}>{v.word}</div><div style={{fontSize:11,color:'var(--primary)',fontFamily:'monospace'}}>{v.phonetic}</div></td>
          <td style={{padding:'12px 16px',borderBottom:'1px solid var(--border-light)'}}><span style={{fontSize:11,color:catColor(v.cat),background:catColor(v.cat)+'15',padding:'3px 8px',borderRadius:10,fontWeight:600}}>{v.cat}</span></td>
          <td style={{padding:'12px 16px',color:'var(--text-secondary)',lineHeight:1.6,borderBottom:'1px solid var(--border-light)',maxWidth:300}}>{v.def}</td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}

// ═══ PAGE: CREATE DECK ═══
function CreateDeckPage({state}){
  const nav=useNavigate()
  const [showAdmin,setShowAdmin]=useState(false)
  return(
    <div style={{maxWidth:600,margin:'0 auto',padding:'24px 16px'}}>
      <div style={{fontSize:28,fontWeight:900,color:'var(--text-dark)',marginBottom:8}}>Create a deck</div>
      <div style={{fontSize:14,color:'var(--text-secondary)',marginBottom:24}}>Choose how you want to build your vocabulary</div>

      <DeckCard variant="ai" icon="✨" title="AI Generated" description="Let AI create flashcards from any topic or text you provide" buttonText="Generate with AI" onAction={()=>alert('Coming soon! AI generation with Google Gemini.')} style={{marginBottom:16,animationDelay:'.05s'}}/>
      <DeckCard variant="manual" icon="🎯" title="Create own cards" description="Manually add your own vocabulary words and definitions" buttonText="Start creating" onAction={()=>{if(state.isAdmin)setShowAdmin(true);else if(!state.user)state.login();else alert('Only admin can add words')}} style={{animationDelay:'.1s'}}/>

      {showAdmin&&<AdminModal onClose={()=>setShowAdmin(false)} onSave={state.saveWord} groups={state.groups}/>}
    </div>
  )
}

// ═══ PAGE: BROWSE ═══
function BrowsePage({state}){
  const nav=useNavigate()
  const {allGroups,allWords}=state
  return(
    <div style={{maxWidth:600,margin:'0 auto',padding:'24px 16px'}}>
      <div style={{fontSize:28,fontWeight:900,color:'var(--text-dark)',marginBottom:8}}>Browse</div>
      <div style={{fontSize:14,color:'var(--text-secondary)',marginBottom:24}}>Explore vocabulary by category</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {categories.filter(c=>c.key!=='all').map((c,i)=>{
          const count=allWords.filter(w=>w.cat===c.key).length
          return <DeckCard key={c.key} variant={i%2===0?'ai':'manual'} icon={c.key==='general'?'📋':c.key==='tolerance'?'📐':c.key==='datum'?'📍':c.key==='symbol'?'⊕':c.key==='measurement'?'📏':c.key==='drawing'?'✏️':'🔧'} title={c.label} description={`${count} words`} count={count} learned={[...state.learned].filter(id=>allWords.find(w=>(w.id||w.fid)===id&&w.cat===c.key)).length} onAction={()=>nav(`/cards?cat=${c.key}`)} style={{animationDelay:i*.05+'s'}}/>
        })}
      </div>
    </div>
  )
}

// ═══ PAGE: ANALYTICS ═══
function AnalyticsPage({state}){
  const {allWords,learned,allGroups}=state
  const pct=allWords.length>0?Math.round(learned.size/allWords.length*100):0
  const catStats=categories.filter(c=>c.key!=='all').map(c=>{const total=allWords.filter(w=>w.cat===c.key).length;const done=[...learned].filter(id=>allWords.find(w=>(w.id||w.fid)===id&&w.cat===c.key)).length;return{...c,total,done,pct:total>0?Math.round(done/total*100):0}})

  return(
    <div style={{maxWidth:600,margin:'0 auto',padding:'24px 16px'}}>
      <div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:20,padding:'28px 24px',marginBottom:20,color:'white'}}>
        <div style={{fontSize:24,fontWeight:900,marginBottom:4}}>Your <span style={{color:'#fbbf24'}}>Stats</span></div>
        <div style={{fontSize:13,opacity:.6}}>Track your learning progress</div>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:24}}>
        {[{n:pct+'%',l:'Retention',icon:'🎯',c:'var(--primary)'},{n:learned.size,l:'Learned',icon:'✅',c:'var(--green)'},{n:allWords.length-learned.size,l:'Remaining',icon:'📚',c:'var(--orange)'}].map((s,i)=>(
          <div key={i} style={{background:'var(--surface)',borderRadius:16,padding:'18px 14px',textAlign:'center',boxShadow:'var(--shadow-sm)',animation:`fadeIn .3s ease ${i*.08}s both`}}>
            <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.n}</div>
            <div style={{fontSize:10,color:'var(--text-secondary)',fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div style={{fontSize:16,fontWeight:800,marginBottom:12,color:'var(--text-dark)'}}>By Category</div>
      {catStats.map((c,i)=>(
        <div key={c.key} style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',marginBottom:8,boxShadow:'var(--shadow-sm)',animation:`fadeIn .3s ease ${i*.05}s both`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{background:c.color+'18',color:c.color,fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20}}>{c.label}</span>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:c.color}}>{c.done}/{c.total}</span>
          </div>
          <div style={{height:6,background:'var(--border-light)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',background:c.color,width:c.pct+'%',transition:'width .5s',borderRadius:3}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══ APP ROUTER ═══
function AppInner(){
  const state=useAppState()
  return(
    <>
      <Routes>
        <Route path="/" element={<DecksPage state={state}/>}/>
        <Route path="/cards" element={<CardsPage state={state}/>}/>
        <Route path="/create" element={<CreateDeckPage state={state}/>}/>
        <Route path="/browse" element={<BrowsePage state={state}/>}/>
        <Route path="/analytics" element={<AnalyticsPage state={state}/>}/>
      </Routes>
      <Navbar/>
    </>
  )
}

export default function App(){
  return <BrowserRouter><AppInner/></BrowserRouter>
}
