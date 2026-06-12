import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  wide?: boolean
  flush?: boolean
}

/** 列表页 / 知识库等标准内容区容器 */
export default function PageShell({ children, className = '', wide, flush }: Props) {
  return (
    <div
      className={[
        'page-shell',
        wide ? 'page-shell--wide' : '',
        flush ? 'page-shell--flush' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
