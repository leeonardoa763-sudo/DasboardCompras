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
  f.fechaDesde !== '' ||
  f.fechaHasta !== ''

const SELECT_CLASS = [
  'h-7 px-2.5 pr-7 rounded-md text-[12px] font-400',
  'bg-[#141c2e] border border-[#1e2d45] text-[#8fa3be]',
  'hover:border-[#2a3f58] hover:text-[#e8edf5]',
  'focus:outline-none focus:border-amber-500/50',
  'transition-colors duration-150 cursor-pointer',
  'appearance-none',
].join(' ')

const INPUT_CLASS = [
  'h-7 px-2.5 rounded-md text-[12px] font-400',
  'bg-[#141c2e] border border-[#1e2d45] text-[#8fa3be]',
  'hover:border-[#2a3f58] hover:text-[#e8edf5]',
  'focus:outline-none focus:border-amber-500/50',
  'transition-colors duration-150',
  '[color-scheme:dark]',
].join(' ')

export default function FilterBar({ opciones, filtros, onChange, onLimpiar }: FilterBarProps) {
  const active = hayFiltrosActivos(filtros)

  const setEmpresa = (val: string) =>
    onChange({ ...filtros, empresas: val ? [val] : [] })

  const setComprador = (val: string) =>
    onChange({ ...filtros, compradores: val ? [val] : [] })

  const setCentro = (val: string) =>
    onChange({ ...filtros, centros: val ? [Number(val)] : [] })

  const setTipoInsumo = (val: string) =>
    onChange({ ...filtros, tiposInsumo: val ? [val] : [] })

  return (
    <div className="flex-shrink-0 border-b border-[#1e2d45] bg-[#0a0f1c]">
      <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 overflow-x-auto scrollbar-none">

        {/* Label */}
        <span className="text-[11px] text-[#4d6480] font-500 tracking-wide uppercase flex-shrink-0 hidden sm:block">
          Filtros
        </span>
        <div className="w-px h-4 bg-[#1e2d45] hidden sm:block flex-shrink-0" />

        {/* Empresa */}
        <div className="flex-shrink-0 relative">
          <select
            className={SELECT_CLASS}
            value={filtros.empresas[0] ?? ''}
            onChange={(e) => setEmpresa(e.target.value)}
          >
            <option value="">Empresa</option>
            {opciones.empresas.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>

        {/* Comprador */}
        <div className="flex-shrink-0 relative">
          <select
            className={SELECT_CLASS}
            value={filtros.compradores[0] ?? ''}
            onChange={(e) => setComprador(e.target.value)}
          >
            <option value="">Comprador</option>
            {opciones.compradores.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>

        {/* Centro de costos */}
        <div className="flex-shrink-0 relative">
          <select
            className={SELECT_CLASS}
            value={filtros.centros[0]?.toString() ?? ''}
            onChange={(e) => setCentro(e.target.value)}
          >
            <option value="">Centro de costos</option>
            {opciones.centros.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>

        {/* Tipo de insumo */}
        <div className="flex-shrink-0 relative">
          <select
            className={SELECT_CLASS}
            value={filtros.tiposInsumo[0] ?? ''}
            onChange={(e) => setTipoInsumo(e.target.value)}
          >
            <option value="">Tipo de insumo</option>
            {opciones.tiposInsumo.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-[#1e2d45] flex-shrink-0" />

        {/* Fecha desde */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-[11px] text-[#4d6480] hidden md:block">Desde</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={filtros.fechaDesde}
            onChange={(e) => onChange({ ...filtros, fechaDesde: e.target.value })}
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-[11px] text-[#4d6480] hidden md:block">Hasta</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={filtros.fechaHasta}
            onChange={(e) => onChange({ ...filtros, fechaHasta: e.target.value })}
          />
        </div>

        {/* Spacer + Limpiar */}
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
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#4d6480]"
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="2,3.5 5,6.5 8,3.5" />
    </svg>
  )
}
