import { useState, useEffect, useCallback, useMemo } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, deleteDoc, updateDoc, setDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db, googleProvider, ADMIN_EMAILS } from './firebase.js'
import { defaultVocab, categories, catColor } from './data/vocab.js'
import Navbar from './components/Navbar/Navbar.jsx'
import Button from './components/Button/Button.jsx'
import DeckCard from './components/DeckCard/DeckCard.jsx'
import './styles/global.css'

const speak = t => { if(!('speechSynthesis' in window))return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); u.lang='en-US'; u.rate=0.78; window.speechSynthesis.speak(u) }
const LS = { get:(k,d)=>{try{return JSON.parse(localStorage.getItem('vm_'+k))??d}catch{return d}}, set:(k,v)=>{try{localStorage.setItem('vm_'+k,JSON.stringify(v))}catch{}} }
const makeQuiz = (pool,n=10) => { const s=[...pool].sort(()=>Math.random()-.5).slice(0,Math.min(n,pool.length)); return s.map(w=>{const wr=pool.filter(o=>(o.id||o.fid)!==(w.id||w.fid)).sort(()=>Math.random()-.5).slice(0,3);return{def:w.def,answer:w.word,options:[...wr.map(o=>o.word),w.word].sort(()=>Math.random()-.5)}}) }

// Hook to detect desktop
function useIsDesktop() {
  const [d,setD]=useState(window.innerWidth>=768)
  useEffect(()=>{const h=()=>setD(window.innerWidth>=768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[])
  return d
}

// ═══ STATE ═══
function useAppState() {
  const [user,setUser]=useState(null)
  const [isAdmin,setIsAdmin]=useState(false)
  const [publicWords,setPublicWords]=useState([])   // Admin's public words (everyone sees)
  const [myWords,setMyWords]=useState([])            // Current user's private words
  const [learned,setLearned]=useState(()=>new Set(LS.get('learned',[])))
  const [groups,setGroups]=useState(()=>LS.get('groups',['GD&T Basics']))
  const [dark,setDark]=useState(()=>LS.get('dark',false))

  useEffect(()=>{
    let adminUnsub=null
    const unsub=onAuthStateChanged(auth,async(u)=>{
      setUser(u)
      if(adminUnsub){adminUnsub();adminUnsub=null}
      if(u){
        loadUserLearned(u.uid);loadMyWords(u.uid);trackUserLogin(u)
        // Realtime listener for admin status
        adminUnsub=onSnapshot(doc(db,'app_users',u.uid),(snap)=>{
          const newAdmin = snap.exists() ? snap.data().isAdmin===true : ADMIN_EMAILS.includes(u.email)
          setIsAdmin(prev=>prev===newAdmin?prev:newAdmin)
        })
      }else{
        setMyWords([]);setIsAdmin(false);setLearned(new Set(LS.get('learned',[])))
      }
    })
    return ()=>{unsub();if(adminUnsub)adminUnsub()}
  },[])
  useEffect(()=>{loadPublicWords()},[])
  useEffect(()=>{LS.set('dark',dark);document.documentElement.setAttribute('data-theme',dark?'dark':'light')},[dark])

  // Save learned to both localStorage and Firestore
  useEffect(()=>{
    LS.set('learned',[...learned])
    if(user){
      const ref=doc(db,'users',user.uid,'progress','learned')
      setDoc(ref,{words:[...learned],updatedAt:new Date().toISOString()},{merge:true}).catch(e=>console.log('Learned sync:',e))
    }
  },[learned,user])

  // Load public words (admin-created, everyone sees)
  const loadPublicWords=async()=>{
    try{
      const snap=await getDocs(query(collection(db,'custom_words'),orderBy('createdAt','desc')))
      const w=snap.docs.map(d=>({...d.data(),fid:d.id,fromFS:true,isPublic:true}))
      setPublicWords(w)
      const fg=[...new Set(w.map(x=>x.group).filter(Boolean))]
      setGroups([...new Set(['GD&T Basics',...LS.get('groups',[]),...fg])])
    }catch(e){console.log('Public words error:',e)}
  }

  // Load user's private words
  const loadMyWords=async(uid)=>{
    if(!uid) return
    try{
      const snap=await getDocs(query(collection(db,'users',uid,'my_words'),orderBy('createdAt','desc')))
      const w=snap.docs.map(d=>({...d.data(),fid:d.id,fromFS:true,isPrivate:true}))
      setMyWords(w)
    }catch(e){console.log('My words error:',e)}
  }

  // Load user's learned progress from Firestore
  const loadUserLearned=async(uid)=>{
    try{
      const snap=await getDocs(collection(db,'users',uid,'progress'))
      snap.docs.forEach(d=>{
        const data=d.data()
        if(data.words&&Array.isArray(data.words)){
          setLearned(new Set([...LS.get('learned',[]),...data.words]))
        }
      })
    }catch(e){console.log('Learned load error:',e)}
  }

  const login=async()=>{try{await signInWithPopup(auth,googleProvider)}catch(e){console.error('Login error:',e);if(e.code==='auth/popup-blocked'){alert('Popup bị chặn! Vui lòng cho phép popup trong trình duyệt rồi thử lại.')}else if(e.code!=='auth/popup-closed-by-user'){alert('Login failed: '+e.message)}}}
  const logout=()=>{signOut(auth);setMyWords([]);setIsAdmin(false)}

  // Track user login in app_users collection (don't overwrite isAdmin)
  const trackUserLogin=async(u)=>{
    if(!u) return
    try{
      const today=new Date().toISOString().split('T')[0]
      const ref=doc(db,'app_users',u.uid)
      // Use merge to NOT overwrite existing isAdmin field
      await setDoc(ref,{
        uid:u.uid,
        email:u.email,
        displayName:u.displayName||'',
        photoURL:u.photoURL||'',
        lastLogin:new Date().toISOString(),
        lastLoginDate:today,
      },{merge:true})
      // If first time, set isAdmin based on ADMIN_EMAILS
      const existingSnap=await getDocs(collection(db,'app_users')).catch(()=>null)
      let hasAdminField=false
      if(existingSnap){existingSnap.docs.forEach(d=>{if(d.id===u.uid&&d.data().isAdmin!==undefined)hasAdminField=true})}
      if(!hasAdminField){
        await setDoc(ref,{isAdmin:ADMIN_EMAILS.includes(u.email)},{merge:true})
      }
      // Track login days
      const loginRef=doc(db,'app_users',u.uid,'activity','logins')
      const actSnap=await getDocs(collection(db,'app_users',u.uid,'activity')).catch(()=>null)
      let loginDays=[]
      if(actSnap){actSnap.docs.forEach(d=>{if(d.data().loginDays)loginDays=d.data().loginDays})}
      if(!loginDays.includes(today))loginDays.push(today)
      await setDoc(loginRef,{loginDays,lastLogin:new Date().toISOString()},{merge:true})
    }catch(e){console.log('Track user error:',e)}
  }

  // Load all users (admin only)
  const loadAllUsers=async()=>{
    try{
      const snap=await getDocs(collection(db,'app_users'))
      return snap.docs.map(d=>({id:d.id,...d.data()}))
    }catch(e){console.log('Load users error:',e);return []}
  }

  // Toggle admin status — updates Firestore immediately
  const toggleAdmin=async(uid,email,currentStatus)=>{
    try{
      const newStatus=!currentStatus
      await setDoc(doc(db,'app_users',uid),{isAdmin:newStatus},{merge:true})
      // If toggling current user, update local state too
      if(user&&user.uid===uid){
        setIsAdmin(newStatus)
      }
      return true
    }catch(e){alert('Error: '+e.message);return false}
  }

  // Save word: admin → public (custom_words), user → private (users/{uid}/my_words)
  const saveWord=async(form,existingId)=>{
    try{
      if(existingId){
        // Edit existing — check if public or private
        const isPublicWord = publicWords.some(w=>w.fid===existingId)
        if(isPublicWord && isAdmin){
          await updateDoc(doc(db,'custom_words',existingId),{...form,updatedAt:new Date().toISOString()})
        }else if(user){
          await updateDoc(doc(db,'users',user.uid,'my_words',existingId),{...form,updatedAt:new Date().toISOString()})
        }
      }else{
        // New word
        if(isAdmin){
          // Admin: save to public collection
          await addDoc(collection(db,'custom_words'),{...form,createdAt:new Date().toISOString(),addedBy:user.email})
        }else if(user){
          // Normal user: save to private collection
          await addDoc(collection(db,'users',user.uid,'my_words'),{...form,createdAt:new Date().toISOString(),addedBy:user.email})
        }
      }
      await loadPublicWords()
      if(user) await loadMyWords(user.uid)
      return true
    }catch(e){alert('Save error: '+e.message);return false}
  }

  // Delete word
  const delWord=async(id)=>{
    try{
      const isPublicWord = publicWords.some(w=>w.fid===id)
      if(isPublicWord && isAdmin){
        await deleteDoc(doc(db,'custom_words',id))
      }else if(user){
        await deleteDoc(doc(db,'users',user.uid,'my_words',id))
      }
      await loadPublicWords()
      if(user) await loadMyWords(user.uid)
    }catch(e){alert('Delete error: '+e.message)}
  }

  const toggleLearned=useCallback(id=>{setLearned(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n})},[])

  // Combine: default 60 + public (admin) + my private words
  const allWords=useMemo(()=>[...myWords,...publicWords,...defaultVocab],[myWords,publicWords])
  const customWords=useMemo(()=>[...myWords,...publicWords],[myWords,publicWords])
  const allGroups=useMemo(()=>[...new Set(allWords.map(w=>w.group).filter(Boolean))],[allWords])

  return { user,isAdmin,allWords,customWords,allGroups,learned,groups,dark,setDark,login,logout,saveWord,delWord,toggleLearned,setGroups,loadAllUsers,toggleAdmin }
}

// ═══ GEMINI AI ═══
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY
async function aiGenerate(word, category) {
  console.log(`AI generating for: "${word}" (${category})`)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 400,
      messages: [{
        role: 'system',
        content: 'You are a vocabulary assistant for English learners. Always respond with ONLY valid JSON, no markdown, no backticks, no explanation.'
      }, {
        role: 'user',
        content: `For the English word "${word}" (category: ${category}), generate:
1. IPA phonetic transcription
2. A clear, simple English definition (1-2 sentences)
3. A practical example sentence using the word
4. Another natural example sentence

JSON format: {"phonetic":"/...IPA.../","def":"...","ex":"...","sentence":"..."}`
      }]
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('OpenAI error:', res.status, err)
    throw new Error(`OpenAI error ${res.status}: ${err?.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  console.log('AI raw response:', text)

  if (!text) throw new Error('Empty response from AI')

  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  const result = JSON.parse(clean)
  console.log('AI parsed:', result)
  return result
}

// ═══ ADMIN MODAL ═══
function AdminModal({onClose,onSave,editWord,groups}){
  const [form,setForm]=useState(editWord||{word:'',phonetic:'',cat:'general',group:'GD&T Basics',def:'',ex:'',sentence:''})
  const [saving,setSaving]=useState(false)
  const [generating,setGenerating]=useState(false)
  const [tab,setTab]=useState('word')
  const [newGroup,setNewGroup]=useState('')
  const inp={width:'100%',padding:'12px 14px',border:'1.5px solid var(--border)',borderRadius:'var(--r-md)',background:'var(--surface)',fontSize:14,color:'var(--text)',outline:'none',marginBottom:12,fontFamily:'inherit'}
  const lbl={fontSize:11,fontWeight:700,color:'var(--text-secondary)',letterSpacing:1,textTransform:'uppercase',marginBottom:4,display:'block'}

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
      console.error('AI error:', e)
      alert('AI generation failed: ' + e.message + '\n\nPlease check:\n1. Gemini API key is valid\n2. API is enabled at aistudio.google.com\n3. Try again in a few seconds\n\nYou can also fill fields manually.')
    }
    setGenerating(false)
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:'var(--surface)',borderRadius:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',boxShadow:'0 25px 50px rgba(0,0,0,.15)',animation:'scaleIn .2s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',padding:'20px 24px',borderRadius:'20px 20px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'white',fontWeight:800,fontSize:18}}>{editWord?'✏️ Edit':'➕ New Word'}</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.2)',border:'none',color:'white',width:32,height:32,borderRadius:'50%',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{display:'flex',borderBottom:'1.5px solid var(--border)'}}>
          {['word','groups'].map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:12,border:'none',background:tab===t?'var(--primary-light)':'transparent',color:tab===t?'var(--primary)':'var(--text-secondary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>{t==='word'?'📝 Word':'📁 Groups'}</button>)}
        </div>
        <div style={{padding:20}}>
          {tab==='word'?<>
            {/* Word input + AI Generate button */}
            <label style={lbl}>Word *</label>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input value={form.word} onChange={e=>setForm({...form,word:e.target.value})} placeholder="e.g. Tolerance" style={{...inp,flex:1,marginBottom:0}}
                onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleAI()}}}/>
              <button onClick={handleAI} disabled={generating||!form.word.trim()} style={{
                padding:'10px 16px',borderRadius:'var(--r-md)',border:'none',
                background:generating?'var(--border-light)':'linear-gradient(135deg, #f59e0b, #f97316)',
                color:'white',fontWeight:700,fontSize:12,cursor:generating?'wait':'pointer',
                boxShadow:generating?'none':'0 4px 14px rgba(245,158,11,.3)',
                whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6,
                transition:'all .2s',opacity:!form.word.trim()?.5:1,
              }}>
                {generating?<><span style={{display:'inline-block',animation:'spin 1s linear infinite',fontSize:14}}>⏳</span> Generating...</>:<>✨ AI Fill</>}
              </button>
            </div>

            {/* AI hint */}
            {!editWord&&<div style={{background:'var(--orange-light)',borderRadius:'var(--r-md)',padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--orange)',lineHeight:1.5,display:'flex',gap:8,alignItems:'flex-start'}}>
              <span style={{fontSize:16,flexShrink:0}}>💡</span>
              <span>Type a word and click <strong>✨ AI Fill</strong> — GPT-4o-mini will auto-generate IPA, definition, example, and sentence. You can edit any field after.</span>
            </div>}

            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}><label style={lbl}>IPA Phonetic</label><input value={form.phonetic} onChange={e=>setForm({...form,phonetic:e.target.value})} placeholder="/ˈtɒl.ər.əns/" style={inp}/></div>
              <div style={{flex:1}}><label style={lbl}>Category</label><select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} style={{...inp,cursor:'pointer'}}>{categories.filter(c=>c.key!=='all').map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            </div>
            <label style={lbl}>Group</label><select value={form.group||''} onChange={e=>setForm({...form,group:e.target.value})} style={{...inp,cursor:'pointer'}}>{groups.map(g=><option key={g} value={g}>{g}</option>)}</select>
            <label style={lbl}>Definition *</label><textarea value={form.def} onChange={e=>setForm({...form,def:e.target.value})} rows={3} style={{...inp,resize:'vertical'}} placeholder="Clear English definition..."/>
            <label style={lbl}>Example</label><textarea value={form.ex||''} onChange={e=>setForm({...form,ex:e.target.value})} rows={2} style={{...inp,resize:'vertical'}} placeholder="Real-world engineering example..."/>
            <label style={lbl}>Sentence</label><textarea value={form.sentence||''} onChange={e=>setForm({...form,sentence:e.target.value})} rows={2} style={{...inp,resize:'vertical'}} placeholder="Example sentence using the word..."/>
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <Button variant="outline" full onClick={onClose}>Cancel</Button>
              <Button variant="blue" full onClick={async()=>{if(!form.word||!form.def)return alert('Word & Definition required!');setSaving(true);const ok=await onSave(form,editWord?.fid);setSaving(false);if(ok)onClose()}} disabled={saving}>{saving?'Saving...':editWord?'Update':'Add Word'}</Button>
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

// ═══ TOP BAR (Desktop) ═══
function TopBar({user,isAdmin,login,logout,title,subtitle}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20,padding:'0 4px'}}>
      <div style={{flex:1}}>
        <div style={{fontSize:24,fontWeight:800,color:'var(--text-dark)'}}>{title||'Dashboard'}</div>
        {subtitle&&<div style={{fontSize:13,color:'var(--text-secondary)',marginTop:2}}>{subtitle}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        {user?<>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:'var(--r-full)',padding:'4px 14px 4px 4px'}}>
            {user.photoURL&&<img src={user.photoURL} alt="" style={{width:30,height:30,borderRadius:'50%'}}/>}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text-dark)'}}>{user.displayName?.split(' ')[0]}</div>
              {isAdmin&&<div style={{fontSize:9,color:'var(--primary)',fontWeight:700,letterSpacing:1}}>ADMIN</div>}
            </div>
          </div>
          <button onClick={logout} style={{padding:'8px 14px',borderRadius:'var(--r-full)',border:'1.5px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Sign out</button>
        </>:<button onClick={login} style={{padding:'8px 18px',borderRadius:'var(--r-full)',border:'none',background:'var(--primary)',color:'white',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'var(--shadow-primary)'}}>Sign in with Google</button>}
      </div>
    </div>
  )
}

// ═══ PAGE: HOME ═══
function DecksPage({state}){
  const nav=useNavigate()
  const desk=useIsDesktop()
  const {allWords,allGroups,learned,user,isAdmin,login,logout,dark,setDark}=state
  const todayWord=allWords[new Date().getDate()%allWords.length]
  const pct=allWords.length>0?Math.round(learned.size/allWords.length*100):0

  return(
    <div style={{maxWidth:desk?1200:600,margin:'0 auto',padding:desk?'24px 32px':'0 16px 24px'}}>
      {/* Desktop: TopBar | Mobile: Hero gradient */}
      {desk?
        <TopBar user={user} isAdmin={isAdmin} login={login} logout={logout}
          title="Dashboard" subtitle={new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}/>
      :
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
        </div>
      }

      {/* Desktop: 2-column layout | Mobile: stacked */}
      <div style={{display:desk?'grid':'block',gridTemplateColumns:desk?'1fr 1fr':'1fr',gap:24}}>
        {/* Left column */}
        <div>
          {/* Stats */}
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
          {/* Progress */}
          <div style={{background:'var(--surface)',borderRadius:16,padding:'18px 20px',marginBottom:20,boxShadow:'var(--shadow-sm)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:14,fontWeight:700}}>Learning Progress</span>
              <span style={{fontSize:14,fontWeight:800,color:'var(--primary)'}}>{learned.size}/{allWords.length}</span>
            </div>
            <div style={{height:10,background:'var(--border-light)',borderRadius:5,overflow:'hidden'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg, var(--primary), var(--accent))',width:pct+'%',transition:'width .5s',borderRadius:5}}/>
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{fontSize:16,fontWeight:800,marginBottom:12,color:'var(--text-dark)'}}>Quick actions</div>
          <div style={{display:'grid',gridTemplateColumns:desk?'1fr 1fr':'1fr 1fr',gap:12,marginBottom:20}}>
            {[
              {icon:'📇',title:'Browse Cards',desc:'Study vocabulary',fn:()=>nav('/cards')},
              {icon:'⚡',title:'Flashcards',desc:'Quick memory test',fn:()=>nav('/cards?mode=flash')},
              {icon:'🧠',title:'Take Quiz',desc:'Challenge yourself',fn:()=>nav('/cards?mode=quiz')},
              ...(user?[{icon:'➕',title:'Add Word',desc:isAdmin?'Public word':'My word',fn:()=>nav('/create'),accent:true}]:[]),
              ...(isAdmin?[{icon:'🛡️',title:'Admin Panel',desc:'Manage users',fn:()=>nav('/admin')}]:[]),
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

        {/* Right column (desktop) / below (mobile) */}
        <div>
          {/* Today's Word */}
          {todayWord&&<div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:20,padding:'22px 20px',marginBottom:20,color:'white',boxShadow:'var(--shadow-primary)',animation:'slideUp .4s ease .1s both'}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,opacity:.6,marginBottom:12,textTransform:'uppercase'}}>✨ Today's word!</div>
            <div style={{background:'rgba(255,255,255,.12)',borderRadius:14,padding:'16px 18px',marginBottom:14}}>
              <div style={{fontSize:24,fontWeight:900,marginBottom:2}}>{todayWord.word}</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:12,opacity:.7,fontFamily:'monospace'}}>{todayWord.phonetic}</span>
                <button onClick={()=>speak(todayWord.word)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.2)',color:'white',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔊</button>
              </div>
            </div>
            <div style={{fontSize:13,lineHeight:1.7,opacity:.85,marginBottom:14}}>✨ {todayWord.def}</div>
            {todayWord.ex&&<div style={{fontSize:12,opacity:.6,fontStyle:'italic',marginBottom:14}}>💡 {todayWord.ex}</div>}
            <Button variant="secondary" onClick={()=>nav('/cards')} style={{background:'white',color:'var(--primary)'}}>See all words →</Button>
          </div>}

          {/* Recent words preview (desktop only) */}
          {desk&&<>
            <div style={{fontSize:16,fontWeight:800,marginBottom:12,color:'var(--text-dark)'}}>Recent words</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {allWords.slice(0,6).map((v,i)=>(
                <div key={v.id||v.fid} onClick={()=>nav('/cards')} style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',boxShadow:'var(--shadow-sm)',cursor:'pointer',transition:'transform .2s',animation:`fadeIn .3s ease ${i*.04}s both`}}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                  <span style={{background:catColor(v.cat)+'18',color:catColor(v.cat),fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20}}>{v.cat}</span>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--text-dark)',marginTop:6}}>{v.word}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:4,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{v.def}</div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}

// ═══ PAGE: CARDS ═══
function CardsPage({state}){
  const nav=useNavigate()
  const desk=useIsDesktop()
  const loc=useLocation()
  const params=new URLSearchParams(loc.search)
  const initMode=params.get('mode')||'card'
  const {allWords,allGroups,learned,toggleLearned,isAdmin,delWord,dark,setDark,user,login,logout}=state
  const [mode,setMode]=useState(initMode)
  const [search,setSearch]=useState('')
  const [cat,setCat]=useState(params.get('cat')||'all')
  const [groupF,setGroupF]=useState('all')
  const [showAdmin,setShowAdmin]=useState(false)
  const [editWord,setEditWord]=useState(null)
  const filtered=useMemo(()=>allWords.filter(v=>(cat==='all'||v.cat===cat)&&(groupF==='all'||v.group===groupF)&&(!search||v.word.toLowerCase().includes(search.toLowerCase())||v.def.toLowerCase().includes(search.toLowerCase()))),[cat,groupF,search,allWords])

  return(
    <div style={{maxWidth:desk?1200:1000,margin:'0 auto',padding:desk?'24px 32px':'16px 16px 24px'}}>
      {desk?
        <TopBar user={user} isAdmin={isAdmin} login={login} logout={logout}
          title="Vocabulary" subtitle={`${filtered.length} words · ${learned.size} learned`}/>
      :
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <button onClick={()=>nav('/')} style={{width:40,height:40,borderRadius:'50%',border:'none',background:'var(--surface)',color:'var(--text)',fontSize:18,cursor:'pointer',boxShadow:'var(--shadow-sm)',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
          <div style={{flex:1}}><div style={{fontSize:20,fontWeight:800,color:'var(--text-dark)'}}>Vocabulary</div><div style={{fontSize:11,color:'var(--text-secondary)'}}>{filtered.length} words · {learned.size} learned</div></div>
          {user&&<Button variant="primary" size="sm" onClick={()=>{setEditWord(null);setShowAdmin(true)}}>➕ Add</Button>}
        </div>
      }

      {/* Search + Mode — side by side on desktop */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200,position:'relative'}}>
          <span style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--text-light)'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search words..." style={{width:'100%',padding:'14px 16px 14px 44px',borderRadius:14,border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:14,color:'var(--text)',outline:'none'}}/>
        </div>
        <div style={{display:'flex',background:'var(--surface)',borderRadius:14,padding:4,boxShadow:'var(--shadow-sm)'}}>
          {[{k:'card',l:'📇 Cards'},{k:'flash',l:'⚡ Flash'},{k:'quiz',l:'🧠 Quiz'},{k:'table',l:'📊 Table'}].map(m=>(
            <button key={m.k} onClick={()=>setMode(m.k)} style={{padding:'10px 14px',borderRadius:10,border:'none',background:mode===m.k?'var(--primary)':'transparent',color:mode===m.k?'white':'var(--text-secondary)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .2s',whiteSpace:'nowrap'}}>{m.l}</button>
          ))}
        </div>
        {desk&&user&&<Button variant="primary" size="sm" onClick={()=>{setEditWord(null);setShowAdmin(true)}}>➕ Add word</Button>}
      </div>

      {/* Filters */}
      {mode!=='quiz'&&<>
        {allGroups.length>1&&<div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          <button onClick={()=>setGroupF('all')} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${groupF==='all'?'var(--primary)':'var(--border)'}`,background:groupF==='all'?'var(--primary-light)':'transparent',color:groupF==='all'?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer'}}>All Groups</button>
          {allGroups.map(g=><button key={g} onClick={()=>setGroupF(g)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${groupF===g?'var(--primary)':'var(--border)'}`,background:groupF===g?'var(--primary-light)':'transparent',color:groupF===g?'var(--primary)':'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{g}</button>)}
        </div>}
        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
          {categories.map(c=><button key={c.key} onClick={()=>setCat(c.key)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${cat===c.key?c.color:'var(--border)'}`,background:cat===c.key?c.color+'15':'transparent',color:cat===c.key?c.color:'var(--text-secondary)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{c.label}</button>)}
        </div>
      </>}

      {/* Word cards — 2 cols mobile, 3-4 cols desktop */}
      {mode==='card'&&(filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--text-secondary)'}}>No words found</div>:
        <div style={{display:'grid',gridTemplateColumns:desk?'repeat(auto-fill,minmax(280px,1fr))':'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
          {filtered.map((v,i)=>{
            const isL=learned.has(v.id||v.fid)
            return(
              <div key={v.fid||v.id} style={{background:'var(--surface)',borderRadius:16,padding:'16px 18px',boxShadow:'var(--shadow-sm)',cursor:'pointer',transition:'transform .2s, box-shadow .2s',animation:`fadeIn .3s ease ${Math.min(i*.03,.3)}s both`,position:'relative'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='var(--shadow-md)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='var(--shadow-sm)'}}>
                {v.fromFS&&<div style={{position:'absolute',top:12,right:12,background:v.isPrivate?'var(--purple)':'var(--green)',color:'white',fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>{v.isPrivate?'MY WORD':'PUBLIC'}</div>}
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
                  {((isAdmin&&v.fromFS)||(v.isPrivate))&&<>
                    <button onClick={e=>{e.stopPropagation();setEditWord(v);setShowAdmin(true)}} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'var(--primary-light)',color:'var(--primary)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>
                    <button onClick={e=>{e.stopPropagation();if(confirm('Delete?'))delWord(v.fid)}} style={{width:36,height:36,borderRadius:'50%',border:'none',background:'var(--pink-light)',color:'var(--accent)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {mode==='flash'&&<FlashView words={filtered} desk={desk}/>}
      {mode==='quiz'&&<QuizView words={filtered} onFinish={()=>setMode('card')} desk={desk}/>}
      {mode==='table'&&<TableView words={filtered} learned={learned}/>}
      {showAdmin&&<AdminModal onClose={()=>{setShowAdmin(false);setEditWord(null)}} onSave={state.saveWord} editWord={editWord} groups={state.groups}/>}
    </div>
  )
}

// ═══ FLASH ═══
function FlashView({words,desk}){
  const [i,setI]=useState(0),[f,setF]=useState(false)
  useEffect(()=>setF(false),[i])
  const w=words[i]; if(!w) return <div style={{textAlign:'center',padding:40}}>No words</div>
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,padding:'20px 0',maxWidth:desk?560:'100%',margin:'0 auto'}}>
      <div style={{fontSize:14,color:'var(--text-secondary)',fontWeight:600}}>Card {i+1} of {words.length}</div>
      <div onClick={()=>setF(!f)} style={{width:'100%',maxWidth:520,minHeight:300,cursor:'pointer',perspective:1000}}>
        <div style={{width:'100%',minHeight:300,transition:'transform .6s',transformStyle:'preserve-3d',position:'relative',transform:f?'rotateY(180deg)':'none'}}>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:20,padding:'40px 32px',display:'flex',flexDirection:'column',justifyContent:'center',minHeight:300,boxShadow:'var(--shadow-primary)'}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.5)',fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:20}}>Tap to reveal →</div>
            <div style={{fontSize:36,fontWeight:900,color:'white',marginBottom:8}}>{w.word}</div>
            <span style={{background:'rgba(255,255,255,.15)',color:'white',fontSize:11,padding:'4px 12px',borderRadius:20,fontWeight:600,alignSelf:'flex-start',marginBottom:10}}>{w.cat}</span>
            <div style={{fontSize:14,color:'rgba(255,255,255,.6)',fontFamily:'monospace'}}>{w.phonetic}</div>
          </div>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',background:'var(--surface)',borderRadius:20,padding:'40px 32px',display:'flex',flexDirection:'column',justifyContent:'center',minHeight:300,boxShadow:'var(--shadow-md)'}}>
            <div style={{fontSize:12,color:'var(--text-secondary)',fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:16}}>Definition</div>
            <div style={{fontSize:17,color:'var(--text)',lineHeight:1.8,marginBottom:16}}>{w.def}</div>
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

// ═══ QUIZ ═══
function QuizView({words,onFinish,desk}){
  const [qs]=useState(()=>makeQuiz(words.length>=4?words:defaultVocab))
  const [c,setC]=useState(0),[s,setS]=useState(null),[sc,setSc]=useState(0),[log,setLog]=useState([]),[done,setDone]=useState(false)
  if(done){const p=sc/qs.length;return(
    <div style={{maxWidth:520,margin:'0 auto',padding:20}}>
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
    <div style={{maxWidth:520,margin:'0 auto',padding:16}}>
      <div style={{textAlign:'center',fontSize:14,color:'var(--text-secondary)',fontWeight:600,marginBottom:16}}>Q {c+1}/{qs.length}</div>
      <div style={{background:'var(--surface)',borderRadius:16,padding:'24px 20px',marginBottom:16,boxShadow:'var(--shadow-sm)'}}>
        <div style={{fontSize:11,color:'var(--primary)',fontWeight:700,letterSpacing:2,marginBottom:8,textTransform:'uppercase'}}>Which word?</div>
        <div style={{fontSize:15,color:'var(--text)',lineHeight:1.7}}>{q.def}</div>
      </div>
      <div style={{display:'grid',gap:8,gridTemplateColumns:desk?'1fr 1fr':'1fr'}}>
        {q.options.map((o,i)=>{const pk=s===o,co=o===q.answer,sh=s!==null;let bg='var(--surface)',bc='var(--border)';if(sh&&co){bg='var(--green-light)';bc='var(--green)'}else if(sh&&pk&&!co){bg='var(--pink-light)';bc='var(--accent)'};return(
          <button key={i} disabled={sh} onClick={()=>{setS(o);const ok=o===q.answer;if(ok)setSc(x=>x+1);setLog(l=>[...l,{answer:q.answer,picked:o,ok}]);setTimeout(()=>{if(c<qs.length-1){setC(x=>x+1);setS(null)}else setDone(true)},1000)}} style={{padding:'14px 18px',borderRadius:14,border:`1.5px solid ${bc}`,background:bg,fontSize:14,fontWeight:700,cursor:sh?'default':'pointer',textAlign:'left',color:'var(--text)',transition:'all .2s'}}>{o}{sh&&co&&' ✓'}{sh&&pk&&!co&&' ✗'}</button>
        )})}
      </div>
      <div style={{marginTop:14,height:6,background:'var(--border-light)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',background:'linear-gradient(90deg, var(--primary), var(--accent))',width:`${((c+1)/qs.length)*100}%`,transition:'width .3s',borderRadius:3}}/></div>
    </div>
  )
}

// ═══ TABLE ═══
function TableView({words,learned}){
  return(
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'separate',borderSpacing:0,background:'var(--surface)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-sm)',fontSize:13}}>
        <thead><tr>{['#','Word','Cat','Definition'].map(h=><th key={h} style={{background:'var(--primary)',color:'white',fontWeight:700,fontSize:11,letterSpacing:1,textTransform:'uppercase',padding:'14px 16px',textAlign:'left'}}>{h}</th>)}</tr></thead>
        <tbody>{words.map((v,i)=><tr key={v.fid||v.id}>
          <td style={{padding:'12px 16px',color:'var(--text-light)',borderBottom:'1px solid var(--border-light)'}}>{i+1}</td>
          <td style={{padding:'12px 16px',borderBottom:'1px solid var(--border-light)'}}><div style={{fontWeight:700,color:'var(--text-dark)'}}>{v.word}</div><div style={{fontSize:11,color:'var(--primary)',fontFamily:'monospace'}}>{v.phonetic}</div></td>
          <td style={{padding:'12px 16px',borderBottom:'1px solid var(--border-light)'}}><span style={{fontSize:11,color:catColor(v.cat),background:catColor(v.cat)+'15',padding:'3px 8px',borderRadius:10,fontWeight:600}}>{v.cat}</span></td>
          <td style={{padding:'12px 16px',color:'var(--text-secondary)',lineHeight:1.6,borderBottom:'1px solid var(--border-light)',maxWidth:400}}>{v.def}</td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}

// ═══ CREATE DECK ═══
function CreateDeckPage({state}){
  const nav=useNavigate()
  const desk=useIsDesktop()
  const [showAdmin,setShowAdmin]=useState(false)
  return(
    <div style={{maxWidth:desk?900:600,margin:'0 auto',padding:desk?'24px 32px':'24px 16px'}}>
      {desk&&<TopBar user={state.user} isAdmin={state.isAdmin} login={state.login} logout={state.logout} title="Create a deck" subtitle="Choose how to build your vocabulary"/>}
      {!desk&&<><div style={{fontSize:28,fontWeight:900,color:'var(--text-dark)',marginBottom:8}}>Create a deck</div><div style={{fontSize:14,color:'var(--text-secondary)',marginBottom:24}}>Choose how you want to build your vocabulary</div></>}
      <div style={{display:desk?'grid':'block',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <DeckCard variant="ai" icon="✨" title="AI Generated" description="Let AI create flashcards from any topic or text you provide" buttonText="Generate with AI" onAction={()=>alert('Coming soon!')} style={{marginBottom:desk?0:16,animationDelay:'.05s'}}/>
        <DeckCard variant="manual" icon="🎯" title="Create own cards" description="Manually add your own vocabulary words and definitions" buttonText="Start creating" onAction={()=>{if(state.isAdmin)setShowAdmin(true);else if(!state.user)state.login();else alert('Only admin can add words')}} style={{animationDelay:'.1s'}}/>
      </div>
      {showAdmin&&<AdminModal onClose={()=>setShowAdmin(false)} onSave={state.saveWord} groups={state.groups}/>}
    </div>
  )
}

// ═══ BROWSE ═══
function BrowsePage({state}){
  const nav=useNavigate()
  const desk=useIsDesktop()
  return(
    <div style={{maxWidth:desk?1000:600,margin:'0 auto',padding:desk?'24px 32px':'24px 16px'}}>
      {desk?<TopBar user={state.user} isAdmin={state.isAdmin} login={state.login} logout={state.logout} title="Browse" subtitle="Explore vocabulary by category"/>
      :<><div style={{fontSize:28,fontWeight:900,color:'var(--text-dark)',marginBottom:8}}>Browse</div><div style={{fontSize:14,color:'var(--text-secondary)',marginBottom:24}}>Explore vocabulary by category</div></>}
      <div style={{display:'grid',gridTemplateColumns:desk?'repeat(auto-fill,minmax(200px,1fr))':'1fr 1fr',gap:12}}>
        {categories.filter(c=>c.key!=='all').map((c,i)=>{
          const count=state.allWords.filter(w=>w.cat===c.key).length
          return <DeckCard key={c.key} variant={i%2===0?'ai':'manual'} icon={c.key==='general'?'📋':c.key==='tolerance'?'📐':c.key==='datum'?'📍':c.key==='symbol'?'⊕':c.key==='measurement'?'📏':c.key==='drawing'?'✏️':'🔧'} title={c.label} description={`${count} words`} count={count} learned={[...state.learned].filter(id=>state.allWords.find(w=>(w.id||w.fid)===id&&w.cat===c.key)).length} onAction={()=>nav(`/cards?cat=${c.key}`)} style={{animationDelay:i*.05+'s'}}/>
        })}
      </div>
    </div>
  )
}

// ═══ ANALYTICS ═══
function AnalyticsPage({state}){
  const desk=useIsDesktop()
  const {allWords,learned,allGroups}=state
  const pct=allWords.length>0?Math.round(learned.size/allWords.length*100):0
  const catStats=categories.filter(c=>c.key!=='all').map(c=>{const total=allWords.filter(w=>w.cat===c.key).length;const done=[...learned].filter(id=>allWords.find(w=>(w.id||w.fid)===id&&w.cat===c.key)).length;return{...c,total,done,pct:total>0?Math.round(done/total*100):0}})
  return(
    <div style={{maxWidth:desk?1000:600,margin:'0 auto',padding:desk?'24px 32px':'24px 16px'}}>
      {desk?<TopBar user={state.user} isAdmin={state.isAdmin} login={state.login} logout={state.logout} title="Analytics" subtitle="Track your learning progress"/>
      :<div style={{background:'linear-gradient(135deg, var(--primary), #7c3aed)',borderRadius:20,padding:'28px 24px',marginBottom:20,color:'white'}}>
        <div style={{fontSize:24,fontWeight:900,marginBottom:4}}>Your <span style={{color:'#fbbf24'}}>Stats</span></div>
        <div style={{fontSize:13,opacity:.6}}>Track your learning progress</div>
      </div>}
      <div style={{display:'grid',gridTemplateColumns:desk?'1fr 1fr 1fr':'1fr 1fr 1fr',gap:12,marginBottom:24}}>
        {[{n:pct+'%',l:'Retention',icon:'🎯',c:'var(--primary)'},{n:learned.size,l:'Learned',icon:'✅',c:'var(--green)'},{n:allWords.length-learned.size,l:'Remaining',icon:'📚',c:'var(--orange)'}].map((s,i)=>(
          <div key={i} style={{background:'var(--surface)',borderRadius:16,padding:'18px 14px',textAlign:'center',boxShadow:'var(--shadow-sm)',animation:`fadeIn .3s ease ${i*.08}s both`}}>
            <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.n}</div>
            <div style={{fontSize:10,color:'var(--text-secondary)',fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:16,fontWeight:800,marginBottom:12,color:'var(--text-dark)'}}>By category</div>
      <div style={{display:desk?'grid':'block',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {catStats.map((c,i)=>(
          <div key={c.key} style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',marginBottom:desk?0:8,boxShadow:'var(--shadow-sm)',animation:`fadeIn .3s ease ${i*.05}s both`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{background:c.color+'18',color:c.color,fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20}}>{c.label}</span>
              <span style={{fontSize:12,fontWeight:700,color:c.color}}>{c.done}/{c.total}</span>
            </div>
            <div style={{height:6,background:'var(--border-light)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',background:c.color,width:c.pct+'%',transition:'width .5s',borderRadius:3}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══ PAGE: ADMIN DASHBOARD ═══
function AdminDashPage({state}){
  const desk=useIsDesktop()
  const {user,isAdmin,allWords,learned,dark,setDark,login,logout,loadAllUsers,toggleAdmin}=state
  const [users,setUsers]=useState([])
  const [userStats,setUserStats]=useState([])
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState('overview')

  useEffect(()=>{if(isAdmin)loadData()},[isAdmin])

  const loadData=async()=>{
    setLoading(true)
    try{
      const allU=await loadAllUsers()
      setUsers(allU)
      const stats=[]
      for(const u of allU){
        try{
          const wordsSnap=await getDocs(collection(db,'users',u.uid,'my_words')).catch(()=>null)
          const progressSnap=await getDocs(collection(db,'users',u.uid,'progress')).catch(()=>null)
          const activitySnap=await getDocs(collection(db,'app_users',u.uid,'activity')).catch(()=>null)
          let wordCount=0,learnedCount=0,loginDays=[]
          if(wordsSnap)wordCount=wordsSnap.size
          if(progressSnap)progressSnap.docs.forEach(d=>{if(d.data().words)learnedCount=d.data().words.length})
          if(activitySnap)activitySnap.docs.forEach(d=>{if(d.data().loginDays)loginDays=d.data().loginDays})
          stats.push({...u,wordCount,learnedCount,loginDays,totalLogins:loginDays.length})
        }catch{stats.push({...u,wordCount:0,learnedCount:0,loginDays:[],totalLogins:0})}
      }
      setUserStats(stats)
    }catch(e){console.log('Admin load error:',e)}
    setLoading(false)
  }

  const totalUsers=userStats.length
  const totalCustomWords=userStats.reduce((s,u)=>s+u.wordCount,0)
  const totalLearned=userStats.reduce((s,u)=>s+u.learnedCount,0)
  const todayLogins=userStats.filter(u=>u.loginDays?.includes(new Date().toISOString().split('T')[0])).length
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.toISOString().split('T')[0];return{date:ds,day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],count:userStats.filter(u=>u.loginDays?.includes(ds)).length}})
  const maxLogin=Math.max(...last7.map(d=>d.count),1)

  if(!isAdmin) return(<div style={{maxWidth:600,margin:'0 auto',padding:'60px 16px',textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>🔒</div><div style={{fontSize:20,fontWeight:800,color:'var(--text-dark)',marginBottom:8}}>Admin only</div><div style={{fontSize:14,color:'var(--text-secondary)'}}>This page is restricted to administrators.</div></div>)

  return(
    <div style={{maxWidth:desk?1200:600,margin:'0 auto',padding:desk?'24px 32px':'16px 16px 24px'}}>
      {desk?<TopBar user={user} isAdmin={isAdmin} login={login} logout={logout} title="Admin Dashboard" subtitle={`${totalUsers} users · ${totalCustomWords} custom words`}/>
      :<><div style={{fontSize:24,fontWeight:900,color:'var(--text-dark)',marginBottom:4}}>Admin Dashboard</div><div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:20}}>{totalUsers} users · {totalCustomWords} custom words</div></>}

      {loading?<div style={{textAlign:'center',padding:60,color:'var(--text-secondary)'}}>Loading...</div>:<>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:desk?'1fr 1fr 1fr 1fr':'1fr 1fr',gap:12,marginBottom:24}}>
        {[{icon:'👥',n:totalUsers,l:'Total Users',c:'var(--primary)',bg:'var(--primary-light)'},{icon:'📝',n:totalCustomWords,l:'Custom Words',c:'var(--purple)',bg:'var(--purple-light)'},{icon:'✅',n:totalLearned,l:'Words Learned',c:'var(--green)',bg:'var(--green-light)'},{icon:'📅',n:todayLogins,l:'Logins Today',c:'var(--orange)',bg:'var(--orange-light)'}].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:16,padding:'18px 16px',animation:`fadeIn .3s ease ${i*.08}s both`}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:28,fontWeight:900,color:s.c}}>{s.n}</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',fontWeight:600,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'var(--surface)',borderRadius:14,padding:4,marginBottom:20,boxShadow:'var(--shadow-sm)'}}>
        {[{k:'overview',l:'📊 Overview'},{k:'users',l:'👥 Users'},{k:'activity',l:'📅 Activity'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:'10px 8px',borderRadius:10,border:'none',background:tab===t.k?'var(--primary)':'transparent',color:tab===t.k?'white':'var(--text-secondary)',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .2s'}}>{t.l}</button>
        ))}
      </div>

      {tab==='overview'&&<div style={{display:desk?'grid':'block',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{background:'var(--surface)',borderRadius:16,padding:20,boxShadow:'var(--shadow-sm)',marginBottom:desk?0:16}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text-dark)',marginBottom:16}}>Logins (last 7 days)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
            {last7.map((d,i)=>(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--primary)'}}>{d.count}</span>
              <div style={{width:'100%',background:'linear-gradient(180deg, var(--primary), var(--purple))',borderRadius:6,height:`${Math.max((d.count/maxLogin)*100,4)}%`,minHeight:4,opacity:d.count>0?1:.2}}/>
              <span style={{fontSize:10,color:'var(--text-light)'}}>{d.day}</span>
            </div>))}
          </div>
        </div>
        <div style={{background:'var(--surface)',borderRadius:16,padding:20,boxShadow:'var(--shadow-sm)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text-dark)',marginBottom:16}}>Top Learners</div>
          {userStats.sort((a,b)=>b.learnedCount-a.learnedCount).slice(0,5).map((u,i)=>(
            <div key={u.uid} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<4?'1px solid var(--border-light)':'none'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'var(--primary-light)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--primary)'}}>
                {u.photoURL?<img src={u.photoURL} alt="" style={{width:28,height:28}}/>:(u.displayName?.[0]||'?')}
              </div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'var(--text-dark)'}}>{u.displayName||u.email}</div><div style={{fontSize:10,color:'var(--text-secondary)'}}>{u.learnedCount} learned · {u.wordCount} added</div></div>
              <div style={{fontSize:16,fontWeight:800,color:'var(--primary)'}}>{u.learnedCount}</div>
            </div>
          ))}
        </div>
      </div>}

      {tab==='users'&&<div style={{background:'var(--surface)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
        <div style={{display:'grid',gridTemplateColumns:desk?'2fr 1fr 1fr 1fr 100px':'2fr 1fr 80px',gap:8,padding:'14px 18px',background:'var(--primary)',color:'white',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>
          <span>User</span>{desk&&<span>Words</span>}<span>Learned</span>{desk&&<span>Last Login</span>}<span>Role</span>
        </div>
        {userStats.map((u,i)=>(
          <div key={u.uid} style={{display:'grid',gridTemplateColumns:desk?'2fr 1fr 1fr 1fr 100px':'2fr 1fr 80px',gap:8,padding:'12px 18px',borderBottom:'1px solid var(--border-light)',alignItems:'center',animation:`fadeIn .3s ease ${i*.04}s both`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--primary)',flexShrink:0}}>{u.photoURL?<img src={u.photoURL} alt="" style={{width:32,height:32}}/>:(u.displayName?.[0]||'?')}</div>
              <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:'var(--text-dark)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.displayName||'No name'}</div><div style={{fontSize:10,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div></div>
            </div>
            {desk&&<span style={{fontSize:14,fontWeight:600,color:'var(--purple)'}}>{u.wordCount}</span>}
            <span style={{fontSize:14,fontWeight:600,color:'var(--green)'}}>{u.learnedCount}</span>
            {desk&&<span style={{fontSize:11,color:'var(--text-secondary)'}}>{u.lastLogin?new Date(u.lastLogin).toLocaleDateString():'-'}</span>}
            <button onClick={async()=>{await toggleAdmin(u.uid,u.email,u.isAdmin);setUserStats(prev=>prev.map(x=>x.uid===u.uid?{...x,isAdmin:!x.isAdmin}:x))}} style={{padding:'5px 10px',borderRadius:20,border:'none',fontSize:10,fontWeight:700,cursor:'pointer',background:u.isAdmin?'var(--primary)':'var(--border-light)',color:u.isAdmin?'white':'var(--text-secondary)'}}>{u.isAdmin?'Admin':'User'}</button>
          </div>
        ))}
      </div>}

      {tab==='activity'&&<div>
        <div style={{background:'var(--surface)',borderRadius:16,padding:20,boxShadow:'var(--shadow-sm)',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text-dark)',marginBottom:16}}>Daily Logins (30 days)</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:4,height:160,overflowX:'auto',paddingBottom:8}}>
            {Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);const ds=d.toISOString().split('T')[0];const count=userStats.filter(u=>u.loginDays?.includes(ds)).length;const maxC=Math.max(...Array.from({length:30},(_,j)=>{const dd=new Date();dd.setDate(dd.getDate()-29+j);return userStats.filter(u=>u.loginDays?.includes(dd.toISOString().split('T')[0])).length}),1);return(
              <div key={i} style={{flex:'0 0 auto',width:20,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span style={{fontSize:9,color:'var(--primary)',fontWeight:600}}>{count||''}</span>
                <div style={{width:16,background:count>0?'linear-gradient(180deg, var(--primary), var(--purple))':'var(--border-light)',borderRadius:4,height:`${Math.max((count/maxC)*120,4)}px`}}/>
                <span style={{fontSize:7,color:'var(--text-light)'}}>{d.getDate()}/{d.getMonth()+1}</span>
              </div>
            )})}
          </div>
        </div>
        <div style={{background:'var(--surface)',borderRadius:16,padding:20,boxShadow:'var(--shadow-sm)'}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text-dark)',marginBottom:16}}>Recent Logins</div>
          {userStats.sort((a,b)=>new Date(b.lastLogin||0)-new Date(a.lastLogin||0)).slice(0,10).map((u,i)=>(
            <div key={u.uid} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<9?'1px solid var(--border-light)':'none'}}>
              <div style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--primary)'}}>{u.photoURL?<img src={u.photoURL} alt="" style={{width:28,height:28}}/>:(u.displayName?.[0]||'?')}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'var(--text-dark)'}}>{u.displayName||u.email}</div></div>
              <div style={{fontSize:11,color:'var(--text-secondary)'}}>{u.lastLogin?new Date(u.lastLogin).toLocaleString():'-'}</div>
            </div>
          ))}
        </div>
      </div>}

      </>}
    </div>
  )
}

// ═══ ROUTER ═══
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
        <Route path="/admin" element={<AdminDashPage state={state}/>}/>
      </Routes>
      <Navbar onToggleTheme={()=>state.setDark(!state.dark)} isAdmin={state.isAdmin}/>
    </>
  )
}

export default function App(){
  return <BrowserRouter><AppInner/></BrowserRouter>
}
