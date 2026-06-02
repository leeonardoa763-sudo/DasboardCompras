import { useState, useMemo, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  ComposedChart, Area, PieChart, Pie, Cell as PieCell,
} from 'recharts'
import type { Compra } from '../data/schema'
import {
  periodosDisponibles,
  generarReporte,
  type TipoPeriodo,
  type PeriodoReporte,
  type Reporte,
  type PuntoDia,
  type TopFila,
  type FilaDetalleReporte,
} from '../analytics/reports'
import { fmt$, fmtPct, fmtNum, fmtFecha } from '../utils/format'

interface Props { compras: Compra[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtYAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

function DeltaBadge({ delta, pct }: { delta: number; pct?: number | null }) {
  if (delta === 0) return <span className="text-[var(--text-muted)] text-[11px]">sin cambio</span>
  const sube = delta > 0
  const color = sube ? '#ef4444' : '#10b981'
  const arrow = sube ? '↑' : '↓'
  return (
    <span className="text-[11px] font-600 tabular-nums" style={{ color }}>
      {arrow} {fmt$(Math.abs(delta))}
      {pct != null && ` (${fmtPct(Math.abs(pct))})`}
    </span>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-600 uppercase tracking-widest text-[var(--text-muted)] mb-3">
      {children}
    </h2>
  )
}

function MiniKpi({
  label, value, sub, color = 'var(--text-primary)', delta,
}: { label: string; value: string; sub?: string; color?: string; delta?: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-0.5">
      <p className="text-[9px] font-500 uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="text-[19px] font-700 tabular-nums leading-tight" style={{ color }}>{value}</p>
      {delta && <div className="mt-0.5">{delta}</div>}
      {sub && <p className="text-[10px] text-[var(--text-muted)] truncate">{sub}</p>}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round">
        <rect x="6" y="4" width="28" height="32" rx="3" />
        <line x1="12" y1="14" x2="28" y2="14" />
        <line x1="12" y1="20" x2="28" y2="20" />
        <line x1="12" y1="26" x2="20" y2="26" />
      </svg>
      <p className="text-[13px] text-[var(--text-muted)]">Sin datos para los filtros seleccionados</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipTop({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl text-left min-w-[170px]">
      <p className="text-[11px] font-600 text-[var(--text-primary)] mb-1 truncate max-w-[155px]">{d.nombre}</p>
      <p className="text-[10px] text-[var(--text-secondary)]">Gasto: <span className="text-amber-400 font-600">{fmt$(d.importe)}</span></p>
      <p className="text-[10px] text-[var(--text-secondary)]">% del periodo: <span className="text-[var(--text-primary)]">{fmtPct(d.pctTotal)}</span></p>
      {d.extra && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{d.extra}</p>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipDia({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const bar  = payload.find((p: any) => p.dataKey === 'importe')
  const line = payload.find((p: any) => p.dataKey === 'acumulado')
  return (
    <div className="bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl text-left min-w-[160px]">
      <p className="text-[11px] font-600 text-[var(--text-primary)] mb-1">{label}</p>
      {bar  && <p className="text-[10px] text-[var(--text-secondary)]">Gasto: <span className="text-amber-400 font-600">{fmt$(bar.value)}</span></p>}
      {line && <p className="text-[10px] text-[var(--text-secondary)]">Acumulado: <span className="font-600" style={{ color: '#60a5fa' }}>{fmt$(line.value)}</span></p>}
      {bar && <p className="text-[10px] text-[var(--text-muted)]">{payload[0]?.payload?.nOrdenes ?? 0} OC</p>}
    </div>
  )
}

function GraficaTipos({ datos }: { datos: TopFila[] }) {
  if (datos.length === 0) return null
  const visible = datos.slice(0, 8)
  return (
    <Card>
      <SectionLabel>Composición por tipo de insumo</SectionLabel>
      <div className="flex flex-col md:flex-row gap-4 items-center">

        {/* Donut */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={visible}
                dataKey="importe"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                strokeWidth={0}
              >
                {visible.map((_, i) => (
                  <PieCell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [fmt$(v), 'Gasto']}
                contentStyle={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--text-secondary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista */}
        <div className="flex-1 w-full space-y-1.5">
          {visible.map((f, i) => (
            <div key={f.nombre} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-[11px] text-[var(--text-primary)] flex-1 truncate">{f.nombre}</span>
              <span className="text-[11px] font-600 tabular-nums text-amber-400 whitespace-nowrap">{fmt$(f.importe)}</span>
              <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, f.pctTotal * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-8 text-right flex-shrink-0">{fmtPct(f.pctTotal)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function GraficaTiempo({ datos, tipoPeriodo, filtro, onLimpiar }: {
  datos: PuntoDia[]
  tipoPeriodo: TipoPeriodo
  filtro?: string | null
  onLimpiar?: () => void
}) {
  if (datos.length === 0) return null
  const total = datos[datos.length - 1]?.acumulado ?? 0
  const label = tipoPeriodo === 'mes' ? 'Día del mes' : 'Día de la semana'
  return (
    <Card>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SectionLabel>Gasto por {label.toLowerCase()}</SectionLabel>
          {filtro && (
            <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 text-[10px] text-amber-400 font-500 -mt-3">
              {filtro}
              <button onClick={onLimpiar} className="ml-1 hover:text-amber-200 transition-colors leading-none" title="Quitar filtro">×</button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2.5 rounded-sm bg-amber-500/70" />
            Gasto diario
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-blue-400 rounded" />
            Acumulado
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={datos} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={tipoPeriodo === 'mes' ? 2 : 0}
          />
          <YAxis
            yAxisId="bar"
            orientation="left"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v/1_000).toFixed(0)}k` : `$${v}`}
            width={52}
          />
          <YAxis
            yAxisId="line"
            orientation="right"
            tick={{ fontSize: 10, fill: '#60a5fa' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v/1_000).toFixed(0)}k` : `$${v}`}
            domain={[0, total * 1.05]}
            width={52}
          />
          <Tooltip content={<TooltipDia />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar yAxisId="bar" dataKey="importe" fill="#f59e0b" fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Area yAxisId="line" type="monotone" dataKey="acumulado" stroke="#3b82f6" strokeWidth={2} fill="url(#gradAcum)" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

// Tick SVG personalizado que muestra el nombre completo en hasta 2 líneas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TickNombreInsumo({ x, y, payload }: any) {
  const v: string = payload?.value ?? ''
  const MAX = 28
  const l1 = v.slice(0, MAX)
  const l2 = v.length > MAX ? v.slice(MAX, MAX * 2 - 1) + (v.length > MAX * 2 - 1 ? '…' : '') : null
  const dy = l2 ? -5 : 4
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-6} y={0} dy={dy} textAnchor="end" fill="var(--text-muted)" fontSize={9} fontFamily="inherit">{l1}</text>
      {l2 && <text x={-6} y={0} dy={dy + 13} textAnchor="end" fill="var(--text-muted)" fontSize={9} fontFamily="inherit">{l2}</text>}
    </g>
  )
}

// Calcula PuntoDia[] para un subconjunto de compras (usado al filtrar por insumo)
function gastoEnTiempoDe(filas: FilaDetalleReporte[], tipoPeriodo: TipoPeriodo): PuntoDia[] {
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const diaMap = new Map<string, { importe: number; nOrdenes: number }>()
  for (const c of filas) {
    const key = tipoPeriodo === 'mes'
      ? String(c.fecha.getDate()).padStart(2, '0')
      : DIAS[c.fecha.getDay()]
    const r = diaMap.get(key) ?? { importe: 0, nOrdenes: 0 }
    r.importe += c.importe
    r.nOrdenes++
    diaMap.set(key, r)
  }
  const sorted = tipoPeriodo === 'mes'
    ? [...diaMap.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
    : [...diaMap.entries()].sort((a, b) => {
        const ord = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        return ord.indexOf(a[0]) - ord.indexOf(b[0])
      })
  let acum = 0
  return sorted.map(([label, r]) => {
    acum += r.importe
    return { label, importe: r.importe, acumulado: acum, nOrdenes: r.nOrdenes }
  })
}

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16']

function TablaTop({ filas, titulo }: { filas: { nombre: string; importe: number; pctTotal: number; extra?: string }[]; titulo: string }) {
  return (
    <div>
      <SectionLabel>{titulo}</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['#', 'Nombre', 'Gasto s/IVA', '%', 'Detalle'].map((h) => (
                <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.nombre} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)]">
                <td className="py-1.5 pr-3 text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)] font-500 max-w-[180px] truncate">{f.nombre}</td>
                <td className="py-1.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(f.importe)}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, f.pctTotal * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">{fmtPct(f.pctTotal)}</span>
                  </div>
                </td>
                <td className="py-1.5 pr-0 text-[var(--text-muted)] text-[10px]">{f.extra ?? '—'}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--text-muted)] text-[11px]">Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Cuerpo del reporte (también se usa para captura PDF) ──────────────────────

function CuerpoReporte({ reporte }: { reporte: Reporte }) {
  const { periodo, kpis, variacion, topTipos, topInsumos, topProveedores, topCompradores, gastoEnTiempo, compras } = reporte
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [insumoSel, setInsumoSel] = useState<string | null>(null)
  const filasMostradas = mostrarTodas ? compras : compras.slice(0, 30)

  const datosTiempo = useMemo(() => {
    if (!insumoSel) return gastoEnTiempo
    return gastoEnTiempoDe(compras.filter(c => c.descripcion === insumoSel), periodo.tipo)
  }, [insumoSel, compras, gastoEnTiempo, periodo.tipo])

  return (
    <div className="space-y-4">

      {/* Encabezado del reporte */}
      <div
        className="border border-[var(--border)] rounded-xl p-5"
        style={{ background: 'linear-gradient(to right, var(--report-hdr-from), var(--report-hdr-to))' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-500 uppercase tracking-widest text-[var(--text-muted)] mb-1">
              Reporte de compras — {periodo.tipo === 'mes' ? 'mensual' : 'semanal'}
            </p>
            <h1 className="text-[22px] font-700 text-[var(--text-primary)] leading-tight">{periodo.label}</h1>
            {variacion && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[var(--text-muted)]">vs periodo anterior:</span>
                <DeltaBadge delta={variacion.deltaGasto} pct={variacion.deltaGastoPct} />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--text-muted)]">{fmtNum(kpis.nLineas)} líneas · {kpis.nOrdenes} OC</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{kpis.nProveedores} proveedores · {kpis.nCompradores} compradores</p>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi
          label="Gasto sin IVA"
          value={fmt$(kpis.gasto)}
          color="#f59e0b"
          delta={variacion && <DeltaBadge delta={variacion.deltaGasto} pct={variacion.deltaGastoPct} />}
        />
        <MiniKpi
          label="Gasto + IVA"
          value={fmt$(kpis.gastoConIva)}
          color="var(--text-primary)"
        />
        <MiniKpi
          label="Ahorro total"
          value={fmt$(kpis.ahorro)}
          color="#10b981"
          delta={variacion && <DeltaBadge delta={variacion.deltaAhorro} />}
        />
        <MiniKpi
          label="% Ahorro"
          value={fmtPct(kpis.pctAhorro)}
          color={kpis.pctAhorro > 0.05 ? '#10b981' : 'var(--text-secondary)'}
        />
        <MiniKpi label="Órdenes de compra" value={fmtNum(kpis.nOrdenes)} color="#3b82f6"
          delta={variacion && <DeltaBadge delta={variacion.deltaOrdenes} />}
        />
        <MiniKpi label="Ticket promedio" value={fmt$(kpis.ticketPromedio)} color="var(--text-primary)" />
        <MiniKpi label="Proveedores" value={fmtNum(kpis.nProveedores)} color="#8b5cf6" />
        <MiniKpi label="Compradores" value={fmtNum(kpis.nCompradores)} color="#06b6d4" />
      </div>

      {/* Composición por tipo de insumo */}
      <GraficaTipos datos={topTipos} />

      {/* Gráfica de gasto en el tiempo */}
      <GraficaTiempo datos={datosTiempo} tipoPeriodo={periodo.tipo} filtro={insumoSel} onLimpiar={() => setInsumoSel(null)} />

      {/* Gráfica de top insumos */}
      {topInsumos.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <SectionLabel>Top insumos por gasto</SectionLabel>
            <span className="text-[10px] text-[var(--text-muted)] -mt-3">Haz clic en una barra para filtrar la gráfica de tiempo</span>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(260, topInsumos.length * 44)}>
            <BarChart data={topInsumos} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={fmtYAxis}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={<TickNombreInsumo />}
                tickLine={false}
                axisLine={false}
                width={195}
              />
              <Tooltip content={<TooltipTop />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar
                dataKey="importe"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(d: { nombre: string }) => setInsumoSel(d.nombre === insumoSel ? null : d.nombre)}
              >
                {topInsumos.map((f, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={insumoSel === null || insumoSel === f.nombre ? 0.85 : 0.2}
                    stroke={insumoSel === f.nombre ? CHART_COLORS[i % CHART_COLORS.length] : 'none'}
                    strokeWidth={insumoSel === f.nombre ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Tablas top */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <TablaTop filas={topProveedores} titulo="Top proveedores" />
        </Card>
        <Card>
          <TablaTop filas={topCompradores} titulo="Top compradores" />
        </Card>
      </div>

      <Card>
        <TablaTop filas={topInsumos} titulo="Top insumos" />
      </Card>

      {/* Detalle de compras */}
      <Card>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <SectionLabel>Detalle de compras del periodo</SectionLabel>
          <span className="text-[10px] text-[var(--text-muted)]">{fmtNum(compras.length)} líneas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Fecha', 'OC', 'Proveedor', 'Comprador', 'Insumo', 'Tipo', 'Cant.', 'Pu', 'Importe', 'Ahorro'].map((h) => (
                  <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasMostradas.map((c, i) => (
                <tr key={i} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)]">
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)] whitespace-nowrap tabular-nums">{fmtFecha(c.fecha)}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-muted)] tabular-nums">{c.ordenCompra}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-primary)] max-w-[120px] truncate">{c.proveedor}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)] whitespace-nowrap">{c.comprador}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-primary)] font-500 max-w-[160px] truncate">{c.descripcion}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)] max-w-[90px] truncate text-[10px]">{c.tipoInsumo}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)] tabular-nums text-right whitespace-nowrap">{fmtNum(c.cantidad)} {c.unidad}</td>
                  <td className="py-1.5 pr-3 text-blue-400 tabular-nums whitespace-nowrap">{fmt$(c.precioUnitario)}</td>
                  <td className="py-1.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(c.importe)}</td>
                  <td className="py-1.5 pr-0 tabular-nums whitespace-nowrap" style={{ color: c.ahorro > 0 ? '#10b981' : 'var(--text-muted)' }}>
                    {c.ahorro > 0 ? fmt$(c.ahorro) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {compras.length > 30 && (
          <button
            onClick={() => setMostrarTodas(!mostrarTodas)}
            className="mt-3 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            {mostrarTodas ? 'Mostrar menos' : `Ver las ${compras.length - 30} restantes…`}
          </button>
        )}
      </Card>
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

export default function ReportesView({ compras }: Props) {
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('mes')
  const [periodoSel, setPeriodoSel] = useState<PeriodoReporte | null>(null)
  const [exportando, setExportando] = useState(false)
  const reporteRef = useRef<HTMLDivElement>(null)

  const { meses, semanas } = useMemo(() => periodosDisponibles(compras), [compras])
  const lista: PeriodoReporte[] = tipoPeriodo === 'mes' ? meses : semanas

  // Seleccionar el periodo más reciente al cambiar tipo o al cargar datos
  const periodoActivo = useMemo<PeriodoReporte | null>(() => {
    if (periodoSel && lista.some((p) => p.sortKey === periodoSel.sortKey && p.tipo === tipoPeriodo)) {
      return periodoSel
    }
    return lista[0] ?? null
  }, [lista, periodoSel, tipoPeriodo])

  const reporte = useMemo(
    () => (periodoActivo ? generarReporte(compras, periodoActivo) : null),
    [compras, periodoActivo],
  )

  async function descargarPDF() {
    if (!reporteRef.current || !reporte) return
    setExportando(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(reporteRef.current, {
        backgroundColor: '#0a0f1a',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = canvas.width / canvas.height
      const imgW = pageW - 20
      const imgH = imgW / ratio

      let yPos = 10
      let remaining = imgH

      while (remaining > 0) {
        const chunkH = Math.min(pageH - 20, remaining)
        const srcY = (imgH - remaining) / imgH * canvas.height
        const srcH = chunkH / imgH * canvas.height
        const chunk = document.createElement('canvas')
        chunk.width = canvas.width
        chunk.height = srcH
        const ctx = chunk.getContext('2d')!
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
        const chunkData = chunk.toDataURL('image/png')
        if (yPos > 10) pdf.addPage()
        pdf.addImage(chunkData, 'PNG', 10, yPos, imgW, chunkH)
        remaining -= chunkH
        yPos = 10
      }

      pdf.save(`reporte-compras-${reporte.periodo.label.replace(/\s/g, '-').toLowerCase()}.pdf`)
    } finally {
      setExportando(false)
    }
  }

  function imprimir() {
    window.print()
  }

  if (compras.length === 0) return <EmptyState />

  return (
    <div className="space-y-4">

      {/* ── Barra de controles ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Toggle Mes / Semana */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)] text-[12px]">
          {(['mes', 'semana'] as TipoPeriodo[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTipoPeriodo(t); setPeriodoSel(null) }}
              className={`px-4 py-1.5 transition-colors ${tipoPeriodo === t ? 'bg-blue-600/30 text-blue-300 font-600' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Selector de periodo */}
        <select
          value={periodoActivo?.sortKey ?? ''}
          onChange={(e) => setPeriodoSel(lista.find((p) => p.sortKey === e.target.value) ?? null)}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors"
        >
          {lista.map((p) => (
            <option key={p.sortKey} value={p.sortKey}>{p.label}</option>
          ))}
        </select>

        {/* Botones de exportación */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={imprimir}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text-secondary)] hover:text-white hover:border-[var(--color-subtle)] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4,7 4,2 12,2 12,7" />
              <rect x="2" y="7" width="12" height="7" rx="1" />
              <line x1="5" y1="11" x2="11" y2="11" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={descargarPDF}
            disabled={exportando}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[11px] text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportando ? (
              <>
                <svg className="animate-spin" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 2a6 6 0 1 1-4.24 1.76" />
                </svg>
                Generando…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v8M5 7l3 3 3-3" />
                  <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
                </svg>
                Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Cuerpo del reporte ── */}
      {reporte ? (
        <div ref={reporteRef} className="print:bg-white print:text-black">
          <CuerpoReporte reporte={reporte} />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[30vh]">
          <p className="text-[13px] text-[var(--text-muted)]">
            {lista.length === 0 ? 'No hay periodos disponibles con los filtros actuales.' : 'Selecciona un periodo para generar el reporte.'}
          </p>
        </div>
      )}
    </div>
  )
}
