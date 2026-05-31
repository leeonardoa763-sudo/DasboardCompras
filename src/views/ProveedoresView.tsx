import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
  Cell,
} from 'recharts'
import type { Compra } from '../data/schema'
import {
  rankingProveedores,
  competenciaPreciosProveedores,
  type ResumenProveedor,
  type CompetenciaPrecio,
} from '../analytics/proveedores'
import { fmt$, fmtPct, fmtNum } from '../utils/format'

interface Props { compras: Compra[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtYAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

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

// ── Tooltip Pareto ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipPareto({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ResumenProveedor
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left min-w-[190px]">
      <p className="text-[11px] font-600 text-[#e8edf5] mb-1 truncate max-w-[170px]">{d.proveedor}</p>
      <div className="space-y-0.5 text-[10px]">
        <p className="text-[#8fa3be]">Gasto sin IVA: <span className="text-amber-400 font-600">{fmt$(d.importe)}</span></p>
        <p className="text-[#8fa3be]">% del total: <span className="text-[#e8edf5]">{fmtPct(d.pctGasto)}</span></p>
        <p className="text-[#8fa3be]">% acumulado: <span className="text-blue-400">{fmtPct(d.pctAcumulado)}</span></p>
        <p className="text-[#8fa3be]">OC: <span className="text-[#e8edf5]">{fmtNum(d.nOrdenes)}</span></p>
        <p className="text-[#8fa3be]">Ahorro: <span className="text-emerald-400">{fmt$(d.ahorro)}</span></p>
      </div>
    </div>
  )
}

// ── Tooltip Competencia ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipCompetencia({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left min-w-[180px]">
      <p className="text-[10px] text-[#4d6480] mb-1">{d.proveedor}</p>
      <p className="text-[13px] font-600 text-blue-400">Prom: {fmt$(d.puPromedio)}</p>
      <div className="mt-1 space-y-0.5 text-[10px]">
        <p className="text-[#8fa3be]">Mín: <span className="text-emerald-400">{fmt$(d.puMin)}</span></p>
        <p className="text-[#8fa3be]">Máx: <span className="text-amber-400">{fmt$(d.puMax)}</span></p>
        <p className="text-[#8fa3be]">Compras: <span className="text-[#e8edf5]">{d.nCompras}</span></p>
        <p className="text-[#8fa3be]">Gasto: <span className="text-[#e8edf5]">{fmt$(d.importe)}</span></p>
      </div>
    </div>
  )
}

// ── Panel de competencia de precios ──────────────────────────────────────────

const PROV_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

function PanelCompetencia({
  item,
  onCerrar,
}: {
  item: CompetenciaPrecio
  onCerrar: () => void
}) {
  const chartData = item.proveedores.map((p, i) => ({ ...p, color: PROV_COLORS[i % PROV_COLORS.length] }))

  return (
    <Card className="mb-1">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[9px] font-500 uppercase tracking-wider px-2 py-0.5 rounded bg-[#1e2d45] text-[#8fa3be] border border-[#2a3f58]">
              {item.tipoInsumo}
            </span>
            <span className="text-[9px] font-500 text-[#4d6480]">{item.unidad}</span>
          </div>
          <h3 className="text-[14px] font-600 text-[#e8edf5] leading-snug">{item.descripcion}</h3>
          <p className="text-[11px] text-[#4d6480] mt-0.5">{item.insumoClave}</p>
        </div>
        <button
          onClick={onCerrar}
          className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1e2d45] hover:bg-[#2a3f58] text-[#4d6480] hover:text-white flex items-center justify-center transition-colors text-[14px]"
          aria-label="Cerrar detalle"
        >×</button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniKpi label="Diferencia %" value={fmtPct(item.pctDiferencia)} color={item.pctDiferencia > 0.3 ? '#f59e0b' : '#10b981'} sub="máx vs mín" />
        <MiniKpi label="Precio mínimo" value={fmt$(item.puMin)} color="#10b981" sub={`${item.proveedores[0].proveedor.slice(0, 20)}`} />
        <MiniKpi label="Precio máximo" value={fmt$(item.puMax)} color="#f59e0b" sub={`${item.proveedores[item.proveedores.length - 1].proveedor.slice(0, 20)}`} />
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
          <XAxis
            dataKey="proveedor"
            tick={{ fontSize: 9, fill: '#4d6480' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2d45' }}
            tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#4d6480' }}
            tickFormatter={fmtYAxis}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <Tooltip content={<TooltipCompetencia />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="puPromedio" name="Precio promedio" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-[#1e2d45]">
              {['Proveedor', 'Pu Prom.', 'Pu Mín.', 'Pu Máx.', '# OC', 'Gasto'].map((h) => (
                <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.proveedores.map((p, i) => (
              <tr key={p.proveedor} className="border-b border-[#1e2d45]/30 hover:bg-white/[0.015]">
                <td className="py-1.5 pr-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PROV_COLORS[i % PROV_COLORS.length] }} />
                    <span className={`${i === 0 ? 'text-emerald-400 font-600' : 'text-[#e8edf5]'} truncate max-w-[140px]`}>{p.proveedor}</span>
                    {i === 0 && <span className="text-[8px] text-emerald-400/70 border border-emerald-500/20 rounded px-1">más barato</span>}
                  </span>
                </td>
                <td className="py-1.5 pr-3 text-blue-400 font-600 tabular-nums">{fmt$(p.puPromedio)}</td>
                <td className="py-1.5 pr-3 text-emerald-400/80 tabular-nums">{fmt$(p.puMin)}</td>
                <td className="py-1.5 pr-3 text-amber-400/80 tabular-nums">{fmt$(p.puMax)}</td>
                <td className="py-1.5 pr-3 text-[#8fa3be] tabular-nums text-center">{p.nCompras}</td>
                <td className="py-1.5 pr-0 text-amber-400 tabular-nums">{fmt$(p.importe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

type SortProv = 'proveedor' | 'importe' | 'ahorro' | 'nOrdenes' | 'pctGasto' | 'nTipos'
type SortComp = 'descripcion' | 'pctDiferencia' | 'puMin' | 'puMax'

export default function ProveedoresView({ compras }: Props) {
  const [sortKey, setSortKey] = useState<SortProv>('importe')
  const [sortAsc, setSortAsc] = useState(false)
  const [sortCompKey, setSortCompKey] = useState<SortComp>('pctDiferencia')
  const [sortCompAsc, setSortCompAsc] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaComp, setBusquedaComp] = useState('')
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [mostrarPareto, setMostrarPareto] = useState(true)

  const ranking = useMemo(() => rankingProveedores(compras), [compras])
  const competencia = useMemo(() => competenciaPreciosProveedores(compras), [compras])

  const rankingFiltrado = useMemo(() => {
    const q = busqueda.toLowerCase()
    const f = q ? ranking.filter((r) => r.proveedor.toLowerCase().includes(q)) : ranking
    return [...f].sort((a, b) => {
      let diff = 0
      if (sortKey === 'proveedor') diff = a.proveedor.localeCompare(b.proveedor)
      else diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortAsc ? diff : -diff
    })
  }, [ranking, busqueda, sortKey, sortAsc])

  const competenciaFiltrada = useMemo(() => {
    const q = busquedaComp.toLowerCase()
    const f = q
      ? competencia.filter(
          (c) =>
            c.descripcion.toLowerCase().includes(q) ||
            c.tipoInsumo.toLowerCase().includes(q)
        )
      : competencia
    return [...f].sort((a, b) => {
      let diff = 0
      if (sortCompKey === 'descripcion') diff = a.descripcion.localeCompare(b.descripcion)
      else diff = (a[sortCompKey] as number) - (b[sortCompKey] as number)
      return sortCompAsc ? diff : -diff
    })
  }, [competencia, busquedaComp, sortCompKey, sortCompAsc])

  const itemSeleccionado = useMemo(
    () => competencia.find((c) => c.insumoClave === seleccionado) ?? null,
    [competencia, seleccionado]
  )

  // Datos para Pareto (top 15)
  const paretoData = useMemo(() => ranking.slice(0, 15), [ranking])

  if (compras.length === 0) return <EmptyState />

  const top1 = ranking[0]
  const top3Pct = ranking.slice(0, 3).reduce((s, r) => s + r.pctGasto, 0)
  const ahorroTotal = ranking.reduce((s, r) => s + r.ahorro, 0)

  function toggleSort(key: SortProv) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function toggleSortComp(key: SortComp) {
    if (sortCompKey === key) setSortCompAsc(!sortCompAsc)
    else { setSortCompKey(key); setSortCompAsc(false) }
  }

  function ThBtn({ col, label, align = 'left' }: { col: SortProv; label: string; align?: string }) {
    const active = sortKey === col
    return (
      <th
        className={`pb-2.5 pr-3 last:pr-0 cursor-pointer select-none whitespace-nowrap text-${align}`}
        onClick={() => toggleSort(col)}
      >
        <span className={`text-[9px] font-500 uppercase tracking-wider flex items-center gap-0.5 ${active ? 'text-blue-400' : 'text-[#4d6480] hover:text-[#8fa3be]'}`}>
          {label}
          <span className="text-[8px]">{active ? (sortAsc ? '↑' : '↓') : ''}</span>
        </span>
      </th>
    )
  }

  function ThBtnComp({ col, label }: { col: SortComp; label: string }) {
    const active = sortCompKey === col
    return (
      <th className="pb-2.5 pr-3 last:pr-0 cursor-pointer select-none whitespace-nowrap text-left" onClick={() => toggleSortComp(col)}>
        <span className={`text-[9px] font-500 uppercase tracking-wider flex items-center gap-0.5 ${active ? 'text-blue-400' : 'text-[#4d6480] hover:text-[#8fa3be]'}`}>
          {label}
          <span className="text-[8px]">{active ? (sortCompAsc ? '↑' : '↓') : ''}</span>
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi label="Proveedores" value={fmtNum(ranking.length)} color="#3b82f6" />
        <MiniKpi
          label="Proveedor #1"
          value={fmtPct(top1?.pctGasto ?? 0)}
          color="#f59e0b"
          sub={top1?.proveedor.slice(0, 22) ?? '—'}
        />
        <MiniKpi
          label="Concentración top 3"
          value={fmtPct(top3Pct)}
          color={top3Pct > 0.6 ? '#ef4444' : top3Pct > 0.4 ? '#f59e0b' : '#10b981'}
          sub="% gasto en top 3"
        />
        <MiniKpi label="Ahorro total" value={fmt$(ahorroTotal)} color="#10b981" />
      </div>

      {/* ── Pareto + Tabla ranking ── */}
      <Card>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <SectionLabel>Ranking de proveedores</SectionLabel>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4d6480]" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="7" cy="7" r="5" /><line x1="11" y1="11" x2="15" y2="15" />
              </svg>
              <input
                type="text"
                placeholder="Buscar proveedor…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-[#0e1420] border border-[#1e2d45] rounded-lg text-[11px] text-[#e8edf5] placeholder-[#4d6480] focus:outline-none focus:border-blue-500/50 w-40 transition-colors"
              />
            </div>
            <button
              onClick={() => setMostrarPareto(!mostrarPareto)}
              className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${mostrarPareto ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-[#0e1420] text-[#4d6480] border-[#1e2d45] hover:text-[#8fa3be]'}`}
            >
              Curva Pareto
            </button>
          </div>
        </div>

        {/* Gráfica Pareto */}
        {mostrarPareto && (
          <div className="mb-4 pb-4 border-b border-[#1e2d45]/60">
            <p className="text-[10px] text-[#4d6480] mb-2">
              Barras: gasto por proveedor (top 15). Línea: % acumulado del gasto total.
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={paretoData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
                <XAxis
                  dataKey="proveedor"
                  tick={{ fontSize: 8, fill: '#4d6480' }}
                  tickLine={false}
                  axisLine={{ stroke: '#1e2d45' }}
                  tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + '…' : v}
                  interval={0}
                />
                <YAxis
                  yAxisId="gasto"
                  orientation="left"
                  tick={{ fontSize: 10, fill: '#4d6480' }}
                  tickFormatter={fmtYAxis}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: '#4d6480' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 1]}
                  width={36}
                />
                <Tooltip content={<TooltipPareto />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                <Bar yAxisId="gasto" dataKey="importe" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} name="Gasto" />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="pctAcumulado"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="% acumulado"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3 rounded-sm bg-blue-500/70" />
                <span className="text-[9px] text-[#4d6480]">Gasto sin IVA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-amber-400 rounded" />
                <span className="text-[9px] text-[#4d6480]">% gasto acumulado</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">#</th>
                <ThBtn col="proveedor" label="Proveedor" />
                <ThBtn col="importe"  label="Gasto s/IVA" />
                <ThBtn col="pctGasto" label="% Total" />
                <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">% Acum.</th>
                <ThBtn col="nOrdenes" label="# OC" />
                <ThBtn col="nTipos"   label="Tipos" />
                <ThBtn col="ahorro"   label="Ahorro" />
              </tr>
            </thead>
            <tbody>
              {rankingFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[12px] text-[#4d6480]">
                    Sin resultados para "{busqueda}"
                  </td>
                </tr>
              ) : (
                rankingFiltrado.map((r, idx) => {
                  const rank = ranking.indexOf(r) + 1
                  const barW = Math.round(r.pctGasto * 100)
                  return (
                    <tr key={r.proveedor} className={`border-b border-[#1e2d45]/40 transition-colors ${idx === 0 && !busqueda ? 'bg-blue-600/[0.04]' : 'hover:bg-white/[0.015]'}`}>
                      <td className="py-2.5 pr-3 text-[#4d6480] tabular-nums text-[11px]">{rank}</td>
                      <td className="py-2.5 pr-3">
                        <p className="text-[#e8edf5] font-500 leading-snug">{r.proveedor}</p>
                        <p className="text-[9px] text-[#4d6480]">ID {r.idProveedor}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(r.importe)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${barW}%` }} />
                          </div>
                          <span className="text-[11px] text-[#8fa3be] tabular-nums">{fmtPct(r.pctGasto)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-blue-400 tabular-nums text-[11px]">{fmtPct(r.pctAcumulado)}</td>
                      <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{fmtNum(r.nOrdenes)}</td>
                      <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{r.nTipos}</td>
                      <td className="py-2.5 pr-0 text-emerald-400 tabular-nums">{fmt$(r.ahorro)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#4d6480] mt-2">
          {rankingFiltrado.length} proveedor{rankingFiltrado.length !== 1 ? 'es' : ''}
          {busqueda && ` de ${ranking.length}`}
        </p>
      </Card>

      {/* ── Comparativa de precios ── */}
      <Card>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <SectionLabel>
            Comparativa de precio por insumo entre proveedores
            <span className="ml-2 text-[#2a3f58] font-400 normal-case">— clic en fila para ver detalle</span>
          </SectionLabel>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4d6480]" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="7" cy="7" r="5" /><line x1="11" y1="11" x2="15" y2="15" />
            </svg>
            <input
              type="text"
              placeholder="Buscar insumo…"
              value={busquedaComp}
              onChange={(e) => setBusquedaComp(e.target.value)}
              className="pl-7 pr-3 py-1.5 bg-[#0e1420] border border-[#1e2d45] rounded-lg text-[11px] text-[#e8edf5] placeholder-[#4d6480] focus:outline-none focus:border-blue-500/50 w-40 transition-colors"
            />
          </div>
        </div>

        {/* Panel de detalle */}
        {itemSeleccionado && (
          <PanelCompetencia
            item={itemSeleccionado}
            onCerrar={() => setSeleccionado(null)}
          />
        )}

        {competenciaFiltrada.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[#4d6480]">
            {busquedaComp ? `Sin resultados para "${busquedaComp}"` : 'No hay insumos comprados a más de un proveedor en este periodo'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2d45]">
                    <ThBtnComp col="descripcion"   label="Insumo" />
                    <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">Tipo · Unid.</th>
                    <ThBtnComp col="puMin"         label="Pu Mín." />
                    <ThBtnComp col="puMax"         label="Pu Máx." />
                    <ThBtnComp col="pctDiferencia" label="Diferencia" />
                    <th className="pb-2.5 pr-3 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]"># Proveedores</th>
                    <th className="pb-2.5 pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">Proveedor más barato</th>
                  </tr>
                </thead>
                <tbody>
                  {competenciaFiltrada.map((c) => {
                    const sel = c.insumoClave === seleccionado
                    const pctVal = c.pctDiferencia
                    const color = pctVal > 0.3 ? '#f59e0b' : pctVal > 0.1 ? '#8fa3be' : '#10b981'
                    return (
                      <tr
                        key={c.insumoClave}
                        onClick={() => setSeleccionado(sel ? null : c.insumoClave)}
                        className={`border-b border-[#1e2d45]/40 cursor-pointer transition-colors duration-100 ${sel ? 'bg-blue-600/[0.08] border-blue-500/20' : 'hover:bg-white/[0.015]'}`}
                      >
                        <td className="py-2.5 pr-3">
                          <p className={`font-500 leading-snug ${sel ? 'text-blue-300' : 'text-[#e8edf5]'}`}>{c.descripcion}</p>
                          <p className="text-[9px] text-[#4d6480]">{c.insumoClave}</p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="text-[#8fa3be] text-[11px] truncate max-w-[100px]">{c.tipoInsumo}</p>
                          <p className="text-[9px] text-[#4d6480]">{c.unidad}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-emerald-400 tabular-nums whitespace-nowrap">{fmt$(c.puMin)}</td>
                        <td className="py-2.5 pr-3 text-amber-400 tabular-nums whitespace-nowrap">{fmt$(c.puMax)}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="text-[11px] font-600 tabular-nums" style={{ color }}>{fmtPct(pctVal)}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-[#8fa3be] tabular-nums text-center">{c.proveedores.length}</td>
                        <td className="py-2.5 pr-0 text-emerald-400 text-[11px] truncate max-w-[140px]">{c.proveedores[0].proveedor}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e2d45]/60 flex-wrap">
              <span className="text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">Diferencia (máx vs mín):</span>
              <span className="flex items-center gap-1 text-[10px] text-[#4d6480]"><span className="w-2 h-2 rounded-sm bg-amber-500/70 inline-block" /> &gt;30% alta</span>
              <span className="flex items-center gap-1 text-[10px] text-[#4d6480]"><span className="w-2 h-2 rounded-sm bg-[#8fa3be]/40 inline-block" /> 10–30% media</span>
              <span className="flex items-center gap-1 text-[10px] text-[#4d6480]"><span className="w-2 h-2 rounded-sm bg-emerald-500/40 inline-block" /> &lt;10% baja</span>
              <p className="text-[10px] text-[#4d6480] ml-auto">{competenciaFiltrada.length} insumo{competenciaFiltrada.length !== 1 ? 's' : ''} con 2+ proveedores</p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
