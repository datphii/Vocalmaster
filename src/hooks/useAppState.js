import { useState, useEffect, useCallback, useMemo } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, deleteDoc, updateDoc, setDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db, googleProvider, ADMIN_EMAILS } from '../firebase.js'
import { defaultVocab } from '../data/vocab.js'
import { LS } from '../utils/index.js'

export function useAppState() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [publicWords, setPublicWords] = useState([])
  const [myWords, setMyWords] = useState([])
  const [learned, setLearned] = useState(() => new Set(LS.get('learned', [])))
  const [groups, setGroups] = useState(() => LS.get('groups', ['GD&T Basics']))
  const [dark, setDark] = useState(() => LS.get('dark', false))

  useEffect(() => {
    let adminUnsub = null
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (adminUnsub) { adminUnsub(); adminUnsub = null }
      if (u) {
        loadUserLearned(u.uid); loadMyWords(u.uid); trackUserLogin(u)
        adminUnsub = onSnapshot(doc(db, 'app_users', u.uid), (snap) => {
          const newAdmin = snap.exists() ? snap.data().isAdmin === true : ADMIN_EMAILS.includes(u.email)
          setIsAdmin(prev => prev === newAdmin ? prev : newAdmin)
        })
      } else {
        setMyWords([]); setIsAdmin(false); setLearned(new Set(LS.get('learned', [])))
      }
    })
    return () => { unsub(); if (adminUnsub) adminUnsub() }
  }, [])

  useEffect(() => { loadPublicWords() }, [])

  useEffect(() => {
    LS.set('dark', dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    LS.set('learned', [...learned])
    if (user) {
      const ref = doc(db, 'users', user.uid, 'progress', 'learned')
      setDoc(ref, { words: [...learned], updatedAt: new Date().toISOString() }, { merge: true })
        .catch(e => console.log('Learned sync:', e))
    }
  }, [learned, user])

  const loadPublicWords = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'custom_words'), orderBy('createdAt', 'desc')))
      const w = snap.docs.map(d => ({ ...d.data(), fid: d.id, fromFS: true, isPublic: true }))
      setPublicWords(w)
      const fg = [...new Set(w.map(x => x.group).filter(Boolean))]
      setGroups([...new Set(['GD&T Basics', ...LS.get('groups', []), ...fg])])
    } catch (e) { console.log('Public words error:', e) }
  }

  const loadMyWords = async (uid) => {
    if (!uid) return
    try {
      const snap = await getDocs(query(collection(db, 'users', uid, 'my_words'), orderBy('createdAt', 'desc')))
      const w = snap.docs.map(d => ({ ...d.data(), fid: d.id, fromFS: true, isPrivate: true }))
      setMyWords(w)
    } catch (e) { console.log('My words error:', e) }
  }

  const loadUserLearned = async (uid) => {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'progress'))
      snap.docs.forEach(d => {
        const data = d.data()
        if (data.words && Array.isArray(data.words)) {
          setLearned(new Set([...LS.get('learned', []), ...data.words]))
        }
      })
    } catch (e) { console.log('Learned load error:', e) }
  }

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      console.error('Login error:', e)
      if (e.code === 'auth/popup-blocked') {
        alert('Popup bị chặn! Vui lòng cho phép popup trong trình duyệt rồi thử lại.')
      } else if (e.code !== 'auth/popup-closed-by-user') {
        alert('Login failed: ' + e.message)
      }
    }
  }

  const logout = () => { signOut(auth); setMyWords([]); setIsAdmin(false) }

  const trackUserLogin = async (u) => {
    if (!u) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const ref = doc(db, 'app_users', u.uid)
      await setDoc(ref, {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || '',
        photoURL: u.photoURL || '',
        lastLogin: new Date().toISOString(),
        lastLoginDate: today,
      }, { merge: true })
      const existingSnap = await getDocs(collection(db, 'app_users')).catch(() => null)
      let hasAdminField = false
      if (existingSnap) { existingSnap.docs.forEach(d => { if (d.id === u.uid && d.data().isAdmin !== undefined) hasAdminField = true }) }
      if (!hasAdminField) {
        await setDoc(ref, { isAdmin: ADMIN_EMAILS.includes(u.email) }, { merge: true })
      }
      const loginRef = doc(db, 'app_users', u.uid, 'activity', 'logins')
      const actSnap = await getDocs(collection(db, 'app_users', u.uid, 'activity')).catch(() => null)
      let loginDays = []
      if (actSnap) { actSnap.docs.forEach(d => { if (d.data().loginDays) loginDays = d.data().loginDays }) }
      if (!loginDays.includes(today)) loginDays.push(today)
      await setDoc(loginRef, { loginDays, lastLogin: new Date().toISOString() }, { merge: true })
    } catch (e) { console.log('Track user error:', e) }
  }

  const loadAllUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'app_users'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) { console.log('Load users error:', e); return [] }
  }

  const toggleAdmin = async (uid, email, currentStatus) => {
    try {
      const newStatus = !currentStatus
      await setDoc(doc(db, 'app_users', uid), { isAdmin: newStatus }, { merge: true })
      if (user && user.uid === uid) setIsAdmin(newStatus)
      return true
    } catch (e) { alert('Error: ' + e.message); return false }
  }

  const saveWord = async (form, existingId) => {
    try {
      if (existingId) {
        const isPublicWord = publicWords.some(w => w.fid === existingId)
        if (isPublicWord && isAdmin) {
          await updateDoc(doc(db, 'custom_words', existingId), { ...form, updatedAt: new Date().toISOString() })
        } else if (user) {
          await updateDoc(doc(db, 'users', user.uid, 'my_words', existingId), { ...form, updatedAt: new Date().toISOString() })
        }
      } else {
        if (isAdmin) {
          await addDoc(collection(db, 'custom_words'), { ...form, createdAt: new Date().toISOString(), addedBy: user.email })
        } else if (user) {
          await addDoc(collection(db, 'users', user.uid, 'my_words'), { ...form, createdAt: new Date().toISOString(), addedBy: user.email })
        }
      }
      await loadPublicWords()
      if (user) await loadMyWords(user.uid)
      return true
    } catch (e) { alert('Save error: ' + e.message); return false }
  }

  const delWord = async (id) => {
    try {
      const isPublicWord = publicWords.some(w => w.fid === id)
      if (isPublicWord && isAdmin) {
        await deleteDoc(doc(db, 'custom_words', id))
      } else if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'my_words', id))
      }
      await loadPublicWords()
      if (user) await loadMyWords(user.uid)
    } catch (e) { alert('Delete error: ' + e.message) }
  }

  const toggleLearned = useCallback(id => {
    setLearned(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const allWords = useMemo(() => [...myWords, ...publicWords, ...defaultVocab], [myWords, publicWords])
  const customWords = useMemo(() => [...myWords, ...publicWords], [myWords, publicWords])
  const allGroups = useMemo(() => [...new Set(allWords.map(w => w.group).filter(Boolean))], [allWords])

  return { user, isAdmin, allWords, customWords, allGroups, learned, groups, setGroups, dark, setDark, login, logout, saveWord, delWord, toggleLearned, loadAllUsers, toggleAdmin }
}
