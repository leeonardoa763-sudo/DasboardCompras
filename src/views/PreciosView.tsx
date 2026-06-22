import { useState, useMemo, useEffect, useDeferredValue } from 'react'
import {
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend,
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

function fmtOC(centroCostos: number, ordenCompra: number): string {
  return `${centroCostos}-${String(ordenCompra).padStart(6, '0')}`
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
        className="w-[15px] h-[15px] rounded-full bg-[var(--border)] border border-[var(--color-subtle)] text-[var(--text-muted)] hover:text-white hover:bg-blue-600/60 hover:border-blue-500/50 text-[8px] font-700 flex items-center justify-center transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        aria-label="Más información"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-5 z-50 w-64 bg-[var(--bg-card-hover)] border border-[var(--color-subtle)] rounded-xl p-3 shadow-2xl">
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{text}</p>
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
    <h2 className="text-[10px] font-600 uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center">
      {children}
      {info && <InfoTooltip text={info} />}
    </h2>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round">
        <circle cx="20" cy="20" r="16" />
        <line x1="20" y1="12" x2="20" y2="20" />
        <circle cx="20" cy="27" r="1" fill="var(--text-muted)" stroke="none" />
      </svg>
      <p className="text-[13px] text-[var(--text-muted)]">Sin datos para los filtros seleccionados</p>
    </div>
  )
}

// ── Chip de tendencia ─────────────────────────────────────────────────────────

function TendenciaChip({ t, pendiente }: { t: ResumenInsumo['tendencia']; pendiente: number }) {
  const cfg = {
    sube:      { icon: '↑', label: 'Sube',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    baja:      { icon: '↓', label: 'Baja',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    estable:   { icon: '→', label: 'Estable', cls: 'text-[var(--text-muted)] bg-[var(--border)]/60 border-[var(--border)]' },
    sin_datos: { icon: '—', label: '1 dato',  cls: 'text-[var(--text-muted)] bg-[var(--border)]/60 border-[var(--border)]' },
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

// ── Paleta de colores ────────────────────────────────────────────────────────

const INSUMO_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
]

const EMPRESA_PALETTE = INSUMO_COLORS

function empresaColor(empresas: string[], empresa: string): string {
  if (empresa.toLowerCase().includes('coedessa')) return '#f59e0b'
  const idx = empresas.filter((e) => !e.toLowerCase().includes('coedessa')).indexOf(empresa)
  return idx >= 0 ? EMPRESA_PALETTE[idx % EMPRESA_PALETTE.length] : 'var(--text-muted)'
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipPrecio({ active, payload, label, mostrarIndice }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as {
    fechaLabel: string; precioUnitario: number; regresion: number | null
    indice: number; proveedor: string; empresa: string; comprador: string
    centroCostos: number; ordenCompra: number; cantidad: number
  }
  return (
    <div className="bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl text-left min-w-[170px]">
      <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{label ?? d.fechaLabel}</p>
      {mostrarIndice ? (
        <p className="text-[13px] font-600 text-blue-400">Índice: {d.indice?.toFixed(1)}</p>
      ) : (
        <p className="text-[13px] font-600 text-blue-400">{fmtPu(d.precioUnitario)}</p>
      )}
      {d.regresion !== null && !mostrarIndice && (
        <p className="text-[11px] text-amber-400/80 mt-0.5">Reg.: {fmtPu(d.regresion)}</p>
      )}
      <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] space-y-0.5">
        {d.empresa     && <p className="text-[10px] text-[var(--text-secondary)]">Empresa: <span className="text-[var(--text-primary)]">{d.empresa}</span></p>}
        {d.proveedor   && <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-[170px]">Proveedor: <span className="text-[var(--text-primary)]">{d.proveedor}</span></p>}
        {d.comprador   && <p className="text-[10px] text-[var(--text-secondary)]">Comprador: <span className="text-[var(--text-primary)]">{d.comprador}</span></p>}
        {d.ordenCompra && <p className="text-[10px] text-[var(--text-secondary)]">OC: <span className="text-[var(--text-primary)]">{fmtOC(d.centroCostos, d.ordenCompra)}</span></p>}
        {d.cantidad    && <p className="text-[10px] text-[var(--text-secondary)]">Cantidad: <span className="text-[var(--text-primary)]">{fmtNum(d.cantidad)}</span></p>}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipTimeline({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as {
    fechaLabel: string; cantidad: number; precioUnitario: number
    empresa: string; proveedor: string; comprador: string
    centroCostos: number; ordenCompra: number; importe: number
  }
  return (
    <div className="bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl text-left min-w-[180px]">
      <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{d.fechaLabel}</p>
      <div className="space-y-0.5">
        <p className="text-[12px] font-600 text-[var(--text-primary)]">
          OC <span className="text-blue-400">{fmtOC(d.centroCostos, d.ordenCompra)}</span>
        </p>
        <p className="text-[11px] text-[var(--text-secondary)]">Empresa: <span className="text-[var(--text-primary)]">{d.empresa}</span></p>
        <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[180px]">Proveedor: <span className="text-[var(--text-primary)]">{d.proveedor}</span></p>
        {d.comprador && <p className="text-[11px] text-[var(--text-secondary)]">Comprador: <span className="text-[var(--text-primary)]">{d.comprador}</span></p>}
        <p className="text-[11px] text-[var(--text-secondary)]">Cantidad: <span className="text-emerald-400 font-600">{fmtNum(d.cantidad)}</span></p>
        <p className="text-[11px] text-[var(--text-secondary)]">Precio unit.: <span className="text-blue-400 font-600">{fmtPu(d.precioUnitario)}</span></p>
        <p className="text-[11px] text-[var(--text-secondary)]">Importe: <span className="text-amber-400 font-600">{fmt$(d.importe)}</span></p>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipComparacion({ active, payload, label, resumenMap, modoIndice }: any) {
  if (!active || !payload?.length) return null
  const entries = (payload as any[]).filter((e) => e.value !== null && e.value !== undefined)
  if (entries.length === 0) return null
  return (
    <div className="bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl min-w-[190px]">
      <p className="text-[10px] text-[var(--text-muted)] mb-2">{label}</p>
      {entries.map((entry) => {
        const clave = String(entry.dataKey).replace(/^(idx_|pu_)/, '')
        const res = (resumenMap as Map<string, ResumenInsumo>).get(clave)
        return (
          <div key={entry.dataKey} className="flex items-start gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: entry.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-[var(--text-muted)] truncate">{res?.descripcion ?? clave}</p>
              <p className="text-[12px] font-600" style={{ color: entry.color }}>
                {modoIndice ? `${Number(entry.value).toFixed(1)}` : fmtPu(Number(entry.value))}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Panel de detalle del insumo ───────────────────────────────────────────────

interface MiniKpi { label: string; value: string; sub?: string; color?: string }
function MiniKpiCard({ label, value, sub, color = 'var(--text-primary)' }: MiniKpi) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-3 flex flex-col gap-0.5">
      <p className="text-[9px] font-500 uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="text-[15px] font-700 tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>}
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
    empresa: p.empresa,
    comprador: p.comprador,
    centroCostos: p.centroCostos,
    ordenCompra: p.ordenCompra,
    cantidad: p.cantidad,
    importe: p.importe,
  }))

  const tieneCurva = puntos.length >= 2 && new Set(puntos.map((p) => p.diasDesdeInicio)).size >= 2

  const empresas = useMemo(() => [...new Set(puntos.map((p) => p.empresa))].sort(), [puntos])

  const scatterPorEmpresa = useMemo(() => {
    const groups = new Map<string, typeof puntos>()
    for (const p of puntos) {
      const arr = groups.get(p.empresa) ?? []
      arr.push(p)
      groups.set(p.empresa, arr)
    }
    return groups
  }, [puntos])

  const xDomain = useMemo((): [number, number] => {
    if (puntos.length === 0) return [0, 1]
    const times = puntos.map((p) => p.fecha.getTime())
    const pad = 86_400_000 * 3
    return [Math.min(...times) - pad, Math.max(...times) + pad]
  }, [puntos])

  const cvPct = resumen.puPromedio > 0 ? (resumen.stdDev / resumen.puPromedio) * 100 : 0

  // Totales de la tabla de detalle
  const totalCantidad = puntos.reduce((s, p) => s + p.cantidad, 0)
  const totalImporte  = puntos.reduce((s, p) => s + p.importe, 0)

  // Totales agrupados por unidad (por si hay distintas)
  const totalesPorUnidad = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of puntos) {
      map.set(p.unidad, (map.get(p.unidad) ?? 0) + p.cantidad)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [puntos])

  return (
    <Card className="mb-1">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[9px] font-500 uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--color-subtle)]">
              {resumen.tipoInsumo}
            </span>
            <TendenciaChip t={resumen.tendencia} pendiente={resumen.pendiente} />
          </div>
          <h3 className="text-[14px] font-600 text-[var(--text-primary)] leading-snug">{resumen.descripcion}</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{resumen.insumoClave} · {resumen.unidad}</p>
        </div>
        <button
          onClick={onCerrar}
          className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--border)] hover:bg-[var(--color-subtle)] text-[var(--text-muted)] hover:text-white flex items-center justify-center transition-colors text-[14px]"
          aria-label="Cerrar detalle"
        >
          ×
        </button>
      </div>

      {/* KPIs mini — 6 tarjetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <MiniKpiCard label="Pu Promedio" value={fmtPu(resumen.puPromedio)} color="#3b82f6" />
        <MiniKpiCard label="Pu Mínimo"   value={fmtPu(resumen.puMin)}     color="#10b981" />
        <MiniKpiCard label="Pu Máximo"   value={fmtPu(resumen.puMax)}     color="#f59e0b" />
        <MiniKpiCard
          label="Volatilidad"
          value={resumen.stdDev > 0 ? `±${fmtPu(resumen.stdDev)}` : 'Estable'}
          sub={resumen.stdDev > 0 ? `CV: ${cvPct.toFixed(1)}%` : undefined}
          color={cvPct > 20 ? '#f59e0b' : cvPct > 10 ? 'var(--text-secondary)' : '#10b981'}
        />
        <MiniKpiCard label="# Compras"     value={fmtNum(resumen.nCompras)}      sub={`Gasto: ${fmt$(resumen.gastoTotal)}`} />
        <MiniKpiCard
          label="Cantidad total"
          value={fmtNum(totalCantidad)}
          sub={totalesPorUnidad.length > 1
            ? totalesPorUnidad.map(([u, q]) => `${fmtNum(q)} ${u}`).join(' · ')
            : resumen.unidad}
          color="#10b981"
        />
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
                  : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--color-subtle)]'
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
        <div className="flex items-center justify-center h-24 border border-dashed border-[var(--border)] rounded-lg">
          <p className="text-[12px] text-[var(--text-muted)]">Una sola compra — datos insuficientes para mostrar curva de tendencia</p>
        </div>
      ) : !tieneCurva ? (
        <div className="flex items-center justify-center h-24 border border-dashed border-[var(--border)] rounded-lg">
          <p className="text-[12px] text-[var(--text-muted)]">Todas las compras son de la misma fecha — sin tendencia temporal</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="fechaLabel"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={mostrarIndice ? (v: number) => `${v.toFixed(0)}` : fmtYAxis}
                tickLine={false}
                axisLine={false}
                width={mostrarIndice ? 36 : 52}
              />
              <Tooltip
                content={<TooltipPrecio mostrarIndice={mostrarIndice} />}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              {mostrarIndice ? (
                <>
                  <ReferenceLine y={100} stroke="var(--color-subtle)" strokeDasharray="4 2" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="indice"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6', stroke: 'var(--bg-base)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--bg-base)', strokeWidth: 2 }}
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
                    dot={{ r: 4, fill: '#3b82f6', stroke: 'var(--bg-base)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--bg-base)', strokeWidth: 2 }}
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
                <span className="text-[10px] text-[var(--text-muted)]">
                  {mostrarIndice ? 'Índice base 100' : 'Precio unitario'}
                </span>
              </div>
              {reg && !mostrarIndice && (
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="4" viewBox="0 0 16 4">
                    <line x1="0" y1="2" x2="16" y2="2" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 3" />
                  </svg>
                  <span className="text-[10px] text-[var(--text-muted)]">Tendencia lineal</span>
                </div>
              )}
            </div>
            {reg && !mostrarIndice && (
              <div className="flex items-center gap-3 flex-wrap text-[10px] text-[var(--text-muted)]">
                <span>
                  Pendiente:{' '}
                  <span className={reg.pendiente > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {reg.pendiente > 0 ? '+' : ''}{reg.pendiente.toFixed(3)} $/día
                  </span>
                </span>
                <span>r² = <span className="text-[var(--text-secondary)]">{reg.r2.toFixed(3)}</span></span>
                <span>
                  Proyección +30d:{' '}
                  <span className="text-[var(--text-secondary)]">{fmtPu(reg.proyeccion30d)}</span>
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Gráfica timeline de compras ── */}
      {puntos.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[var(--border)]/60">
          <SectionLabel info="Cada burbuja es una orden de compra. El tamaño es proporcional al importe. Colores por empresa. Pasa el cursor sobre una burbuja para ver todos los detalles.">
            Historial de compras en el tiempo · cantidad por OC
          </SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                type="number"
                dataKey="x"
                domain={xDomain}
                scale="time"
                tickFormatter={(ms: number) =>
                  new Date(ms).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                }
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                name="Fecha"
              />
              <YAxis
                type="number"
                dataKey="y"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtNum(v)}
                width={52}
                name="Cantidad"
              />
              <ZAxis type="number" dataKey="z" range={[30, 220]} />
              <Tooltip
                content={<TooltipTimeline />}
                cursor={{ strokeDasharray: '4 2', stroke: 'var(--color-subtle)' }}
              />
              {empresas.length > 1 && (
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', color: 'var(--text-muted)', paddingTop: '8px' }}
                />
              )}
              {empresas.map((emp, i) => (
                <Scatter
                  key={emp}
                  name={emp}
                  data={(scatterPorEmpresa.get(emp) ?? []).map((p) => ({
                    x: p.fecha.getTime(),
                    y: p.cantidad,
                    z: p.importe,
                    fechaLabel: p.fechaLabel,
                    precioUnitario: p.precioUnitario,
                    empresa: p.empresa,
                    proveedor: p.proveedor,
                    comprador: p.comprador,
                    centroCostos: p.centroCostos,
                    ordenCompra: p.ordenCompra,
                    importe: p.importe,
                    cantidad: p.cantidad,
                  }))}
                  fill={EMPRESA_PALETTE[i % EMPRESA_PALETTE.length]}
                  fillOpacity={0.82}
                  strokeWidth={0}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Historial de compras (tabla) ── */}
      {puntos.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Detalle por compra</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Fecha', 'Empresa', 'Proveedor', 'Cantidad', 'Precio unit.', 'Importe', 'OC'].map((h) => (
                    <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...puntos].reverse().map((p, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)]">
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)] whitespace-nowrap">{p.fechaLabel}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span
                        className="text-[10px] font-500 px-1.5 py-0.5 rounded"
                        style={{
                          color: empresaColor(empresas, p.empresa),
                          background: `${empresaColor(empresas, p.empresa)}18`,
                        }}
                      >
                        {p.empresa}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--text-primary)] max-w-[130px] truncate">{p.proveedor}</td>
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)] tabular-nums">
                      {fmtNum(p.cantidad)} <span className="text-[9px] text-[var(--text-muted)]">{p.unidad}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-blue-400 font-600 tabular-nums">{fmtPu(p.precioUnitario)}</td>
                    <td className="py-1.5 pr-3 text-amber-400 tabular-nums">{fmt$(p.importe)}</td>
                    <td className="py-1.5 pr-0 text-[var(--text-muted)] tabular-nums font-mono">{fmtOC(p.centroCostos, p.ordenCompra)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--bg-surface)]/60">
                  <td colSpan={3} className="py-2 pr-3 text-[9px] font-600 uppercase tracking-wider text-[var(--text-muted)]">
                    Totales ({puntos.length} OC)
                  </td>
                  <td className="py-2 pr-3 font-700 tabular-nums text-[var(--text-primary)]">
                    {totalesPorUnidad.length > 1 ? (
                      <span className="text-[10px]">
                        {totalesPorUnidad.map(([u, q]) => (
                          <span key={u} className="mr-2">{fmtNum(q)} <span className="text-[var(--text-muted)] font-400">{u}</span></span>
                        ))}
                      </span>
                    ) : (
                      <span>{fmtNum(totalCantidad)} <span className="text-[9px] text-[var(--text-muted)] font-400">{resumen.unidad}</span></span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-[10px] text-[var(--text-muted)]">
                    Prom. {fmtPu(resumen.puPromedio)}
                  </td>
                  <td className="py-2 pr-3 text-amber-400 font-700 tabular-nums">{fmt$(totalImporte)}</td>
                  <td className="py-2 pr-0" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Comparación de múltiples insumos ─────────────────────────────────────────

function ComparacionInsumos({
  claves,
  resumenMap,
  puntosMap,
  onRemove,
  onClearAll,
}: {
  claves: string[]
  resumenMap: Map<string, ResumenInsumo>
  puntosMap: Map<string, PuntoPrecio[]>
  onRemove: (clave: string) => void
  onClearAll: () => void
}) {
  const [modoIndice, setModoIndice] = useState(false)

  // Construir datos unificados para la gráfica de comparación
  const chartData = useMemo(() => {
    const allDateStrs = new Set<string>()
    for (const [, puntos] of puntosMap) {
      for (const p of puntos) allDateStrs.add(p.fecha.toISOString().slice(0, 10))
    }
    const sortedDates = [...allDateStrs].sort()

    // Lookup: clave -> fecha ISO -> punto
    const lookup = new Map<string, Map<string, PuntoPrecio>>()
    for (const [clave, puntos] of puntosMap) {
      const dm = new Map<string, PuntoPrecio>()
      for (const p of puntos) dm.set(p.fecha.toISOString().slice(0, 10), p)
      lookup.set(clave, dm)
    }
    const firstPrices = new Map<string, number>()
    for (const [clave, puntos] of puntosMap) {
      if (puntos.length > 0) firstPrices.set(clave, puntos[0].precioUnitario)
    }

    return sortedDates.map((dateStr) => {
      const row: Record<string, number | null | string> = {
        fechaLabel: new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
          day: '2-digit', month: 'short', year: '2-digit',
        }),
      }
      for (const clave of claves) {
        const punto = lookup.get(clave)?.get(dateStr) ?? null
        if (punto) {
          const fp = firstPrices.get(clave) ?? 1
          row[`idx_${clave}`] = +((punto.precioUnitario / fp) * 100).toFixed(2)
          row[`pu_${clave}`] = punto.precioUnitario
        } else {
          row[`idx_${clave}`] = null
          row[`pu_${clave}`] = null
        }
      }
      return row
    })
  }, [claves, puntosMap])

  // Totales por unidad agrupados entre todos los insumos seleccionados
  const totalesPorUnidad = useMemo(() => {
    const map = new Map<string, number>()
    for (const [, puntos] of puntosMap) {
      for (const p of puntos) map.set(p.unidad, (map.get(p.unidad) ?? 0) + p.cantidad)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [puntosMap])

  const gastoTotal = useMemo(() => {
    let sum = 0
    for (const res of claves.map((c) => resumenMap.get(c))) {
      if (res) sum += res.gastoTotal
    }
    return sum
  }, [claves, resumenMap])

  return (
    <Card className="mb-1">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-500 uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Comparando {claves.length} insumos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {claves.map((clave, i) => {
              const res = resumenMap.get(clave)
              const color = INSUMO_COLORS[i % INSUMO_COLORS.length]
              return (
                <span
                  key={clave}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-500 border"
                  style={{ borderColor: `${color}40`, background: `${color}18`, color }}
                >
                  <span>{res?.descripcion ?? clave}</span>
                  <button
                    onClick={() => onRemove(clave)}
                    className="opacity-60 hover:opacity-100 text-[12px] font-700 leading-none ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        </div>
        <button
          onClick={onClearAll}
          className="flex-shrink-0 text-[11px] text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          × Limpiar todo
        </button>
      </div>

      {/* KPIs de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <MiniKpiCard label="Insumos" value={String(claves.length)} color="#3b82f6" />
        <MiniKpiCard label="Gasto total" value={fmt$(gastoTotal)} color="#f59e0b" />
        {totalesPorUnidad.slice(0, 2).map(([u, q]) => (
          <MiniKpiCard key={u} label={`Cantidad · ${u}`} value={fmtNum(q)} color="#10b981" />
        ))}
      </div>

      {/* Toggle modo */}
      <div className="flex items-center gap-2 mb-3">
        {(['indice', 'precio'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setModoIndice(v === 'indice')}
            className={`px-3 py-1 rounded-full text-[11px] font-500 transition-colors border ${
              modoIndice === (v === 'indice')
                ? 'bg-blue-600/80 text-white border-blue-500/50'
                : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--color-subtle)]'
            }`}
          >
            {v === 'indice' ? 'Índice base 100' : 'Precio real ($)'}
          </button>
        ))}
        <InfoTooltip text="Índice base 100 normaliza el precio inicial de cada insumo a 100, permitiendo comparar la evolución relativa entre insumos con precios muy distintos." />
      </div>

      {/* Gráfica comparativa */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="fechaLabel"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={modoIndice ? (v: number) => `${v.toFixed(0)}` : fmtYAxis}
            tickLine={false}
            axisLine={false}
            width={modoIndice ? 36 : 52}
          />
          {modoIndice && (
            <ReferenceLine y={100} stroke="var(--color-subtle)" strokeDasharray="4 2" strokeWidth={1} />
          )}
          <Tooltip
            content={<TooltipComparacion resumenMap={resumenMap} modoIndice={modoIndice} />}
            cursor={{ stroke: 'var(--color-subtle)', strokeWidth: 1, strokeDasharray: '4 2' }}
          />
          {claves.map((clave, i) => (
            <Line
              key={clave}
              type="monotone"
              dataKey={modoIndice ? `idx_${clave}` : `pu_${clave}`}
              stroke={INSUMO_COLORS[i % INSUMO_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: INSUMO_COLORS[i % INSUMO_COLORS.length], stroke: 'var(--bg-base)', strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              connectNulls
              name={resumenMap.get(clave)?.descripcion ?? clave}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Leyenda de líneas */}
      <div className="flex flex-wrap gap-3 mt-2 mb-4">
        {claves.map((clave, i) => {
          const res = resumenMap.get(clave)
          return (
            <div key={clave} className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ background: INSUMO_COLORS[i % INSUMO_COLORS.length] }} />
              <span className="text-[10px] text-[var(--text-muted)]">{res?.descripcion ?? clave}</span>
            </div>
          )
        })}
      </div>

      {/* Tabla comparativa */}
      <div className="mt-2 pt-4 border-t border-[var(--border)]/60">
        <SectionLabel>Comparativa de insumos</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['', 'Insumo', 'Pu Prom', 'Mín', 'Máx', 'Tendencia', '# OC', 'Cantidad', 'Gasto'].map((h) => (
                  <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claves.map((clave, i) => {
                const res = resumenMap.get(clave)
                if (!res) return null
                return (
                  <tr key={clave} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)]">
                    <td className="py-2 pr-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: INSUMO_COLORS[i % INSUMO_COLORS.length] }} />
                    </td>
                    <td className="py-2 pr-3">
                      <p className="font-500 text-[var(--text-primary)] leading-snug">{res.descripcion}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">{res.tipoInsumo} · {res.unidad}</p>
                    </td>
                    <td className="py-2 pr-3 text-blue-400 font-600 tabular-nums whitespace-nowrap">{fmtPu(res.puPromedio)}</td>
                    <td className="py-2 pr-3 text-emerald-400/80 tabular-nums whitespace-nowrap">{fmtPu(res.puMin)}</td>
                    <td className="py-2 pr-3 text-amber-400/80 tabular-nums whitespace-nowrap">{fmtPu(res.puMax)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap"><TendenciaChip t={res.tendencia} pendiente={res.pendiente} /></td>
                    <td className="py-2 pr-3 text-[var(--text-secondary)] tabular-nums text-center">{res.nCompras}</td>
                    <td className="py-2 pr-3 text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                      {fmtNum(res.cantidadTotal)} <span className="text-[9px] text-[var(--text-muted)]">{res.unidad}</span>
                    </td>
                    <td className="py-2 pr-0 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(res.gastoTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[var(--bg-surface)]/60">
                <td colSpan={7} className="py-2 pr-3 text-[9px] font-600 uppercase tracking-wider text-[var(--text-muted)]">
                  Totales
                </td>
                <td className="py-2 pr-3 text-[var(--text-primary)] font-700 text-[10px]">
                  {totalesPorUnidad.map(([u, q]) => (
                    <span key={u} className="mr-2">
                      {fmtNum(q)} <span className="text-[var(--text-muted)] font-400">{u}</span>
                    </span>
                  ))}
                </td>
                <td className="py-2 pr-0 text-amber-400 font-700 tabular-nums whitespace-nowrap">{fmt$(gastoTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Card>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

type SortKey = 'descripcion' | 'puPromedio' | 'puMin' | 'puMax' | 'stdDev' | 'nCompras' | 'gastoTotal' | 'cantidadTotal' | 'tendencia' | 'pendiente'
type QuickFilter = 'todos' | 'recientes' | 'volatil' | 'sube' | 'baja' | 'influyentes'

const PAGE_SIZE = 50

const HELP = {
  volatilidad:
    'Desviación estándar del precio unitario entre todas las compras del insumo. Un valor alto indica que el precio varía mucho entre compras — señal de oportunidad de negociación. CV% = (stdDev / promedio) × 100.',
  regresion:
    'Tendencia lineal calculada por mínimos cuadrados sobre el historial de precios. La pendiente indica cuánto varía el precio por día en promedio. r² mide qué tan bien explica esa recta el comportamiento real (1 = perfecto, 0 = sin patrón).',
}

export default function PreciosView({ compras }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('todos')
  const [diasReciente, setDiasReciente] = useState(30)
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('gastoTotal')
  const [sortAsc, setSortAsc] = useState(false)
  const [pagina, setPagina] = useState(1)

  const comprasDeferred = useDeferredValue(compras)
  const isStale = comprasDeferred !== compras

  const resumen = useMemo(() => resumenPreciosTodos(comprasDeferred), [comprasDeferred])

  const resumenMap = useMemo(() => {
    const map = new Map<string, ResumenInsumo>()
    for (const r of resumen) map.set(r.insumoClave, r)
    return map
  }, [resumen])

  const maxFechaMs = useMemo(
    () => (resumen.length === 0 ? Date.now() : Math.max(...resumen.map((r) => r.ultimaFecha.getTime()))),
    [resumen]
  )

  const resumenTexto = useMemo(() => {
    const q = busqueda.toLowerCase()
    return q
      ? resumen.filter(
          (r) =>
            r.descripcion.toLowerCase().includes(q) ||
            r.tipoInsumo.toLowerCase().includes(q) ||
            r.insumoClave.toLowerCase().includes(q)
        )
      : resumen
  }, [resumen, busqueda])

  // Pareto: insumos que acumulan el 80% del gasto total
  const influyentesInfo = useMemo(() => {
    const totalGasto = resumenTexto.reduce((s, r) => s + r.gastoTotal, 0)
    if (totalGasto === 0) return { claves: new Set<string>(), totalGasto: 0 }
    const sorted = [...resumenTexto].sort((a, b) => b.gastoTotal - a.gastoTotal)
    let acum = 0
    const claves = new Set<string>()
    for (const r of sorted) {
      acum += r.gastoTotal
      claves.add(r.insumoClave)
      if (acum >= totalGasto * 0.8) break
    }
    return { claves, totalGasto }
  }, [resumenTexto])

  const chipCounts = useMemo(() => {
    const umbral = maxFechaMs - diasReciente * 86_400_000
    const cv = (r: ResumenInsumo) => (r.puPromedio > 0 ? (r.stdDev / r.puPromedio) * 100 : 0)
    return {
      recientes:    resumenTexto.filter((r) => r.ultimaFecha.getTime() >= umbral).length,
      volatil:      resumenTexto.filter((r) => r.nCompras > 1 && cv(r) > 10).length,
      sube:         resumenTexto.filter((r) => r.tendencia === 'sube').length,
      baja:         resumenTexto.filter((r) => r.tendencia === 'baja').length,
      influyentes:  influyentesInfo.claves.size,
    }
  }, [resumenTexto, maxFechaMs, diasReciente, influyentesInfo])

  const resumenFiltrado = useMemo(() => {
    const umbral = maxFechaMs - diasReciente * 86_400_000
    const cv = (r: ResumenInsumo) => (r.puPromedio > 0 ? (r.stdDev / r.puPromedio) * 100 : 0)
    const filtrado = resumenTexto.filter((r) => {
      if (quickFilter === 'recientes')   return r.ultimaFecha.getTime() >= umbral
      if (quickFilter === 'volatil')     return r.nCompras > 1 && cv(r) > 10
      if (quickFilter === 'sube')        return r.tendencia === 'sube'
      if (quickFilter === 'baja')        return r.tendencia === 'baja'
      if (quickFilter === 'influyentes') return influyentesInfo.claves.has(r.insumoClave)
      return true
    })

    return [...filtrado].sort((a, b) => {
      let diff = 0
      if (sortKey === 'descripcion')    diff = a.descripcion.localeCompare(b.descripcion)
      else if (sortKey === 'tendencia') diff = a.tendencia.localeCompare(b.tendencia)
      else diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortAsc ? diff : -diff
    })
  }, [resumenTexto, quickFilter, diasReciente, maxFechaMs, sortKey, sortAsc, influyentesInfo])

  // Puntos de precio para todos los insumos seleccionados
  const puntosMap = useMemo(() => {
    const map = new Map<string, PuntoPrecio[]>()
    for (const clave of insumosSeleccionados) {
      map.set(clave, seriePrecios(compras, clave))
    }
    return map
  }, [compras, insumosSeleccionados])

  // Para selección única, datos directos
  const clavesSeleccionadas = useMemo(() => [...insumosSeleccionados], [insumosSeleccionados])
  const seleccionUnica = clavesSeleccionadas.length === 1 ? clavesSeleccionadas[0] : null
  const seleccionado = seleccionUnica ? (resumenMap.get(seleccionUnica) ?? null) : null
  const puntosSeleccionado = seleccionUnica ? (puntosMap.get(seleccionUnica) ?? []) : []

  useEffect(() => { setPagina(1) }, [busqueda, quickFilter, diasReciente, sortKey, sortAsc])

  const paginado = resumenFiltrado.slice(0, pagina * PAGE_SIZE)
  const hayMas = resumenFiltrado.length > paginado.length

  if (compras.length === 0) return <EmptyState />

  function toggleInsumo(clave: string) {
    setInsumosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(clave)) next.delete(clave)
      else next.add(clave)
      return next
    })
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function handleQuickFilter(f: QuickFilter) {
    setQuickFilter(f)
    if (f === 'recientes')        { setSortKey('nCompras');   setSortAsc(false) }
    else if (f === 'volatil')     { setSortKey('stdDev');     setSortAsc(false) }
    else if (f === 'sube')        { setSortKey('pendiente');  setSortAsc(false) }
    else if (f === 'baja')        { setSortKey('pendiente');  setSortAsc(true)  }
    else if (f === 'influyentes') { setSortKey('gastoTotal'); setSortAsc(false) }
    else                          { setSortKey('gastoTotal'); setSortAsc(false) }
  }

  function ThBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    return (
      <th
        className="pb-2.5 pr-3 last:pr-0 text-left cursor-pointer select-none whitespace-nowrap"
        onClick={() => toggleSort(col)}
      >
        <span className={`text-[9px] font-500 uppercase tracking-wider flex items-center gap-0.5 ${active ? 'text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="15" y2="15" />
          </svg>
          <input
            type="text"
            placeholder="Buscar insumo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text-primary)] placeholder-[#4d6480] focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {resumenFiltrado.length} insumo{resumenFiltrado.length !== 1 ? 's' : ''}
          {(busqueda || quickFilter !== 'todos') && ` de ${resumen.length}`}
        </span>
        {insumosSeleccionados.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-blue-400 font-500">
              {insumosSeleccionados.size} seleccionado{insumosSeleccionados.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setInsumosSeleccionados(new Set())}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 transition-colors"
            >
              × Limpiar
            </button>
          </div>
        )}
        {insumosSeleccionados.size === 0 && (
          <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
            · Clic para seleccionar, clic+shift para comparar varios
          </span>
        )}
      </div>

      {/* ── Filtros rápidos ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { id: 'todos',     label: 'Todos',           count: resumenTexto.length,    color: 'neutral' },
          { id: 'recientes', label: 'Recientes',        count: chipCounts.recientes,   color: 'blue'    },
          { id: 'volatil',   label: 'Alta volatilidad', count: chipCounts.volatil,     color: 'amber'   },
          { id: 'sube',      label: '↑ Precio sube',    count: chipCounts.sube,        color: 'amber'   },
          { id: 'baja',        label: '↓ Precio baja',    count: chipCounts.baja,        color: 'emerald' },
          { id: 'influyentes', label: 'Mas influyentes',  count: chipCounts.influyentes, color: 'violet'  },
        ] as const).map((chip) => {
          const active = quickFilter === chip.id
          const cls = {
            neutral: active
              ? 'bg-[var(--color-subtle)] text-white border-[var(--color-subtle)]'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-subtle)] hover:text-white',
            blue: active
              ? 'bg-blue-600/80 text-white border-blue-500/50'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-blue-500/40 hover:text-blue-400',
            amber: active
              ? 'bg-amber-600/80 text-white border-amber-500/50'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-amber-500/40 hover:text-amber-400',
            emerald: active
              ? 'bg-emerald-600/80 text-white border-emerald-500/50'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-400',
            violet: active
              ? 'bg-violet-600/80 text-white border-violet-500/50'
              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-violet-500/40 hover:text-violet-400',
          }[chip.color]
          return (
            <button
              key={chip.id}
              onClick={() => handleQuickFilter(chip.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-500 border bg-[var(--bg-surface)] transition-all ${cls}`}
            >
              {chip.label}
              <span className={`ml-1.5 text-[9px] tabular-nums ${active ? 'opacity-80' : 'opacity-50'}`}>
                {chip.count}
              </span>
            </button>
          )
        })}

        {quickFilter === 'influyentes' && influyentesInfo.totalGasto > 0 && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)]">
              {chipCounts.influyentes} insumos concentran el 80% del gasto total
            </span>
          </div>
        )}

        {quickFilter === 'recientes' && (
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] mr-0.5">Últimos:</span>
            {([7, 30, 60, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiasReciente(d)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-500 transition-colors border ${
                  diasReciente === d
                    ? 'bg-blue-600/80 text-white border-blue-500/50'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {d === 7 ? '7d' : d === 30 ? '1m' : d === 60 ? '2m' : '3m'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel de detalle (1 seleccionado) ── */}
      {seleccionado && clavesSeleccionadas.length === 1 && (
        <DetalleInsumo
          resumen={seleccionado}
          puntos={puntosSeleccionado}
          onCerrar={() => setInsumosSeleccionados(new Set())}
        />
      )}

      {/* ── Panel de comparación (2+ seleccionados) ── */}
      {clavesSeleccionadas.length >= 2 && (
        <ComparacionInsumos
          claves={clavesSeleccionadas}
          resumenMap={resumenMap}
          puntosMap={puntosMap}
          onRemove={(clave) => toggleInsumo(clave)}
          onClearAll={() => setInsumosSeleccionados(new Set())}
        />
      )}

      {/* ── Tabla resumen ── */}
      <Card>
        <SectionLabel info={HELP.volatilidad}>
          Resumen de precios por insumo
          <span className="ml-2 text-[var(--color-subtle)] font-400">— clic para seleccionar · varios clics para comparar</span>
        </SectionLabel>
        <div className={`overflow-x-auto transition-opacity duration-200 ${isStale ? 'opacity-50' : ''}`}>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <ThBtn col="descripcion" label="Insumo" />
                <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap">Tipo · Unid.</th>
                <ThBtn col="puPromedio" label="Pu Prom" />
                <ThBtn col="puMin"      label="Mín" />
                <ThBtn col="puMax"      label="Máx" />
                <ThBtn col="stdDev"     label="Volatilidad" />
                <ThBtn col="tendencia"  label="Tendencia" />
                <ThBtn col="nCompras"      label="# OC" />
                <ThBtn col="cantidadTotal" label="Cantidad" />
                <ThBtn col="gastoTotal"    label="Gasto" />
              </tr>
            </thead>
            <tbody>
              {resumenFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[12px] text-[var(--text-muted)]">
                    Sin insumos para "{busqueda}"
                  </td>
                </tr>
              ) : (
                paginado.map((r) => {
                  const selected = insumosSeleccionados.has(r.insumoClave)
                  const selColor = INSUMO_COLORS[clavesSeleccionadas.indexOf(r.insumoClave) % INSUMO_COLORS.length]
                  const cvPct = r.puPromedio > 0 ? (r.stdDev / r.puPromedio) * 100 : 0
                  return (
                    <tr
                      key={r.insumoClave}
                      onClick={() => toggleInsumo(r.insumoClave)}
                      className={`border-b border-[var(--border)]/40 cursor-pointer transition-colors duration-100 ${
                        selected
                          ? 'bg-blue-600/[0.08] border-blue-500/20'
                          : 'hover:bg-[var(--bg-surface)]'
                      }`}
                      style={selected ? { borderLeftColor: selColor } : {}}
                    >
                      {/* Insumo */}
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          {selected && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: selColor }}
                            />
                          )}
                          <div>
                            <p className={`font-500 leading-snug ${selected ? 'text-blue-300' : 'text-[var(--text-primary)]'}`}>
                              {r.descripcion}
                            </p>
                            <p className="text-[9px] text-[var(--text-muted)]">{r.insumoClave}</p>
                          </div>
                        </div>
                      </td>
                      {/* Tipo + unidad */}
                      <td className="py-2.5 pr-3">
                        <p className="text-[var(--text-secondary)] text-[11px] leading-tight max-w-[110px] truncate">{r.tipoInsumo}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{r.unidad}</p>
                      </td>
                      {/* Pu prom */}
                      <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                        <span className="text-blue-400 font-600">{fmtPu(r.puPromedio)}</span>
                        {quickFilter === 'volatil' && r.nCompras > 1 && (
                          <p className={`text-[9px] font-500 ${
                            r.ultimoPrecio > r.puPromedio * 1.05
                              ? 'text-amber-400'
                              : r.ultimoPrecio < r.puPromedio * 0.95
                              ? 'text-emerald-400'
                              : 'text-[var(--text-muted)]'
                          }`}>
                            Últ: {fmtPu(r.ultimoPrecio)}
                            {r.ultimoPrecio > r.puPromedio * 1.05 ? ' ↑' : r.ultimoPrecio < r.puPromedio * 0.95 ? ' ↓' : ''}
                          </p>
                        )}
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
                            <p className={`tabular-nums text-[11px] font-500 ${cvPct > 20 ? 'text-amber-400' : cvPct > 10 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                              ±{fmtPu(r.stdDev)}
                            </p>
                            <p className="text-[9px] text-[var(--text-muted)]">CV {cvPct.toFixed(1)}%</p>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[11px]">—</span>
                        )}
                      </td>
                      {/* Tendencia */}
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <TendenciaChip t={r.tendencia} pendiente={r.pendiente} />
                      </td>
                      {/* # Compras */}
                      <td className="py-2.5 pr-3 tabular-nums text-center">
                        <span className="text-[var(--text-secondary)]">{r.nCompras}</span>
                        {quickFilter === 'recientes' && (
                          <p className="text-[9px] text-[var(--text-muted)]">
                            {r.ultimaFecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </td>
                      {/* Cantidad */}
                      <td className="py-2.5 pr-3 text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                        {fmtNum(r.cantidadTotal)} <span className="text-[9px] text-[var(--text-muted)]">{r.unidad}</span>
                      </td>
                      {/* Gasto */}
                      <td className="py-2.5 pr-0 tabular-nums whitespace-nowrap">
                        <span className="text-amber-400 font-600">{fmt$(r.gastoTotal)}</span>
                        {quickFilter === 'influyentes' && influyentesInfo.totalGasto > 0 && (
                          <p className="text-[9px] text-violet-400/80">
                            {((r.gastoTotal / influyentesInfo.totalGasto) * 100).toFixed(1)}% del total
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cargar más filas */}
        {hayMas && (
          <div className="flex items-center justify-center pt-3">
            <button
              onClick={() => setPagina((p) => p + 1)}
              className="px-4 py-1.5 rounded-lg text-[11px] font-500 bg-[var(--border)] hover:bg-[var(--color-subtle)] text-[var(--text-secondary)] hover:text-white border border-[var(--color-subtle)] transition-colors"
            >
              Ver más ({resumenFiltrado.length - paginado.length} restantes)
            </button>
          </div>
        )}

        {/* Leyenda de volatilidad */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]/60 flex-wrap">
          <span className="text-[9px] font-500 uppercase tracking-wider text-[var(--text-muted)]">CV (coef. variación):</span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-sm bg-amber-500/70 inline-block" /> &gt;20% alta
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-sm bg-[#8fa3be]/40 inline-block" /> 10–20% media
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-sm bg-[#4d6480]/40 inline-block" /> &lt;10% baja
          </span>
          <InfoTooltip text={HELP.regresion} />
        </div>
      </Card>
    </div>
  )
}
