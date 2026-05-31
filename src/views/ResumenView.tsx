import { useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Compra } from '../data/schema'
import {
  gastoTotal, ahorroTotal, porcentajeAhorro,
  totalOrdenesUnicas, totalProveedoresUnicos, ticketPromedio,
  gastoPerTipoInsumo, gastoPerEmpresa, gastoPerCentro, ultimasOrdenes,
} from '../analytics/selectors'
import KpiCard from '../components/kpi/KpiCard'
import { fmt$, fmtPct, fmtNum, fmtFecha } from '../utils/format'

interface Props { compras: Compra[] }

const PALETTE = [
  '#f59e0b', '#3b82f6', '#10b981', '#a855f7',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipMoneda({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left">
      {label && <p className="text-[10px] text-[#4d6480] mb-1">{label}</p>}
      <p className="text-[13px] font-600 text-amber-400">{fmt$(payload[0].value as number)}</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipDonut({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[#4d6480] mb-1">{d.name as string}</p>
      <p className="text-[13px] font-600" style={{ color: d.payload.fill as string }}>
        {fmt$(d.value as number)}
      </p>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-[10px] font-600 uppercase tracking-widest text-[#4d6480] mb-3">
      {children}
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

export default function ResumenView({ compras }: Props) {
  const sinIva      = useMemo(() => gastoTotal(compras, false), [compras])
  const conIva      = useMemo(() => gastoTotal(compras, true), [compras])
  const ahorro      = useMemo(() => ahorroTotal(compras), [compras])
  const pctAhorro   = useMemo(() => porcentajeAhorro(compras), [compras])
  const nOrdenes    = useMemo(() => totalOrdenesUnicas(compras), [compras])
  const nProvs      = useMemo(() => totalProveedoresUnicos(compras), [compras])
  const ticket      = useMemo(() => ticketPromedio(compras), [compras])

  const porTipo    = useMemo(() => gastoPerTipoInsumo(compras), [compras])
  const porEmpresa = useMemo(() => gastoPerEmpresa(compras), [compras])
  const porCentro  = useMemo(() => gastoPerCentro(compras, 8), [compras])
  const ultimas    = useMemo(() => ultimasOrdenes(compras, 8), [compras])

  if (compras.length === 0) return <EmptyState />

  // Donut: top 6 tipos + "Otros"
  const donutData = (() => {
    const top = porTipo.slice(0, 6)
    const resto = porTipo.slice(6).reduce((s, g) => s + g.importe, 0)
    const slices = top.map((g, i) => ({ name: g.nombre, value: g.importe, fill: PALETTE[i] }))
    if (resto > 0) slices.push({ name: 'Otros', value: resto, fill: '#2a3f58' })
    return slices
  })()

  const centroData = porCentro.map((g) => ({ nombre: `CC ${g.centro}`, importe: g.importe }))
  const centroHeight = Math.max(porCentro.length * 38 + 8, 80)

  return (
    <div className="space-y-5">

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Gasto sin IVA"       value={fmt$(sinIva)}       accent="amber"  />
        <KpiCard label="Gasto + IVA"          value={fmt$(conIva)}       sublabel="incl. 16% IVA"             accent="amber"  />
        <KpiCard label="Ahorro total"         value={fmt$(ahorro)}       accent="green"  />
        <KpiCard label="% Ahorro"             value={fmtPct(pctAhorro)}  sublabel="ahorro / (importe + ahorro)" accent="green"  />
        <KpiCard label="Órdenes de compra"    value={fmtNum(nOrdenes)}   accent="blue"   />
        <KpiCard label="Proveedores activos"  value={fmtNum(nProvs)}     accent="blue"   />
        <KpiCard label="Ticket promedio"      value={fmt$(ticket)}       sublabel="por OC, sin IVA"           accent="purple" />
      </div>

      {/* ── Donut + Empresa ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Donut — tipo de insumo */}
        <Card>
          <SectionLabel>Gasto por tipo de insumo (sin IVA)</SectionLabel>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-[200px] flex-shrink-0">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={`c-${i}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipDonut />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 flex flex-col gap-1.5 w-full">
              {donutData.map((d) => (
                <li key={d.name} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: d.fill }}
                  />
                  <span className="text-[11px] text-[#8fa3be] truncate flex-1">{d.name}</span>
                  <span className="text-[11px] text-[#e8edf5] font-600 flex-shrink-0 tabular-nums">
                    {fmt$(d.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Barras — gasto por empresa */}
        <Card>
          <SectionLabel>Gasto por empresa (sin IVA)</SectionLabel>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={porEmpresa}
              layout="vertical"
              margin={{ top: 2, right: 12, left: 4, bottom: 2 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 11, fill: '#8fa3be' }}
                width={90}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<TooltipMoneda />}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="importe" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {porEmpresa.map((_, i) => (
                  <Cell key={`e-${i}`} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Centro de costos ── */}
      <Card>
        <SectionLabel>Top centros de costo — gasto sin IVA</SectionLabel>
        <ResponsiveContainer width="100%" height={centroHeight}>
          <BarChart
            data={centroData}
            layout="vertical"
            margin={{ top: 2, right: 80, left: 4, bottom: 2 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nombre"
              tick={{ fontSize: 11, fill: '#8fa3be' }}
              width={58}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<TooltipMoneda />}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="importe" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {centroData.map((_, i) => (
                <Cell
                  key={`cc-${i}`}
                  fill="#f59e0b"
                  fillOpacity={Math.max(1 - i * 0.08, 0.4)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Últimas órdenes ── */}
      <Card>
        <SectionLabel>Últimas órdenes de compra</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                {['Fecha', 'OC', 'Proveedor', 'Tipo de insumo', 'Empresa', 'Items', 'Importe s/IVA'].map((h) => (
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
              {ultimas.map((o, i) => (
                <tr
                  key={`${o.ordenCompra}-${i}`}
                  className="border-b border-[#1e2d45]/40 hover:bg-white/[0.015] transition-colors duration-100"
                >
                  <td className="py-2.5 pr-4 text-[#8fa3be] whitespace-nowrap">{fmtFecha(o.fecha)}</td>
                  <td className="py-2.5 pr-4 text-[#8fa3be] font-mono">{o.ordenCompra}</td>
                  <td className="py-2.5 pr-4 text-[#e8edf5] max-w-[160px] truncate">{o.proveedor}</td>
                  <td className="py-2.5 pr-4 text-[#8fa3be] max-w-[130px] truncate">{o.tipoInsumo}</td>
                  <td className="py-2.5 pr-4 text-[#8fa3be] whitespace-nowrap">{o.empresa}</td>
                  <td className="py-2.5 pr-4 text-[#4d6480] text-center tabular-nums">{o.nItems}</td>
                  <td className="py-2.5 pr-0 text-amber-400 font-600 text-right tabular-nums whitespace-nowrap">
                    {fmt$(o.totalImporte)}
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
