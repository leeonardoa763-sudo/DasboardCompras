import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import type { Compra } from '../data/schema'
import {
  seriePrecios,
  calcularRegresion,
  calcularIndiceBase100,
  resumenPreciosTodos,
  type ResumenInsumo,
  type PuntoPrecio,
} from '../analytics/precios'
import { fmt$, fmtNum } from '../utils/format'

interface Props { compras: Compra[] }

// ── Helpers de formato ────────────────────────────────────────────────────────

function fmtPu(v: number) {
  return v >= 1000 ? fmt$(v) : `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtYAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

// ── Sub-componentes de UI ─────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1.5 flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-[15px] h-[15px] rounded-full bg-[#1e2d45] border border-[#2a3f58] text-[#4d6480] hover:text-white hover:bg-blue-600/60 hover:border-blue-500/50 text-[8px] font-700 flex items-center justify-center transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        aria-label="Más información"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-5 z-50 w-64 bg-[#1a2438] border border-[#2a3f58] rounded-xl p-3 shadow-2xl">
            <p className="text-[11px] text-[#8fa3be] leading-relaxed">{text}</p>
            <button onClick={() => setOpen(false)} className="mt-2 text-[9px] text-blue-400 hover:text-blue-300 font-500">
              Cerrar
            </button>
          </div>
        </>
      )}
    </span>
  )
}

function SectionLabel({ children, info }: { children: React.ReactNode; info?: string }) {
  return (
    <h2 className="text-[10px] font-600 uppercase tracking-widest text-[#4d6480] mb-3 flex items-center">
      {children}
      {info && <InfoTooltip text={info} />}
    </h2>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#141c2e] border border-[#1e2d45] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#4d6480" strokeWidth="1.2" strokeLinecap="round">
        <circle cx="20" cy="20" r="16" />
        <line x1="20" y1="12" x2="20" y2="20" />
        <circle cx="20" cy="27" r="1" fill="#4d6480" stroke="none" />
      </svg>
      <p className="text-[13px] text-[#4d6480]">Sin datos para los filtros seleccionados</p>
    </div>
  )
}

// ── Chip de tendencia ─────────────────────────────────────────────────────────

function TendenciaChip({ t, pendiente }: { t: ResumenInsumo['tendencia']; pendiente: number }) {
  const cfg = {
    sube:      { icon: '↑', label: 'Sube',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    baja:      { icon: '↓', label: 'Baja',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    estable:   { icon: '→', label: 'Estable', cls: 'text-[#4d6480] bg-[#1e2d45]/60 border-[#1e2d45]' },
    sin_datos: { icon: '—', label: '1 dato',  cls: 'text-[#4d6480] bg-[#1e2d45]/60 border-[#1e2d45]' },
  }[t]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-500 border ${cfg.cls}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {t !== 'sin_datos' && pendiente !== 0 && (
        <span className="opacity-70">
          {pendiente > 0 ? '+' : ''}{pendiente.toFixed(2)}/d
        </span>
      )}
    </span>
  )
}

// ── Tooltip del gráfico ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipPrecio({ active, payload, label, mostrarIndice }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as {
    fechaLabel: string; precioUnitario: number; regresion: number | null; indice: number; proveedor: string
  }
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left min-w-[160px]">
      <p className="text-[10px] text-[#4d6480] mb-1">{label ?? d.fechaLabel}</p>
      {mostrarIndice ? (
        <p className="text-[13px] font-600 text-blue-400">Índice: {d.indice?.toFixed(1)}</p>
      ) : (
        <p className="text-[13px] font-600 text-blue-400">{fmtPu(d.precioUnitario)}</p>
      )}
      {d.regresion !== null && !mostrarIndice && (
        <p className="text-[11px] text-amber-400/80 mt-0.5">Reg.: {fmtPu(d.regresion)}</p>
      )}
      {d.proveedor && (
        <p className="text-[10px] text-[#4d6480] mt-0.5 truncate max-w-[160px]">{d.proveedor}</p>
      )}
    </div>
  )
}

// ── Panel de detalle del insumo ───────────────────────────────────────────────

interface MiniKpi { label: string; value: string; sub?: string; color?: string }
function MiniKpiCard({ label, value, sub, color = '#e8edf5' }: MiniKpi) {
  return (
    <div className="bg-[#0e1420] border border-[#1e2d45] rounded-lg p-3 flex flex-col gap-0.5">
      <p className="text-[9px] font-500 uppercase tracking-widest text-[#4d6480]">{label}</p>
      <p className="text-[15px] font-700 tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#4d6480]">{sub}</p>}
    </div>
  )
}

function DetalleInsumo({
  resumen,
  puntos,
  onCerrar,
}: {
  resumen: ResumenInsumo
  puntos: PuntoPrecio[]
  onCerrar: () => void
}) {
  const [mostrarIndice, setMostrarIndice] = useState(false)

  const reg = useMemo(() => calcularRegresion(puntos), [puntos])
  const indices = useMemo(() => calcularIndiceBase100(puntos), [puntos])

  const chartData = puntos.map((p, i) => ({
    fechaLabel: p.fechaLabel,
    precioUnitario: p.precioUnitario,
    regresion: reg ? +(reg.intercepto + reg.pendiente * p.diasDesdeInicio).toFixed(4) : null,
    indice: +indices[i].toFixed(2),
    proveedor: p.proveedor,
  }))

  const tieneCurva = puntos.length >= 2 && new Set(puntos.map((p) => p.diasDesdeInicio)).size >= 2

  const cvPct = resumen.puPromedio > 0
    ? (resumen.stdDev / resumen.puPromedio) * 100
    : 0

  return (
    <Card className="mb-1">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[9px] font-500 uppercase tracking-wider px-2 py-0.5 rounded bg-[#1e2d45] text-[#8fa3be] border border-[#2a3f58]">
              {resumen.tipoInsumo}
            </span>
            <TendenciaChip t={resumen.tendencia} pendiente={resumen.pendiente} />
          </div>
          <h3 className="text-[14px] font-600 text-[#e8edf5] leading-snug">{resumen.descripcion}</h3>
          <p className="text-[11px] text-[#4d6480] mt-0.5">{resumen.insumoClave} · {resumen.unidad}</p>
        </div>
        <button
          onClick={onCerrar}
          className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1e2d45] hover:bg-[#2a3f58] text-[#4d6480] hover:text-white flex items-center justify-center transition-colors text-[14px]"
          aria-label="Cerrar detalle"
        >
          ×
        </button>
      </div>

      {/* KPIs mini */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <MiniKpiCard label="Pu Promedio" value={fmtPu(resumen.puPromedio)} color="#3b82f6" />
        <MiniKpiCard label="Pu Mínimo"   value={fmtPu(resumen.puMin)}     color="#10b981" />
        <MiniKpiCard label="Pu Máximo"   value={fmtPu(resumen.puMax)}     color="#f59e0b" />
        <MiniKpiCard
          label="Volatilidad"
          value={resumen.stdDev > 0 ? `±${fmtPu(resumen.stdDev)}` : 'Estable'}
          sub={resumen.stdDev > 0 ? `CV: ${cvPct.toFixed(1)}%` : undefined}
          color={cvPct > 20 ? '#f59e0b' : cvPct > 10 ? '#8fa3be' : '#10b981'}
        />
        <MiniKpiCard label="# Compras" value={fmtNum(resumen.nCompras)} sub={`Gasto: ${fmt$(resumen.gastoTotal)}`} />
      </div>

      {/* Toggle vista */}
      {tieneCurva && (
        <div className="flex items-center gap-2 mb-3">
          {(['precio', 'indice'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setMostrarIndice(v === 'indice')}
              className={`px-3 py-1 rounded-full text-[11px] font-500 transition-colors border ${
                (v === 'indice') === mostrarIndice
                  ? 'bg-blue-600/80 text-white border-blue-500/50'
                  : 'bg-[#0e1420] border-[#1e2d45] text-[#8fa3be] hover:text-white hover:border-[#2a3f58]'
              }`}
            >
              {v === 'precio' ? 'Precio real ($)' : 'Índice base 100'}
            </button>
          ))}
          <InfoTooltip text="Índice base 100: el precio de la primera compra se normaliza a 100. Permite comparar la variación relativa sin importar el precio absoluto." />
        </div>
      )}

      {/* Gráfica */}
      {puntos.length === 1 ? (
        <div className="flex items-center justify-center h-24 border border-dashed border-[#1e2d45] rounded-lg">
          <p className="text-[12px] text-[#4d6480]">Una sola compra — datos insuficientes para mostrar curva de tendencia</p>
        </div>
      ) : !tieneCurva ? (
        <div className="flex items-center justify-center h-24 border border-dashed border-[#1e2d45] rounded-lg">
          <p className="text-[12px] text-[#4d6480]">Todas las compras son de la misma fecha — sin tendencia temporal</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis
                dataKey="fechaLabel"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickFormatter={mostrarIndice ? (v: number) => `${v.toFixed(0)}` : fmtYAxis}
                tickLine={false}
                axisLine={false}
                width={mostrarIndice ? 36 : 52}
                domain={mostrarIndice ? ['auto', 'auto'] : ['auto', 'auto']}
              />
              <Tooltip
                content={<TooltipPrecio mostrarIndice={mostrarIndice} />}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              {mostrarIndice ? (
                <>
                  <ReferenceLine y={100} stroke="#2a3f58" strokeDasharray="4 2" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="indice"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6', stroke: '#080c14', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#080c14', strokeWidth: 2 }}
                    connectNulls
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="precioUnitario"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6', stroke: '#080c14', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#080c14', strokeWidth: 2 }}
                    connectNulls
                    name="Precio unitario"
                  />
                  {reg && (
                    <Line
                      type="linear"
                      dataKey="regresion"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls
                      name="Regresión lineal"
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Leyenda + métricas de regresión */}
          <div className="flex items-center gap-5 mt-2 flex-wrap justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-blue-500 rounded" />
                <span className="text-[10px] text-[#4d6480]">
                  {mostrarIndice ? 'Índice base 100' : 'Precio unitario'}
                </span>
              </div>
              {reg && !mostrarIndice && (
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="4" viewBox="0 0 16 4">
                    <line x1="0" y1="2" x2="16" y2="2" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 3" />
                  </svg>
                  <span className="text-[10px] text-[#4d6480]">Tendencia lineal</span>
                </div>
              )}
            </div>
            {reg && !mostrarIndice && (
              <div className="flex items-center gap-3 flex-wrap text-[10px] text-[#4d6480]">
                <span>
                  Pendiente:{' '}
                  <span className={reg.pendiente > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {reg.pendiente > 0 ? '+' : ''}{reg.pendiente.toFixed(3)} $/día
                  </span>
                </span>
                <span>r² = <span className="text-[#8fa3be]">{reg.r2.toFixed(3)}</span></span>
                <span>
                  Proyección +30d:{' '}
                  <span className="text-[#8fa3be]">{fmtPu(reg.proyeccion30d)}</span>
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Scatter de compras (tabla mini) */}
      {puntos.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Historial de compras</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#1e2d45]">
                  {['Fecha', 'Proveedor', 'Cantidad', 'Precio unit.', 'OC'].map((h) => (
                    <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...puntos].reverse().map((p, i) => (
                  <tr key={i} className="border-b border-[#1e2d45]/30 hover:bg-white/[0.015]">
                    <td className="py-1.5 pr-3 text-[#8fa3be] whitespace-nowrap">{p.fechaLabel}</td>
                    <td className="py-1.5 pr-3 text-[#e8edf5] max-w-[140px] truncate">{p.proveedor}</td>
                    <td className="py-1.5 pr-3 text-[#8fa3be] tabular-nums">{fmtNum(p.cantidad)}</td>
                    <td className="py-1.5 pr-3 text-blue-400 font-600 tabular-nums">{fmtPu(p.precioUnitario)}</td>
                    <td className="py-1.5 pr-0 text-[#4d6480] tabular-nums">{p.ordenCompra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

type SortKey = 'descripcion' | 'puPromedio' | 'puMin' | 'puMax' | 'stdDev' | 'nCompras' | 'gastoTotal' | 'tendencia'

const HELP = {
  volatilidad:
    'Desviación estándar del precio unitario entre todas las compras del insumo. Un valor alto indica que el precio varía mucho entre compras — señal de oportunidad de negociación. CV% = (stdDev / promedio) × 100.',
  regresion:
    'Tendencia lineal calculada por mínimos cuadrados sobre el historial de precios. La pendiente indica cuánto varía el precio por día en promedio. r² mide qué tan bien explica esa recta el comportamiento real (1 = perfecto, 0 = sin patrón).',
  indiceBase100:
    'Normaliza el precio de la primera compra a 100. Permite ver la variación relativa sin importar el precio absoluto.',
}

export default function PreciosView({ compras }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('gastoTotal')
  const [sortAsc, setSortAsc] = useState(false)

  const resumen = useMemo(() => resumenPreciosTodos(compras), [compras])

  const resumenFiltrado = useMemo(() => {
    const q = busqueda.toLowerCase()
    const filtrado = q
      ? resumen.filter(
          (r) =>
            r.descripcion.toLowerCase().includes(q) ||
            r.tipoInsumo.toLowerCase().includes(q) ||
            r.insumoClave.toLowerCase().includes(q)
        )
      : resumen

    return [...filtrado].sort((a, b) => {
      let diff = 0
      if (sortKey === 'descripcion')  diff = a.descripcion.localeCompare(b.descripcion)
      else if (sortKey === 'tendencia') diff = a.tendencia.localeCompare(b.tendencia)
      else diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortAsc ? diff : -diff
    })
  }, [resumen, busqueda, sortKey, sortAsc])

  const seleccionado = useMemo(
    () => resumen.find((r) => r.insumoClave === insumoSeleccionado) ?? null,
    [resumen, insumoSeleccionado]
  )

  const puntosSeleccionado = useMemo(
    () => (insumoSeleccionado ? seriePrecios(compras, insumoSeleccionado) : []),
    [compras, insumoSeleccionado]
  )

  if (compras.length === 0) return <EmptyState />

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function ThBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    return (
      <th
        className="pb-2.5 pr-3 last:pr-0 text-left cursor-pointer select-none whitespace-nowrap"
        onClick={() => toggleSort(col)}
      >
        <span className={`text-[9px] font-500 uppercase tracking-wider flex items-center gap-0.5 ${active ? 'text-blue-400' : 'text-[#4d6480] hover:text-[#8fa3be]'}`}>
          {label}
          <span className="text-[8px]">{active ? (sortAsc ? '↑' : '↓') : ''}</span>
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Barra de búsqueda ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4d6480]" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="15" y2="15" />
          </svg>
          <input
            type="text"
            placeholder="Buscar insumo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#141c2e] border border-[#1e2d45] rounded-lg text-[12px] text-[#e8edf5] placeholder-[#4d6480] focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <span className="text-[11px] text-[#4d6480]">
          {resumenFiltrado.length} insumo{resumenFiltrado.length !== 1 ? 's' : ''}
          {busqueda && ` de ${resumen.length}`}
        </span>
        {insumoSeleccionado && (
          <button
            onClick={() => setInsumoSeleccionado(null)}
            className="text-[11px] text-[#4d6480] hover:text-[#8fa3be] flex items-center gap-1"
          >
            <span>×</span> Quitar selección
          </button>
        )}
      </div>

      {/* ── Panel de detalle ── */}
      {seleccionado && (
        <DetalleInsumo
          resumen={seleccionado}
          puntos={puntosSeleccionado}
          onCerrar={() => setInsumoSeleccionado(null)}
        />
      )}

      {/* ── Tabla resumen ── */}
      <Card>
        <SectionLabel info={HELP.volatilidad}>
          Resumen de precios por insumo
          <span className="ml-2 text-[#2a3f58] font-400">— clic en fila para ver detalle</span>
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                <ThBtn col="descripcion" label="Insumo" />
                <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480] whitespace-nowrap">Tipo · Unid.</th>
                <ThBtn col="puPromedio" label="Pu Prom" />
                <ThBtn col="puMin"      label="Mín" />
                <ThBtn col="puMax"      label="Máx" />
                <ThBtn col="stdDev"     label="Volatilidad" />
                <ThBtn col="tendencia"  label="Tendencia" />
                <ThBtn col="nCompras"   label="# OC" />
                <ThBtn col="gastoTotal" label="Gasto" />
              </tr>
            </thead>
            <tbody>
              {resumenFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[12px] text-[#4d6480]">
                    Sin insumos para "{busqueda}"
                  </td>
                </tr>
              ) : (
                resumenFiltrado.map((r) => {
                  const selected = r.insumoClave === insumoSeleccionado
                  const cvPct = r.puPromedio > 0 ? (r.stdDev / r.puPromedio) * 100 : 0
                  return (
                    <tr
                      key={r.insumoClave}
                      onClick={() => setInsumoSeleccionado(selected ? null : r.insumoClave)}
                      className={`border-b border-[#1e2d45]/40 cursor-pointer transition-colors duration-100 ${
                        selected
                          ? 'bg-blue-600/[0.08] border-blue-500/20'
                          : 'hover:bg-white/[0.015]'
                      }`}
                    >
                      {/* Insumo */}
                      <td className="py-2.5 pr-3">
                        <p className={`font-500 leading-snug ${selected ? 'text-blue-300' : 'text-[#e8edf5]'}`}>
                          {r.descripcion}
                        </p>
                        <p className="text-[9px] text-[#4d6480]">{r.insumoClave}</p>
                      </td>
                      {/* Tipo + unidad */}
                      <td className="py-2.5 pr-3">
                        <p className="text-[#8fa3be] text-[11px] leading-tight max-w-[110px] truncate">{r.tipoInsumo}</p>
                        <p className="text-[9px] text-[#4d6480]">{r.unidad}</p>
                      </td>
                      {/* Pu prom */}
                      <td className="py-2.5 pr-3 text-blue-400 font-600 tabular-nums whitespace-nowrap">
                        {fmtPu(r.puPromedio)}
                      </td>
                      {/* Mín */}
                      <td className="py-2.5 pr-3 text-emerald-400/80 tabular-nums whitespace-nowrap text-[11px]">
                        {fmtPu(r.puMin)}
                      </td>
                      {/* Máx */}
                      <td className="py-2.5 pr-3 text-amber-400/80 tabular-nums whitespace-nowrap text-[11px]">
                        {fmtPu(r.puMax)}
                      </td>
                      {/* Volatilidad */}
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {r.stdDev > 0 ? (
                          <div>
                            <p className={`tabular-nums text-[11px] font-500 ${cvPct > 20 ? 'text-amber-400' : cvPct > 10 ? 'text-[#8fa3be]' : 'text-[#4d6480]'}`}>
                              ±{fmtPu(r.stdDev)}
                            </p>
                            <p className="text-[9px] text-[#4d6480]">CV {cvPct.toFixed(1)}%</p>
                          </div>
                        ) : (
                          <span className="text-[#4d6480] text-[11px]">—</span>
                        )}
                      </td>
                      {/* Tendencia */}
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <TendenciaChip t={r.tendencia} pendiente={r.pendiente} />
                      </td>
                      {/* # Compras */}
                      <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{r.nCompras}</td>
                      {/* Gasto */}
                      <td className="py-2.5 pr-0 text-amber-400 font-600 tabular-nums whitespace-nowrap">
                        {fmt$(r.gastoTotal)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Leyenda de volatilidad */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e2d45]/60 flex-wrap">
          <span className="text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">CV (coef. variación):</span>
          <span className="flex items-center gap-1 text-[10px] text-[#4d6480]">
            <span className="w-2 h-2 rounded-sm bg-amber-500/70 inline-block" /> &gt;20% alta
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#4d6480]">
            <span className="w-2 h-2 rounded-sm bg-[#8fa3be]/40 inline-block" /> 10–20% media
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#4d6480]">
            <span className="w-2 h-2 rounded-sm bg-[#4d6480]/40 inline-block" /> &lt;10% baja
          </span>
          <InfoTooltip text={HELP.regresion} />
        </div>
      </Card>
    </div>
  )
}
