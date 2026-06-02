import type { ViewId } from './types'

interface NavItem {
  id: ViewId
  label: string
  icon: JSX.Element
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'resumen',
    label: 'Resumen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="6" height="6" rx="1" />
        <rect x="10" y="2" width="6" height="6" rx="1" />
        <rect x="2" y="10" width="6" height="6" rx="1" />
        <rect x="10" y="10" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  // { id: 'tendencias', label: 'Tendencias', icon: (<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,13 6,8 10,11 16,4" /><polyline points="12,4 16,4 16,8" /></svg>) },
  {
    id: 'precios',
    label: 'Precios',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7" />
        <path d="M9 5v1.5M9 11.5V13M6.5 7.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2-1.1 1.5-2.5 1.5S6.5 10.1 6.5 11.5s.9 2 2.5 2 2.5-.9 2.5-2" />
      </svg>
    ),
  },
  {
    id: 'proveedores',
    label: 'Proveedores',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 13V7l7-4 7 4v6" />
        <rect x="6" y="9" width="6" height="7" rx="0.5" />
        <line x1="9" y1="9" x2="9" y2="16" />
      </svg>
    ),
  },
  {
    id: 'compradores',
    label: 'Compradores',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="3" />
        <path d="M1 16c0-3.3 2.7-6 6-6" />
        <circle cx="13" cy="10" r="2.5" />
        <path d="M10 16c0-1.7 1.3-3 3-3s3 1.3 3 3" />
      </svg>
    ),
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6l-5-4z" />
        <polyline points="10,2 10,6 14,6" />
        <line x1="6" y1="9" x2="12" y2="9" />
        <line x1="6" y1="12" x2="10" y2="12" />
      </svg>
    ),
  },
]

interface SidebarProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ activeView, onNavigate, isOpen, onClose }: SidebarProps) {
  const handleNav = (view: ViewId) => {
    onNavigate(view)
    onClose()
  }

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-60 flex flex-col',
          'bg-[var(--bg-base)] border-r border-[var(--border)]',
          'transition-transform duration-200 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-[var(--border)]">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="7" width="3" height="7" rx="0.5" />
              <rect x="6" y="4" width="3" height="10" rx="0.5" />
              <rect x="11" y="1" width="3" height="13" rx="0.5" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-600 text-[var(--text-primary)] leading-none">Dashboard</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-none tracking-wide uppercase">Compras</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p className="px-5 mb-2 text-[10px] font-500 text-[var(--text-muted)] tracking-widest uppercase">
            Módulos
          </p>
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNav(item.id)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-400',
                      'transition-all duration-150 text-left relative',
                      active
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400 rounded-r" />
                    )}
                    <span className={active ? 'text-amber-400' : 'text-[var(--text-muted)]'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <a
            href="https://deerflow.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-[var(--color-subtle)] hover:text-[var(--text-muted)] transition-colors duration-150"
          >
            <span className="text-[8px]">✦</span>
            <span>Deerflow</span>
          </a>
        </div>
      </aside>
    </>
  )
}
