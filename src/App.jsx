import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAppState } from './hooks/useAppState.js'
import Navbar from './components/Navbar/Navbar.jsx'
import DecksPage from './pages/DecksPage.jsx'
import CardsPage from './pages/CardsPage.jsx'
import CreateDeckPage from './pages/CreateDeckPage.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import AdminDashPage from './pages/AdminDashPage.jsx'
import './styles/global.css'

function AppInner() {
  const state = useAppState()
  return (
    <>
      <Routes>
        <Route path="/" element={<DecksPage state={state} />} />
        <Route path="/cards" element={<CardsPage state={state} />} />
        <Route path="/create" element={<CreateDeckPage state={state} />} />
        <Route path="/browse" element={<BrowsePage state={state} />} />
        <Route path="/analytics" element={<AnalyticsPage state={state} />} />
        <Route path="/admin" element={<AdminDashPage state={state} />} />
      </Routes>
      <Navbar onToggleTheme={() => state.setDark(!state.dark)} isAdmin={state.isAdmin} />
    </>
  )
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>
}
