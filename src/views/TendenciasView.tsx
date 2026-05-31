import { useState, useMemo } from 'react'
import {
  ComposedChart, AreaChart, BarChart,
  Area, Line, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Compra } from '../data/schema'
import type { PuntoTendencia } from '../analytics/trends'
import { serieSemanal, serieMensual, comparativaUltimos } from '../analytics/trends'
import KpiCard from '../components/kpi/KpiCard'
import { fmt$, fmtPct } from '../utils/format'

interface Props { compras: Compra[] }

function fmtYAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

// ── Ayuda contextual ──────────────────────────────────────────────────────────

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
            <button
              onClick={() => setOpen(false)}
              className="mt-2 text-[9px] text-blue-400 hover:text-blue-300 font-500"
            >
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

// ── Tooltips de Recharts ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipGasto({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as PuntoTendencia
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left">
      {label && <p className="text-[10px] text-[#4d6480] mb-1">{label}</p>}
      <p className="text-[13px] font-600 text-blue-400">{fmt$(d.importe)}</p>
      {d.mediaMovil !== null && (
        <p className="text-[11px] text-amber-400 mt-0.5">Media móvil: {fmt$(d.mediaMovil)}</p>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipDelta({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as PuntoTendencia
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left">
      {label && <p className="text-[10px] text-[#4d6480] mb-1">{label}</p>}
      <p className="text-[13px] font-600 text-[#e8edf5]">{fmt$(d.importe)}</p>
      <p className={`text-[11px] mt-0.5 font-500 ${d.delta > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
        {d.delta > 0 ? '+' : ''}{fmt$(d.delta)} ({d.deltaPct > 0 ? '+' : ''}{fmtPct(d.deltaPct)})
      </p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipAcumulado({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left">
      {label && <p className="text-[10px] text-[#4d6480] mb-1">{label}</p>}
      <p className="text-[13px] font-600 text-emerald-400">{fmt$(payload[0].value as number)}</p>
    </div>
  )
}

// ── UI helpers ────────────────────────────────────────────────────────────────

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

// ── Textos de ayuda ───────────────────────────────────────────────────────────

const HELP = {
  kpis:
    'Compara el último periodo con el anterior. "Variación" muestra la diferencia en pesos y en porcentaje: dorado (↑) el gasto subió, verde (↓) bajó. "Acumulado" es la suma de todos los periodos en el rango activo.',
  areaMA:
    'La línea azul es el gasto total de cada periodo. La línea punteada dorada es la media móvil de 3 periodos: promedio del punto actual y los dos anteriores. Suaviza los picos y revela la tendencia real del gasto.',
  deltaBar:
    'Muestra cuánto cambió el gasto respecto al periodo anterior, en porcentaje. Barras doradas: el gasto subió. Barras azules: el gasto bajó. La línea central (0%) es el punto de referencia.',
  acumulado:
    'Suma corriente del gasto desde el primer periodo hasta cada punto. Sirve para ver el ritmo de consumo a lo largo del tiempo y cuánto se ha gastado en total hasta la fecha.',
  tabla:
    'Δ: diferencia en pesos vs el periodo anterior (—en el primero). Δ%: la misma diferencia expresada en porcentaje. Media móvil: promedio de los últimos 3 periodos; disponible a partir del 3er periodo.',
  mediaMovilLeyenda:
    'La media móvil de 3 periodos suaviza las variaciones puntuales para revelar la tendencia real. Se calcula como el promedio del periodo actual y los dos anteriores.',
}

// ── Vista principal ───────────────────────────────────────────────────────────

export default function TendenciasView({ compras }: Props) {
  const [granularidad, setGranularidad] = useState<'mes' | 'semana'>('mes')

  const serieSem = useMemo(() => serieSemanal(compras), [compras])
  const serieMes = useMemo(() => serieMensual(compras), [compras])
  const serie = granularidad === 'semana' ? serieSem : serieMes
  const comp = useMemo(() => comparativaUltimos(serie), [serie])

  if (compras.length === 0) return <EmptyState />

  const last = serie[serie.length - 1]
  const labelPeriodo = granularidad === 'mes' ? 'mes' : 'semana'
  const labelPeriodos = granularidad === 'mes'
    ? (serie.length === 1 ? 'mes' : 'meses')
    : (serie.length === 1 ? 'semana' : 'semanas')

  return (
    <div className="space-y-5">

      {/* ── Selector de granularidad ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['mes', 'semana'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGranularidad(g)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-500 transition-colors ${
              granularidad === g
                ? 'bg-blue-600/80 text-white border border-blue-500/50'
                : 'bg-[#141c2e] border border-[#1e2d45] text-[#8fa3be] hover:text-white hover:border-[#2a3f58]'
            }`}
          >
            {g === 'mes' ? 'Por mes' : 'Por semana'}
          </button>
        ))}
        <span className="text-[11px] text-[#4d6480]">
          {serie.length} {labelPeriodos}
        </span>
      </div>

      {/* ── KPIs comparativos ── */}
      {comp ? (
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-[10px] font-600 uppercase tracking-widest text-[#4d6480]">
              Comparativa de periodos
            </span>
            <InfoTooltip text={HELP.kpis} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label={`Gasto ${comp.labelActual}`} value={fmt$(comp.importeActual)} accent="blue" />
            <KpiCard
              label={`Gasto ${comp.labelAnterior}`}
              value={fmt$(comp.importeAnterior)}
              sublabel="Periodo anterior"
              accent="blue"
            />
            <KpiCard
              label="Variación"
              value={(comp.delta >= 0 ? '+' : '') + fmt$(comp.delta)}
              sublabel={(comp.delta >= 0 ? '↑ ' : '↓ ') + fmtPct(Math.abs(comp.deltaPct)) + ' vs anterior'}
              accent={comp.delta > 0 ? 'amber' : 'green'}
            />
            <KpiCard
              label="Gasto acumulado"
              value={fmt$(last?.acumulado ?? 0)}
              sublabel={`en ${serie.length} ${labelPeriodos}`}
              accent="purple"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard label={last?.label ?? 'Periodo'} value={fmt$(last?.importe ?? 0)} accent="blue" />
          <KpiCard label="Gasto acumulado" value={fmt$(last?.acumulado ?? 0)} accent="purple" />
        </div>
      )}

      {/* ── Área + media móvil ── */}
      {serie.length > 1 && (
        <Card>
          <SectionLabel info={HELP.areaMA}>
            Gasto por {labelPeriodo} + media móvil 3 periodos (sin IVA)
          </SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickFormatter={fmtYAxis}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                content={<TooltipGasto />}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              <Area
                type="monotone"
                dataKey="importe"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradTend)"
                dot={{ r: 3, fill: '#3b82f6', stroke: '#080c14', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#080c14', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="mediaMovil"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-blue-500 rounded" />
              <span className="text-[10px] text-[#4d6480]">Gasto del periodo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="4" viewBox="0 0 16 4">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
              </svg>
              <span className="text-[10px] text-[#4d6480]">Media móvil (3 periodos)</span>
              <InfoTooltip text={HELP.mediaMovilLeyenda} />
            </div>
          </div>
        </Card>
      )}

      {/* ── Variación % periodo a periodo ── */}
      {serie.length > 1 && (
        <Card>
          <SectionLabel info={HELP.deltaBar}>
            Variación vs periodo anterior (%)
          </SectionLabel>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={serie.slice(1)}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<TooltipDelta />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <ReferenceLine y={0} stroke="#1e2d45" strokeWidth={1} />
              <Bar dataKey="deltaPct" maxBarSize={36}>
                {serie.slice(1).map((p, i) => (
                  <Cell
                    key={i}
                    fill={p.deltaPct > 0 ? '#f59e0b' : p.deltaPct < 0 ? '#3b82f6' : '#2a3f58'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-[#4d6480] mt-1.5 flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm inline-block bg-amber-500/80" />
              Gasto subió vs periodo anterior
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm inline-block bg-blue-500/80" />
              Gasto bajó vs periodo anterior
            </span>
          </p>
        </Card>
      )}

      {/* ── Acumulado corriente ── */}
      {serie.length > 1 && (
        <Card>
          <SectionLabel info={HELP.acumulado}>
            Gasto acumulado en el periodo (sin IVA)
          </SectionLabel>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickFormatter={fmtYAxis}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                content={<TooltipAcumulado />}
                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              <Area
                type="monotone"
                dataKey="acumulado"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradAcum)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', stroke: '#080c14', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Tabla detallada ── */}
      <Card>
        <SectionLabel info={HELP.tabla}>
          Detalle por {labelPeriodo}
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                {['Periodo', 'Gasto sin IVA', 'Gasto + IVA', 'Δ vs anterior', 'Δ%', 'Acumulado', 'Media móvil'].map((h) => (
                  <th
                    key={h}
                    className="pb-2.5 pr-4 last:pr-0 text-left text-[10px] font-500 uppercase tracking-wider text-[#4d6480]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...serie].reverse().map((p) => (
                <tr
                  key={p.sortKey}
                  className="border-b border-[#1e2d45]/40 hover:bg-white/[0.015] transition-colors duration-100"
                >
                  <td className="py-2.5 pr-4 text-[#e8edf5] font-500 whitespace-nowrap">{p.label}</td>
                  <td className="py-2.5 pr-4 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(p.importe)}</td>
                  <td className="py-2.5 pr-4 text-[#8fa3be] tabular-nums whitespace-nowrap">{fmt$(p.totalConIva)}</td>
                  <td className={`py-2.5 pr-4 tabular-nums whitespace-nowrap font-500 ${
                    p.delta > 0 ? 'text-amber-400' : p.delta < 0 ? 'text-blue-400' : 'text-[#4d6480]'
                  }`}>
                    {p.delta !== 0 ? (p.delta > 0 ? '+' : '') + fmt$(p.delta) : '—'}
                  </td>
                  <td className={`py-2.5 pr-4 tabular-nums whitespace-nowrap ${
                    p.deltaPct > 0 ? 'text-amber-400' : p.deltaPct < 0 ? 'text-blue-400' : 'text-[#4d6480]'
                  }`}>
                    {p.delta !== 0 ? (
                      <span className="flex items-center gap-0.5">
                        <span>{p.deltaPct > 0 ? '↑' : '↓'}</span>
                        <span>{fmtPct(Math.abs(p.deltaPct))}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-[#e8edf5] tabular-nums whitespace-nowrap">{fmt$(p.acumulado)}</td>
                  <td className="py-2.5 pr-0 text-[#8fa3be] tabular-nums whitespace-nowrap">
                    {p.mediaMovil !== null ? fmt$(p.mediaMovil) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
