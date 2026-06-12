import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DatabaseOutlined, HomeOutlined, RocketOutlined } from '@ant-design/icons'
import { api } from '../api/client'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [healthOk, setHealthOk] = useState<boolean | null>(null)

  const isWorkspace = /^\/initiations\/[^/]+/.test(location.pathname)
  const isHome = location.pathname === '/'

  useEffect(() => {
    api
      .health()
      .then(() => setHealthOk(true))
      .catch(() => setHealthOk(false))
  }, [])

  const mainClass = [
    'app-main',
    isHome ? 'app-main--home' : '',
    isWorkspace ? 'app-main--workspace' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand" onClick={() => navigate('/')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/')}>
          <RocketOutlined />
          <span>项目立项智能体</span>
        </div>
        <nav className="app-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <HomeOutlined /> 首页
          </Link>
          <Link to="/initiations" className={location.pathname.startsWith('/initiations') ? 'active' : ''}>
            <RocketOutlined /> 立项管理
          </Link>
          <Link to="/knowledge" className={location.pathname === '/knowledge' ? 'active' : ''}>
            <DatabaseOutlined /> 规则标准库
          </Link>
        </nav>
        {healthOk !== null && (
          <div className="app-health" title={healthOk ? '后端服务正常' : '后端未连接'}>
            <span className={`app-health-dot ${healthOk ? 'ok' : 'err'}`} />
            {healthOk ? '服务在线' : '服务离线'}
          </div>
        )}
      </header>
      <main className={mainClass}>
        <Outlet />
      </main>
    </div>
  )
}
