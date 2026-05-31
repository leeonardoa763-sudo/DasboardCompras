import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import type { Compra } from '../data/schema'
import {
  rankingCompradores,
  desgloseCentros,
  type ResumenComprador,
  type ResumenCentro,
} from '../analytics/proveedores'
import { fmt$, fmtPct, fmtNum } from '../utils/format'

interface Props { compras: Compra[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtYAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

const COMPRADOR_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316',
]

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#141c2e] border border-[#1e2d45] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-600 uppercase tracking-widest text-[#4d6480] mb-3 flex items-center gap-2">
      {children}
    </h2>
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

function MiniKpi({ label, value, sub, color = '#e8edf5' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#0e1420] border border-[#1e2d45] rounded-xl p-3 flex flex-col gap-0.5">
      <p className="text-[9px] font-500 uppercase tracking-widest text-[#4d6480]">{label}</p>
      <p className="text-[16px] font-700 tabular-nums leading-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#4d6480] truncate">{sub}</p>}
    </div>
  )
}

// ── Tooltip Comprador ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipComprador({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ResumenComprador
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left min-w-[190px]">
      <p className="text-[11px] font-600 text-[#e8edf5] mb-1">{d.comprador}</p>
      <div className="space-y-0.5 text-[10px]">
        <p className="text-[#8fa3be]">Gasto s/IVA: <span className="text-amber-400 font-600">{fmt$(d.importe)}</span></p>
        <p className="text-[#8fa3be]">% del total: <span className="text-[#e8edf5]">{fmtPct(d.pctGasto)}</span></p>
        <p className="text-[#8fa3be]">Ahorro: <span className="text-emerald-400">{fmt$(d.ahorro)}</span></p>
        <p className="text-[#8fa3be]">% ahorro: <span className="text-emerald-400">{fmtPct(d.pctAhorro)}</span></p>
        <p className="text-[#8fa3be]">OC: <span className="text-[#e8edf5]">{fmtNum(d.nOrdenes)}</span></p>
        <p className="text-[#8fa3be]">Proveedores: <span className="text-[#e8edf5]">{d.nProveedores}</span></p>
      </div>
    </div>
  )
}

// ── Tooltip Centro ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipCentro({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ResumenCentro
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left min-w-[190px]">
      <p className="text-[11px] font-600 text-[#e8edf5] mb-1">Centro {d.centro}</p>
      <p className="text-[10px] text-[#4d6480] mb-1">{d.empresa}</p>
      <div className="space-y-0.5 text-[10px]">
        <p className="text-[#8fa3be]">Gasto s/IVA: <span className="text-amber-400 font-600">{fmt$(d.importe)}</span></p>
        <p className="text-[#8fa3be]">% del total: <span className="text-[#e8edf5]">{fmtPct(d.pctGasto)}</span></p>
        <p className="text-[#8fa3be]">Ahorro: <span className="text-emerald-400">{fmt$(d.ahorro)}</span></p>
        <p className="text-[#8fa3be]">OC: <span className="text-[#e8edf5]">{fmtNum(d.nOrdenes)}</span></p>
        <p className="text-[#8fa3be]">Proveedores: <span className="text-[#e8edf5]">{d.nProveedores}</span></p>
        <p className="text-[#8fa3be]">Compradores: <span className="text-[#e8edf5]">{d.nCompradores}</span></p>
      </div>
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

type SortComp = 'comprador' | 'importe' | 'ahorro' | 'nOrdenes' | 'pctGasto' | 'pctAhorro' | 'nProveedores'
type SortCentro = 'centro' | 'importe' | 'ahorro' | 'nOrdenes' | 'pctGasto' | 'nProveedores'

export default function CompradoresView({ compras }: Props) {
  const [sortKey, setSortKey] = useState<SortComp>('importe')
  const [sortAsc, setSortAsc] = useState(false)
  const [sortCentroKey, setSortCentroKey] = useState<SortCentro>('importe')
  const [sortCentroAsc, setSortCentroAsc] = useState(false)
  const [vistaGrafica, setVistaGrafica] = useState<'gasto' | 'ahorro'>('gasto')

  const compradores = useMemo(() => rankingCompradores(compras), [compras])
  const centros = useMemo(() => desgloseCentros(compras), [compras])

  const compradoresSorted = useMemo(() => {
    return [...compradores].sort((a, b) => {
      let diff = 0
      if (sortKey === 'comprador') diff = a.comprador.localeCompare(b.comprador)
      else diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortAsc ? diff : -diff
    })
  }, [compradores, sortKey, sortAsc])

  const centrosSorted = useMemo(() => {
    return [...centros].sort((a, b) => {
      let diff = 0
      if (sortCentroKey === 'centro') diff = a.centro - b.centro
      else diff = (a[sortCentroKey] as number) - (b[sortCentroKey] as number)
      return sortCentroAsc ? diff : -diff
    })
  }, [centros, sortCentroKey, sortCentroAsc])

  if (compras.length === 0) return <EmptyState />

  const top1 = compradores[0]
  const ahorroTotal = compradores.reduce((s, c) => s + c.ahorro, 0)
  const topAhorrador = [...compradores].sort((a, b) => b.pctAhorro - a.pctAhorro)[0]

  // Datos para la gráfica de compradores (top 10)
  const graficaData = compradores.slice(0, 10).map((c, i) => ({
    ...c,
    color: COMPRADOR_COLORS[i % COMPRADOR_COLORS.length],
  }))

  function toggleSort(key: SortComp) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function toggleSortCentro(key: SortCentro) {
    if (sortCentroKey === key) setSortCentroAsc(!sortCentroAsc)
    else { setSortCentroKey(key); setSortCentroAsc(false) }
  }

  function ThBtn({ col, label }: { col: SortComp; label: string }) {
    const active = sortKey === col
    return (
      <th className="pb-2.5 pr-3 last:pr-0 cursor-pointer select-none whitespace-nowrap text-left" onClick={() => toggleSort(col)}>
        <span className={`text-[9px] font-500 uppercase tracking-wider flex items-center gap-0.5 ${active ? 'text-blue-400' : 'text-[#4d6480] hover:text-[#8fa3be]'}`}>
          {label}
          <span className="text-[8px]">{active ? (sortAsc ? '↑' : '↓') : ''}</span>
        </span>
      </th>
    )
  }

  function ThBtnCentro({ col, label }: { col: SortCentro; label: string }) {
    const active = sortCentroKey === col
    return (
      <th className="pb-2.5 pr-3 last:pr-0 cursor-pointer select-none whitespace-nowrap text-left" onClick={() => toggleSortCentro(col)}>
        <span className={`text-[9px] font-500 uppercase tracking-wider flex items-center gap-0.5 ${active ? 'text-blue-400' : 'text-[#4d6480] hover:text-[#8fa3be]'}`}>
          {label}
          <span className="text-[8px]">{active ? (sortCentroAsc ? '↑' : '↓') : ''}</span>
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi label="Compradores" value={fmtNum(compradores.length)} color="#3b82f6" />
        <MiniKpi
          label="Comprador #1 por gasto"
          value={fmtPct(top1?.pctGasto ?? 0)}
          color="#f59e0b"
          sub={top1?.comprador ?? '—'}
        />
        <MiniKpi label="Ahorro total" value={fmt$(ahorroTotal)} color="#10b981" />
        <MiniKpi
          label="Mayor % ahorro"
          value={fmtPct(topAhorrador?.pctAhorro ?? 0)}
          color="#10b981"
          sub={topAhorrador?.comprador ?? '—'}
        />
      </div>

      {/* ── Ranking de compradores ── */}
      <Card>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <SectionLabel>Ranking de compradores</SectionLabel>
          <div className="flex items-center gap-2">
            {(['gasto', 'ahorro'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVistaGrafica(v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${
                  vistaGrafica === v
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                    : 'bg-[#0e1420] text-[#4d6480] border-[#1e2d45] hover:text-[#8fa3be]'
                }`}
              >
                {v === 'gasto' ? 'Ver gasto' : 'Ver ahorro'}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfica de barras horizontal */}
        <div className="mb-4 pb-4 border-b border-[#1e2d45]/60">
          <ResponsiveContainer width="100%" height={Math.max(160, graficaData.length * 28)}>
            <BarChart
              data={graficaData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 70, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
                tickFormatter={fmtYAxis}
              />
              <YAxis
                type="category"
                dataKey="comprador"
                tick={{ fontSize: 10, fill: '#8fa3be' }}
                tickLine={false}
                axisLine={false}
                width={66}
                tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + '…' : v}
              />
              <Tooltip content={<TooltipComprador />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
              <Bar
                dataKey={vistaGrafica === 'gasto' ? 'importe' : 'ahorro'}
                radius={[0, 4, 4, 0]}
              >
                {graficaData.map((entry, i) => (
                  <Cell key={i} fill={vistaGrafica === 'gasto' ? entry.color : '#10b981'} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">#</th>
                <ThBtn col="comprador"    label="Comprador" />
                <ThBtn col="importe"      label="Gasto s/IVA" />
                <ThBtn col="pctGasto"     label="% Total" />
                <ThBtn col="ahorro"       label="Ahorro" />
                <ThBtn col="pctAhorro"    label="% Ahorro" />
                <ThBtn col="nOrdenes"     label="# OC" />
                <ThBtn col="nProveedores" label="Prov." />
              </tr>
            </thead>
            <tbody>
              {compradoresSorted.map((c, idx) => {
                const rank = compradores.indexOf(c) + 1
                const barW = Math.round(c.pctGasto * 100)
                const color = COMPRADOR_COLORS[(rank - 1) % COMPRADOR_COLORS.length]
                return (
                  <tr key={c.comprador} className={`border-b border-[#1e2d45]/40 ${idx === 0 && sortKey === 'importe' ? 'bg-blue-600/[0.04]' : 'hover:bg-white/[0.015]'} transition-colors`}>
                    <td className="py-2.5 pr-3 text-[#4d6480] tabular-nums text-[11px]">{rank}</td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[#e8edf5] font-500">{c.comprador}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(c.importe)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${barW}%`, background: color, opacity: 0.7 }} />
                        </div>
                        <span className="text-[11px] text-[#8fa3be] tabular-nums">{fmtPct(c.pctGasto)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-emerald-400 tabular-nums whitespace-nowrap">{fmt$(c.ahorro)}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[11px] font-600 tabular-nums ${c.pctAhorro > 0.05 ? 'text-emerald-400' : c.pctAhorro > 0.02 ? 'text-emerald-400/60' : 'text-[#4d6480]'}`}>
                        {fmtPct(c.pctAhorro)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{fmtNum(c.nOrdenes)}</td>
                    <td className="py-2.5 pr-0 text-[#8fa3be] tabular-nums text-center">{c.nProveedores}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Centros de costo ── */}
      <Card>
        <SectionLabel>Desglose por centro de costo</SectionLabel>

        {/* Gráfica horizontal */}
        <div className="mb-4 pb-4 border-b border-[#1e2d45]/60">
          <ResponsiveContainer width="100%" height={Math.max(160, Math.min(centros.length, 12) * 26)}>
            <BarChart
              data={centros.slice(0, 12)}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 54, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
                tickFormatter={fmtYAxis}
              />
              <YAxis
                type="category"
                dataKey="centro"
                tick={{ fontSize: 10, fill: '#8fa3be' }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<TooltipCentro />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
              <Bar dataKey="importe" fill="#8b5cf6" fillOpacity={0.75} radius={[0, 4, 4, 0]} name="Gasto" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla centros */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                <ThBtnCentro col="centro"      label="Centro" />
                <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">Empresa</th>
                <ThBtnCentro col="importe"     label="Gasto s/IVA" />
                <ThBtnCentro col="pctGasto"    label="%" />
                <ThBtnCentro col="ahorro"      label="Ahorro" />
                <ThBtnCentro col="nOrdenes"    label="# OC" />
                <ThBtnCentro col="nProveedores" label="Prov." />
                <th className="pb-2.5 pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">Compradores</th>
              </tr>
            </thead>
            <tbody>
              {centrosSorted.map((c) => {
                const barW = Math.round(c.pctGasto * 100)
                return (
                  <tr key={c.centro} className="border-b border-[#1e2d45]/40 hover:bg-white/[0.015] transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="text-[#e8edf5] font-600 tabular-nums">{c.centro}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#8fa3be] text-[11px]">{c.empresa}</td>
                    <td className="py-2.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(c.importe)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500/70 rounded-full" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="text-[11px] text-[#8fa3be] tabular-nums">{fmtPct(c.pctGasto)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-emerald-400 tabular-nums whitespace-nowrap">{fmt$(c.ahorro)}</td>
                    <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{fmtNum(c.nOrdenes)}</td>
                    <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{c.nProveedores}</td>
                    <td className="py-2.5 pr-0 text-[#8fa3be] tabular-nums text-center">{c.nCompradores}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#4d6480] mt-2">{centros.length} centro{centros.length !== 1 ? 's' : ''} de costo</p>
      </Card>
    </div>
  )
}
