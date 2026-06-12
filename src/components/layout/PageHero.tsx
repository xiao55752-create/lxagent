import type { ReactNode } from 'react'

interface Props {
  badge?: string
  title: string
  description?: string
  actions?: ReactNode
}

export default function PageHero({ badge, title, description, actions }: Props) {
  return (
    <header className="page-hero">
      <div className="page-hero-text">
        {badge && <span className="page-hero-badge">{badge}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-hero-actions">{actions}</div>}
    </header>
  )
}
