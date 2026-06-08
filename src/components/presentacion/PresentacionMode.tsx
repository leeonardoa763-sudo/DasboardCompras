import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type { ViewId } from '../layout/types'

const VIEW_LABELS: Record<ViewId, string> = {
  resumen:     'Resumen Ejecutivo',
  tendencias:  'Análisis de Tendencias',
  precios:     'Análisis de Precios',
  proveedores: 'Proveedores',
  compradores: 'Compradores',
  reportes:    'Reportes',
}

const VIEW_ORDER: ViewId[] = [
  'resumen', 'tendencias', 'precios', 'proveedores', 'compradores', 'reportes',
]

interface Props {
  activeView: ViewId
  allowedViews: ViewId[]
  onNavigate: (v: ViewId) => void
  onExit: () => void
  children: ReactNode
}

export default function PresentacionMode({ activeView, allowedViews, onNavigate, onExit, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const orderedViews = useMemo(
    () => VIEW_ORDER.filter((view) => allowedViews.includes(view)),
    [allowedViews],
  )
  const currentIndex = orderedViews.indexOf(activeView)

  // Ir a fullscreen al montar
  useEffect(() => {
    const el = containerRef.current
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  // Detectar salida de fullscreen (tecla Escape del navegador)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) onExit()
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [onExit])

  // Navegación por teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (currentIndex < orderedViews.length - 1) onNavigate(orderedViews[currentIndex + 1])
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentIndex > 0) onNavigate(orderedViews[currentIndex - 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentIndex, onNavigate, orderedViews])

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      onExit()
    }
  }

  if (orderedViews.length === 0 || currentIndex === -1) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg-base)', fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      {/* ── Header de presentación ── */}
      <div
        className="h-12 flex-shrink-0 flex items-center justify-between px-5"
        style={{ background: 'var(--bg-base)', borderBottom: '1px solid #1e2d45' }}
      >
        {/* Logo + título del slide */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)' }}
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="7" width="3" height="7" rx="0.5" />
              <rect x="6" y="4" width="3" height="10" rx="0.5" />
              <rect x="11" y="1" width="3" height="13" rx="0.5" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dashboard de Compras
          </span>
          <span style={{ color: 'var(--color-subtle)' }}>·</span>
          <span className="text-[13px] font-medium" style={{ color: '#f59e0b' }}>
            {VIEW_LABELS[activeView]}
          </span>
        </div>

        {/* Controles derechos */}
        <div className="flex items-center gap-4">
          {/* Dots de progreso */}
          <div className="flex items-center gap-1.5">
            {orderedViews.map((v, i) => (
              <button
                key={v}
                onClick={() => onNavigate(v)}
                aria-label={VIEW_LABELS[v]}
                style={{
                  height: '6px',
                  width: i === currentIndex ? '20px' : '6px',
                  borderRadius: '3px',
                  background: i === currentIndex ? '#f59e0b' : 'var(--color-subtle)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {currentIndex + 1} / {VIEW_ORDER.length}
          </span>

          {/* Botón salir */}
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-all duration-150"
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #1e2d45',
              color: 'var(--text-secondary)',
              background: 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-subtle)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="10" y2="10" />
              <line x1="10" y1="1" x2="1" y2="10" />
            </svg>
            Salir
          </button>
        </div>
      </div>

      {/* ── Área de contenido ── */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Flecha izquierda */}
        <NavArrow
          direction="left"
          disabled={currentIndex === 0}
          onClick={() => currentIndex > 0 && onNavigate(VIEW_ORDER[currentIndex - 1])}
        />

        {/* Slide actual */}
        <main
          key={activeView}
          className="flex-1 overflow-y-auto slide-enter"
          style={{ padding: '24px 48px' }}
        >
          {children}
        </main>

        {/* Flecha derecha */}
        <NavArrow
          direction="right"
          disabled={currentIndex === VIEW_ORDER.length - 1}
          onClick={() => currentIndex < VIEW_ORDER.length - 1 && onNavigate(VIEW_ORDER[currentIndex + 1])}
        />
      </div>

      {/* ── Footer de ayuda ── */}
      <div
        className="h-8 flex-shrink-0 flex items-center justify-center gap-6"
        style={{ borderTop: '1px solid #0e1420' }}
      >
        <HelpHint icon="←→">Navegar slides</HelpHint>
        <HelpHint icon="Esc">Salir</HelpHint>
      </div>
    </div>
  )
}

function NavArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Slide anterior' : 'Siguiente slide'}
      style={{
        position: 'absolute',
        [direction]: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        width: '40px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: disabled ? 'transparent' : 'var(--text-muted)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'color 0.15s ease',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left'
          ? <polyline points="14,5 8,11 14,17" />
          : <polyline points="8,5 14,11 8,17" />
        }
      </svg>
    </button>
  )
}

function HelpHint({ icon, children }: { icon: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-subtle)' }}>
      <span
        className="text-[9px] font-mono"
        style={{
          padding: '1px 5px',
          borderRadius: '3px',
          background: 'var(--bg-surface)',
          border: '1px solid #1e2d45',
          color: 'var(--text-muted)',
        }}
      >
        {icon}
      </span>
      {children}
    </span>
  )
}
