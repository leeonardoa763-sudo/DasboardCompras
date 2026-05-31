import { useState, useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import type { Compra } from '../data/schema'
import {
  periodosDisponibles,
  generarReporte,
  type TipoPeriodo,
  type PeriodoReporte,
  type Reporte,
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
  if (delta === 0) return <span className="text-[#4d6480] text-[11px]">sin cambio</span>
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
    <div className={`bg-[#141c2e] border border-[#1e2d45] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-600 uppercase tracking-widest text-[#4d6480] mb-3">
      {children}
    </h2>
  )
}

function MiniKpi({
  label, value, sub, color = '#e8edf5', delta,
}: { label: string; value: string; sub?: string; color?: string; delta?: React.ReactNode }) {
  return (
    <div className="bg-[#0e1420] border border-[#1e2d45] rounded-xl p-3 flex flex-col gap-0.5">
      <p className="text-[9px] font-500 uppercase tracking-widest text-[#4d6480]">{label}</p>
      <p className="text-[16px] font-700 tabular-nums leading-tight" style={{ color }}>{value}</p>
      {delta && <div className="mt-0.5">{delta}</div>}
      {sub && <p className="text-[10px] text-[#4d6480] truncate">{sub}</p>}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#4d6480" strokeWidth="1.2" strokeLinecap="round">
        <rect x="6" y="4" width="28" height="32" rx="3" />
        <line x1="12" y1="14" x2="28" y2="14" />
        <line x1="12" y1="20" x2="28" y2="20" />
        <line x1="12" y1="26" x2="20" y2="26" />
      </svg>
      <p className="text-[13px] text-[#4d6480]">Sin datos para los filtros seleccionados</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipTop({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-[#1a2438] border border-[#1e2d45] rounded-lg px-3 py-2 shadow-xl text-left min-w-[170px]">
      <p className="text-[11px] font-600 text-[#e8edf5] mb-1 truncate max-w-[155px]">{d.nombre}</p>
      <p className="text-[10px] text-[#8fa3be]">Gasto: <span className="text-amber-400 font-600">{fmt$(d.importe)}</span></p>
      <p className="text-[10px] text-[#8fa3be]">% del periodo: <span className="text-[#e8edf5]">{fmtPct(d.pctTotal)}</span></p>
      {d.extra && <p className="text-[10px] text-[#4d6480] mt-0.5">{d.extra}</p>}
    </div>
  )
}

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16']

function TablaTop({ filas, titulo }: { filas: { nombre: string; importe: number; pctTotal: number; extra?: string }[]; titulo: string }) {
  return (
    <div>
      <SectionLabel>{titulo}</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-[#1e2d45]">
              {['#', 'Nombre', 'Gasto s/IVA', '%', 'Detalle'].map((h) => (
                <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.nombre} className="border-b border-[#1e2d45]/30 hover:bg-white/[0.015]">
                <td className="py-1.5 pr-3 text-[#4d6480] tabular-nums">{i + 1}</td>
                <td className="py-1.5 pr-3 text-[#e8edf5] font-500 max-w-[180px] truncate">{f.nombre}</td>
                <td className="py-1.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(f.importe)}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, f.pctTotal * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <span className="text-[10px] text-[#8fa3be] tabular-nums">{fmtPct(f.pctTotal)}</span>
                  </div>
                </td>
                <td className="py-1.5 pr-0 text-[#4d6480] text-[10px]">{f.extra ?? '—'}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#4d6480] text-[11px]">Sin datos</td>
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
  const { periodo, kpis, variacion, topInsumos, topProveedores, topCompradores, compras } = reporte
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const filasMostradas = mostrarTodas ? compras : compras.slice(0, 30)

  return (
    <div className="space-y-4">

      {/* Encabezado del reporte */}
      <div className="bg-gradient-to-r from-[#0e1420] to-[#141c2e] border border-[#1e2d45] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-500 uppercase tracking-widest text-[#4d6480] mb-1">
              Reporte de compras — {periodo.tipo === 'mes' ? 'mensual' : 'semanal'}
            </p>
            <h1 className="text-[22px] font-700 text-[#e8edf5] leading-tight">{periodo.label}</h1>
            {variacion && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#4d6480]">vs periodo anterior:</span>
                <DeltaBadge delta={variacion.deltaGasto} pct={variacion.deltaGastoPct} />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#4d6480]">{fmtNum(kpis.nLineas)} líneas · {kpis.nOrdenes} OC</p>
            <p className="text-[10px] text-[#4d6480] mt-0.5">{kpis.nProveedores} proveedores · {kpis.nCompradores} compradores</p>
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
          color="#e8edf5"
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
          color={kpis.pctAhorro > 0.05 ? '#10b981' : '#8fa3be'}
        />
        <MiniKpi label="Órdenes de compra" value={fmtNum(kpis.nOrdenes)} color="#3b82f6"
          delta={variacion && <DeltaBadge delta={variacion.deltaOrdenes} />}
        />
        <MiniKpi label="Ticket promedio" value={fmt$(kpis.ticketPromedio)} color="#e8edf5" />
        <MiniKpi label="Proveedores" value={fmtNum(kpis.nProveedores)} color="#8b5cf6" />
        <MiniKpi label="Compradores" value={fmtNum(kpis.nCompradores)} color="#06b6d4" />
      </div>

      {/* Gráfica de top insumos */}
      {topInsumos.length > 0 && (
        <Card>
          <SectionLabel>Top insumos por gasto</SectionLabel>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topInsumos} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#4d6480' }}
                tickFormatter={fmtYAxis}
                tickLine={false}
                axisLine={{ stroke: '#1e2d45' }}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 9, fill: '#4d6480' }}
                tickLine={false}
                axisLine={false}
                width={110}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + '…' : v}
              />
              <Tooltip content={<TooltipTop />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="importe" radius={[0, 4, 4, 0]}>
                {topInsumos.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />
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
          <span className="text-[10px] text-[#4d6480]">{fmtNum(compras.length)} líneas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#1e2d45]">
                {['Fecha', 'OC', 'Proveedor', 'Comprador', 'Insumo', 'Tipo', 'Cant.', 'Pu', 'Importe', 'Ahorro'].map((h) => (
                  <th key={h} className="pb-2 pr-3 last:pr-0 text-left text-[9px] font-500 uppercase tracking-wider text-[#4d6480] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasMostradas.map((c, i) => (
                <tr key={i} className="border-b border-[#1e2d45]/30 hover:bg-white/[0.015]">
                  <td className="py-1.5 pr-3 text-[#8fa3be] whitespace-nowrap tabular-nums">{fmtFecha(c.fecha)}</td>
                  <td className="py-1.5 pr-3 text-[#4d6480] tabular-nums">{c.ordenCompra}</td>
                  <td className="py-1.5 pr-3 text-[#e8edf5] max-w-[120px] truncate">{c.proveedor}</td>
                  <td className="py-1.5 pr-3 text-[#8fa3be] whitespace-nowrap">{c.comprador}</td>
                  <td className="py-1.5 pr-3 text-[#e8edf5] font-500 max-w-[160px] truncate">{c.descripcion}</td>
                  <td className="py-1.5 pr-3 text-[#8fa3be] max-w-[90px] truncate text-[10px]">{c.tipoInsumo}</td>
                  <td className="py-1.5 pr-3 text-[#8fa3be] tabular-nums text-right whitespace-nowrap">{fmtNum(c.cantidad)} {c.unidad}</td>
                  <td className="py-1.5 pr-3 text-blue-400 tabular-nums whitespace-nowrap">{fmt$(c.precioUnitario)}</td>
                  <td className="py-1.5 pr-3 text-amber-400 font-600 tabular-nums whitespace-nowrap">{fmt$(c.importe)}</td>
                  <td className="py-1.5 pr-0 tabular-nums whitespace-nowrap" style={{ color: c.ahorro > 0 ? '#10b981' : '#4d6480' }}>
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
        <div className="flex rounded-lg overflow-hidden border border-[#1e2d45] text-[12px]">
          {(['mes', 'semana'] as TipoPeriodo[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTipoPeriodo(t); setPeriodoSel(null) }}
              className={`px-4 py-1.5 transition-colors ${tipoPeriodo === t ? 'bg-blue-600/30 text-blue-300 font-600' : 'bg-[#0e1420] text-[#4d6480] hover:text-[#8fa3be]'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Selector de periodo */}
        <select
          value={periodoActivo?.sortKey ?? ''}
          onChange={(e) => setPeriodoSel(lista.find((p) => p.sortKey === e.target.value) ?? null)}
          className="bg-[#0e1420] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-[12px] text-[#e8edf5] focus:outline-none focus:border-blue-500/50 transition-colors"
        >
          {lista.map((p) => (
            <option key={p.sortKey} value={p.sortKey}>{p.label}</option>
          ))}
        </select>

        {/* Botones de exportación */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={imprimir}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e1420] border border-[#1e2d45] rounded-lg text-[11px] text-[#8fa3be] hover:text-white hover:border-[#2a3f58] transition-colors"
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
          <p className="text-[13px] text-[#4d6480]">
            {lista.length === 0 ? 'No hay periodos disponibles con los filtros actuales.' : 'Selecciona un periodo para generar el reporte.'}
          </p>
        </div>
      )}
    </div>
  )
}
