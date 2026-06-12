import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatPanel from '../components/ChatPanel'
import PhaseSidebar from '../components/PhaseSidebar'
import ReportPanel from '../components/ReportPanel'
import WorkflowHeader from '../components/WorkflowHeader'
import LoadingState from '../components/layout/LoadingState'
import { useInitiationStore } from '../store/useInitiationStore'

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { project, loading, loadProject } = useInitiationStore()

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  if (loading || !project) {
    return <LoadingState tip="加载立项单..." minHeight="60vh" />
  }

  return (
    <div className="workspace-wrap">
      <WorkflowHeader onBack={() => navigate('/initiations')} />
      <div className="workspace-layout">
        <PhaseSidebar />
        <ChatPanel />
        <ReportPanel />
      </div>
    </div>
  )
}
