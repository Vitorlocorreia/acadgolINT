import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return <header className="page-heading">
    <div><p className="eyebrow mb-2">{eyebrow}</p><h1 className="page-title">{title}</h1><p className="page-subtitle">{description}</p></div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
}
