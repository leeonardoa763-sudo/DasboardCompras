import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FilterOptions, FiltrosActivos } from './types'

interface FilterBarProps {
  opciones: FilterOptions
  filtros: FiltrosActivos
  onChange: (f: FiltrosActivos) => void
  onLimpiar: () => void
}

const hayFiltrosActivos = (f: FiltrosActivos) =>
  f.empresas.length > 0 ||
  f.compradores.length > 0 ||
  f.centros.length > 0 ||
  f.tiposInsumo.length > 0 ||
  f.proveedores.length > 0 ||
  f.fechaDesde !== '' ||
  f.fechaHasta !== ''

// ── Dropdown multi-selección genérico ────────────────────────────────

interface MultiDropdownProps<T extends string | number> {
  label: string
  opciones: T[]
  seleccionados: T[]
  onChange: (nuevos: T[]) => void
  renderLabel?: (v: T) => string
}

function MultiDropdown<T extends string | number>({
  label,
  opciones,
  seleccionados,
  onChange,
  renderLabel,
}: MultiDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        dropRef.current && !dropRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen((o) => !o)
  }

  const toggle = (v: T) => {
    if (seleccionados.includes(v)) {
      onChange(seleccionados.filter((x) => x !== v))
    } else {
      onChange([...seleccionados, v])
    }
  }

  const btnLabel =
    seleccionados.length === 0
      ? label
      : seleccionados.length === 1
        ? (renderLabel ? renderLabel(seleccionados[0]) : String(seleccionados[0]))
        : `${label} (${seleccionados.length})`

  const active = seleccionados.length > 0

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 160), zIndex: 9999 }}
      className={[
        'max-w-[260px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl',
        'py-1 max-h-64 overflow-y-auto',
      ].join(' ')}
    >
      {opciones.length === 0 && (
        <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">Sin opciones</p>
      )}
      {opciones.map((v) => {
        const checked = seleccionados.includes(v)
        const txt = renderLabel ? renderLabel(v) : String(v)
        return (
          <label
            key={String(v)}
            className={[
              'flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none',
              'text-[12px] transition-colors duration-100',
              checked ? 'text-amber-400 bg-amber-500/5' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            <span className={[
              'w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center flex-shrink-0',
              checked ? 'bg-amber-500 border-amber-500' : 'border-[var(--color-subtle)] bg-transparent',
            ].join(' ')}>
              {checked && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1,4 3,6.5 7,1.5" />
                </svg>
              )}
            </span>
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(v)} />
            <span className="truncate">{txt}</span>
          </label>
        )
      })}
      {seleccionados.length > 0 && (
        <>
          <div className="mx-2 my-1 h-px bg-[var(--border)]" />
          <button
            onClick={() => { onChange([]); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-[11px] text-[#ef4444]/70 hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors duration-100"
          >
            Limpiar filtro
          </button>
        </>
      )}
    </div>,
    document.body,
  ) : null

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={[
          'h-7 px-2.5 pr-6 rounded-md text-[12px] font-400 flex items-center gap-1.5',
          'border transition-colors duration-150 cursor-pointer whitespace-nowrap',
          active
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
            : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-subtle)] hover:text-[var(--text-primary)]',
        ].join(' ')}
      >
        {btnLabel}
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points={open ? '2,6.5 5,3.5 8,6.5' : '2,3.5 5,6.5 8,3.5'} />
        </svg>
      </button>
      {dropdown}
    </div>
  )
}

// ── FilterBar ─────────────────────────────────────────────────────────

const INPUT_CLASS = [
  'h-7 px-2.5 rounded-md text-[12px] font-400',
  'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]',
  'hover:border-[var(--color-subtle)] hover:text-[var(--text-primary)]',
  'focus:outline-none focus:border-amber-500/50',
  'transition-colors duration-150',
].join(' ')

export default function FilterBar({ opciones, filtros, onChange, onLimpiar }: FilterBarProps) {
  const active = hayFiltrosActivos(filtros)

  return (
    <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-base)]">
      <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 overflow-x-auto scrollbar-none">

        <span className="text-[11px] text-[var(--text-muted)] font-500 tracking-wide uppercase flex-shrink-0 hidden sm:block">
          Filtros
        </span>
        <div className="w-px h-4 bg-[var(--border)] hidden sm:block flex-shrink-0" />

        <MultiDropdown
          label="Empresa"
          opciones={opciones.empresas}
          seleccionados={filtros.empresas}
          onChange={(v) => onChange({ ...filtros, empresas: v })}
        />

        <MultiDropdown
          label="Comprador"
          opciones={opciones.compradores}
          seleccionados={filtros.compradores}
          onChange={(v) => onChange({ ...filtros, compradores: v })}
        />

        <MultiDropdown
          label="Centro de costos"
          opciones={opciones.centros}
          seleccionados={filtros.centros}
          onChange={(v) => onChange({ ...filtros, centros: v })}
          renderLabel={(v) => String(v)}
        />

        <MultiDropdown
          label="Tipo de insumo"
          opciones={opciones.tiposInsumo}
          seleccionados={filtros.tiposInsumo}
          onChange={(v) => onChange({ ...filtros, tiposInsumo: v })}
        />

        <MultiDropdown
          label="Proveedor"
          opciones={opciones.proveedores}
          seleccionados={filtros.proveedores}
          onChange={(v) => onChange({ ...filtros, proveedores: v })}
        />

        <div className="w-px h-4 bg-[var(--border)] flex-shrink-0" />

        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-muted)] hidden md:block">Desde</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={filtros.fechaDesde}
            onChange={(e) => onChange({ ...filtros, fechaDesde: e.target.value })}
          />
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-muted)] hidden md:block">Hasta</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={filtros.fechaHasta}
            onChange={(e) => onChange({ ...filtros, fechaHasta: e.target.value })}
          />
        </div>

        <div className="flex-1" />
        {active && (
          <button
            onClick={onLimpiar}
            className="flex-shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-500 text-[#ef4444]/80 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all duration-150"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
            Limpiar todo
          </button>
        )}
      </div>
    </div>
  )
}
