import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import HomePage from './pages/HomePage'
import InitiationListPage from './pages/InitiationListPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import WorkspacePage from './pages/WorkspacePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/initiations" element={<InitiationListPage />} />
          <Route path="/initiations/:id" element={<WorkspacePage />} />
          <Route path="/knowledge" element={<KnowledgeBasePage />} />
          <Route path="/workspace" element={<Navigate to="/initiations" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
