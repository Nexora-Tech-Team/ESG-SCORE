import type { ReactNode } from 'react'
import type { Role } from '@/types'

interface SidebarItem {
  id: string
  label: string
  description: string
  icon: ReactNode
  badge?: ReactNode
}

interface RoleSidebarProps {
  role: Role
  title: string
  subtitle: string
  items: SidebarItem[]
}

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  asesor: 'Asesor',
  juri: 'Juri',
  peserta: 'Peserta',
}

export default function RoleSidebar({ role, title, subtitle, items }: RoleSidebarProps) {
  return (
    <aside className="role-sidebar">
      <div className="role-sidebar-head">
        <span className="section-kicker">{roleLabels[role]} Menu</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <nav className="role-nav" aria-label={`${roleLabels[role]} navigation`}>
        {items.map((item) => (
          <a className="role-nav-item" key={item.id} href={`#${item.id}`}>
            <span className="role-nav-icon">{item.icon}</span>
            <span className="role-nav-copy">
              <strong>
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </strong>
              <small>{item.description}</small>
            </span>
          </a>
        ))}
      </nav>
    </aside>
  )
}
