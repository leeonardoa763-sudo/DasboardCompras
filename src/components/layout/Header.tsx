import { useRef } from 'react'
import type { Usuario } from '../../auth/auth'
import { useTheme } from '../../contexts/ThemeContext'

interface HeaderProps {
  onToggleSidebar: () => void
  ultimaActualizacion: Date | null
  onCargarArchivo: (file: File) => void
  onCargarGoogleSheets: (sheetUrl: string, sheetName?: string) => void
  onPresentar?: () => void
  usuario: Usuario | null
  onLogout: () => void
}

function formatFecha(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Header({ onToggleSidebar, ultimaActualizacion, onCargarArchivo, onCargarGoogleSheets, onPresentar, usuario, onLogout }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, toggleTheme } = useTheme()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCargarArchivo(file)
      e.target.value = ''
    }
  }

  const handleGoogleSheetsClick = () => {
    const sheetUrl = window.prompt(
      'Pega la URL pública de Google Sheets o el enlace normal de la hoja:\nEjemplo: https://docs.google.com/spreadsheets/d/ID/edit#gid=0'
    )
    if (!sheetUrl) return

    const sheetName = window.prompt(
      'Si tu hoja correcta no es la primera pestaña, escribe el nombre exacto de la hoja aquí.\nEjemplo: RegistroCompras\nDeja vacío si el enlace ya abre la hoja correcta.'
    )

    onCargarGoogleSheets(sheetUrl.trim(), sheetName?.trim() || undefined)
  }

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-[var(--bg-base)] border-b border-[var(--border)] flex-shrink-0">
      {/* Izquierda: hamburger (solo móvil) + título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors duration-150"
          aria-label="Abrir menú"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="4.5" x2="16" y2="4.5" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="13.5" x2="16" y2="13.5" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-[14px] font-600 text-[var(--text-primary)] tracking-tight hidden md:block">
            Dashboard de Compras
          </h1>
          <h1 className="text-[14px] font-600 text-[var(--text-primary)] tracking-tight md:hidden">
            Compras
          </h1>
          {ultimaActualizacion && (
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Actualizado {formatFecha(ultimaActualizacion)}
            </span>
          )}
        </div>
      </div>

      {/* Derecha: fecha (móvil/tablet) + acciones */}
      <div className="flex items-center gap-2">
        {ultimaActualizacion && (
          <span className="lg:hidden flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span className="hidden sm:inline">{formatFecha(ultimaActualizacion)}</span>
          </span>
        )}

        {/* Botón tema claro/oscuro */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--color-subtle)] hover:text-[var(--text-primary)] transition-all duration-150"
          title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="3" />
              <line x1="7" y1="1" x2="7" y2="2.2" />
              <line x1="7" y1="11.8" x2="7" y2="13" />
              <line x1="1" y1="7" x2="2.2" y2="7" />
              <line x1="11.8" y1="7" x2="13" y2="7" />
              <line x1="2.8" y1="2.8" x2="3.7" y2="3.7" />
              <line x1="10.3" y1="10.3" x2="11.2" y2="11.2" />
              <line x1="11.2" y1="2.8" x2="10.3" y2="3.7" />
              <line x1="3.7" y1="10.3" x2="2.8" y2="11.2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" />
            </svg>
          )}
        </button>

        {/* Botón Presentar */}
        {onPresentar && (
          <button
            onClick={onPresentar}
            className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-500 text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-amber-500/40 hover:text-amber-400 transition-all duration-150"
            title="Modo presentación a pantalla completa"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="2" width="12" height="9" rx="1" />
              <line x1="4" y1="13" x2="10" y2="13" />
              <line x1="7" y1="11" x2="7" y2="13" />
            </svg>
            Presentar
          </button>
        )}

        {usuario && (
          <button
            onClick={onLogout}
            className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-500 text-red-400 bg-[var(--bg-card)] border border-[var(--border)] hover:border-red-300 hover:text-red-300 transition-all duration-150"
            title="Cerrar sesión"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3l3.5 3.5L9 10" />
              <path d="M2 7h10" />
            </svg>
            Cerrar sesión
          </button>
        )}

        {/* Botón Google Sheets */}
        <button
          onClick={handleGoogleSheetsClick}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-500 text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--color-subtle)] hover:text-[var(--text-primary)] transition-all duration-150"
          title="Conectar Google Sheets"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="2" width="12" height="10" rx="1" />
            <line x1="1" y1="5.5" x2="13" y2="5.5" />
            <line x1="5" y1="5.5" x2="5" y2="12" />
          </svg>
          Google Sheets
        </button>

        {/* Botón Cargar archivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-500 text-[#080c14] bg-amber-500 hover:bg-amber-400 transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3" />
            <path d="M1 11v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
          </svg>
          <span className="hidden sm:inline">Cargar archivo</span>
        </button>
      </div>
    </header>
  )
}
