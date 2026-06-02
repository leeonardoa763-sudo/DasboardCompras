import type { Compra } from '../data/schema'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoPeriodo = 'mes' | 'semana'

export interface PeriodoReporte {
  tipo: TipoPeriodo
  valor: number   // mes 1-12 o semana ISO
  año: number
  label: string   // "Enero 2025" o "Sem 12 · 2025"
  sortKey: string // para ordenar cronológicamente
}

export interface KPIPeriodo {
  gasto: number
  gastoConIva: number
  ahorro: number
  pctAhorro: number
  nOrdenes: number
  nProveedores: number
  nCompradores: number
  nLineas: number
  ticketPromedio: number
}

export interface VariacionPeriodo {
  deltaGasto: number
  deltaGastoPct: number | null   // null si no hay periodo anterior
  deltaAhorro: number
  deltaOrdenes: number
}

export interface TopFila {
  nombre: string
  importe: number
  pctTotal: number
  extra?: string
}

export interface FilaDetalleReporte {
  ordenCompra: number
  fecha: Date
  proveedor: string
  comprador: string
  descripcion: string
  tipoInsumo: string
  cantidad: number
  unidad: string
  precioUnitario: number
  importe: number
  totalConIva: number
  ahorro: number
}

export interface PuntoDia {
  label: string
  importe: number
  acumulado: number
  nOrdenes: number
}

export interface Reporte {
  periodo: PeriodoReporte
  kpis: KPIPeriodo
  variacion: VariacionPeriodo | null
  topTipos: TopFila[]
  topInsumos: TopFila[]
  topProveedores: TopFila[]
  topCompradores: TopFila[]
  gastoEnTiempo: PuntoDia[]
  compras: FilaDetalleReporte[]
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function buildSortKey(año: number, valor: number): string {
  return `${año}-${String(valor).padStart(2, '0')}`
}

function mesLabel(mes: number, año: number): string {
  const d = new Date(año, mes - 1, 1)
  const m = d.toLocaleDateString('es-MX', { month: 'long' })
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${año}`
}

function semLabel(semana: number, año: number): string {
  return `Sem ${semana} · ${año}`
}

function perteneceAlPeriodo(c: Compra, p: PeriodoReporte): boolean {
  if (p.tipo === 'mes') {
    return c.mes === p.valor && c.fecha.getFullYear() === p.año
  }
  return c.semana === p.valor && c.fecha.getFullYear() === p.año
}

function kpisDeCompras(compras: Compra[]): KPIPeriodo {
  const gasto = compras.reduce((s, c) => s + c.importe, 0)
  const gastoConIva = compras.reduce((s, c) => s + c.totalConIva, 0)
  const ahorro = compras.reduce((s, c) => s + c.ahorro, 0)
  const ordenes = new Set(compras.map((c) => c.ordenCompra)).size
  const proveedores = new Set(compras.map((c) => c.proveedor)).size
  const compradores = new Set(compras.map((c) => c.comprador)).size
  const base = gasto + ahorro
  return {
    gasto,
    gastoConIva,
    ahorro,
    pctAhorro: base > 0 ? ahorro / base : 0,
    nOrdenes: ordenes,
    nProveedores: proveedores,
    nCompradores: compradores,
    nLineas: compras.length,
    ticketPromedio: ordenes > 0 ? gasto / ordenes : 0,
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Devuelve todos los periodos únicos presentes en las compras, ordenados descendente. */
export function periodosDisponibles(compras: Compra[]): {
  meses: PeriodoReporte[]
  semanas: PeriodoReporte[]
} {
  const mesSet = new Map<string, PeriodoReporte>()
  const semSet = new Map<string, PeriodoReporte>()

  for (const c of compras) {
    const año = c.fecha.getFullYear()

    const mk = buildSortKey(año, c.mes)
    if (!mesSet.has(mk)) {
      mesSet.set(mk, { tipo: 'mes', valor: c.mes, año, label: mesLabel(c.mes, año), sortKey: mk })
    }

    const sk = buildSortKey(año, c.semana)
    if (!semSet.has(sk)) {
      semSet.set(sk, { tipo: 'semana', valor: c.semana, año, label: semLabel(c.semana, año), sortKey: sk })
    }
  }

  return {
    meses:   [...mesSet.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
    semanas: [...semSet.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
  }
}

function periodoPrevio(compras: Compra[], p: PeriodoReporte): PeriodoReporte | null {
  const { meses, semanas } = periodosDisponibles(compras)
  const lista = p.tipo === 'mes' ? meses : semanas
  const idx = lista.findIndex((x) => x.sortKey === p.sortKey)
  return idx >= 0 && idx + 1 < lista.length ? lista[idx + 1] : null
}

/** Genera el reporte completo para el periodo elegido. */
export function generarReporte(compras: Compra[], periodo: PeriodoReporte): Reporte {
  const del = compras.filter((c) => perteneceAlPeriodo(c, periodo))
  const kpis = kpisDeCompras(del)

  // Variación vs periodo anterior
  const prev = periodoPrevio(compras, periodo)
  let variacion: VariacionPeriodo | null = null
  if (prev) {
    const kpPrev = kpisDeCompras(compras.filter((c) => perteneceAlPeriodo(c, prev)))
    variacion = {
      deltaGasto:     kpis.gasto - kpPrev.gasto,
      deltaGastoPct:  kpPrev.gasto > 0 ? (kpis.gasto - kpPrev.gasto) / kpPrev.gasto : null,
      deltaAhorro:    kpis.ahorro - kpPrev.ahorro,
      deltaOrdenes:   kpis.nOrdenes - kpPrev.nOrdenes,
    }
  }

  // Top por tipo de insumo (categoría)
  const tipoMap = new Map<string, number>()
  for (const c of del) tipoMap.set(c.tipoInsumo, (tipoMap.get(c.tipoInsumo) ?? 0) + c.importe)
  const topTipos: TopFila[] = [...tipoMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, importe]) => ({ nombre, importe, pctTotal: kpis.gasto > 0 ? importe / kpis.gasto : 0 }))

  // Top insumos
  const insumoMap = new Map<string, number>()
  for (const c of del) insumoMap.set(c.descripcion, (insumoMap.get(c.descripcion) ?? 0) + c.importe)
  const topInsumos: TopFila[] = [...insumoMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([nombre, importe]) => ({ nombre, importe, pctTotal: kpis.gasto > 0 ? importe / kpis.gasto : 0 }))

  // Top proveedores
  const provMap = new Map<string, { importe: number; ordenes: Set<number> }>()
  for (const c of del) {
    const r = provMap.get(c.proveedor) ?? { importe: 0, ordenes: new Set<number>() }
    r.importe += c.importe; r.ordenes.add(c.ordenCompra)
    provMap.set(c.proveedor, r)
  }
  const topProveedores: TopFila[] = [...provMap.entries()]
    .sort((a, b) => b[1].importe - a[1].importe).slice(0, 8)
    .map(([nombre, r]) => ({ nombre, importe: r.importe, pctTotal: kpis.gasto > 0 ? r.importe / kpis.gasto : 0, extra: `${r.ordenes.size} OC` }))

  // Top compradores
  const compMap = new Map<string, { importe: number; ahorro: number }>()
  for (const c of del) {
    const r = compMap.get(c.comprador) ?? { importe: 0, ahorro: 0 }
    r.importe += c.importe; r.ahorro += c.ahorro
    compMap.set(c.comprador, r)
  }
  const topCompradores: TopFila[] = [...compMap.entries()]
    .sort((a, b) => b[1].importe - a[1].importe).slice(0, 8)
    .map(([nombre, r]) => ({
      nombre,
      importe: r.importe,
      pctTotal: kpis.gasto > 0 ? r.importe / kpis.gasto : 0,
      extra: `Ahorro ${fmt$(r.ahorro)}`,
    }))

  // Gasto por día (para la gráfica de tiempo)
  const diaMap = new Map<string, { importe: number; ordenes: Set<number> }>()
  const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  for (const c of del) {
    const key = periodo.tipo === 'mes'
      ? String(c.fecha.getDate()).padStart(2, '0')
      : DIAS_SEM[c.fecha.getDay()]
    const r = diaMap.get(key) ?? { importe: 0, ordenes: new Set<number>() }
    r.importe += c.importe
    r.ordenes.add(c.ordenCompra)
    diaMap.set(key, r)
  }
  const entradasDia = periodo.tipo === 'mes'
    ? [...diaMap.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
    : [...diaMap.entries()].sort((a, b) => {
        const ord = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        return ord.indexOf(a[0]) - ord.indexOf(b[0])
      })
  let acum = 0
  const gastoEnTiempo: PuntoDia[] = entradasDia.map(([label, r]) => {
    acum += r.importe
    return { label, importe: r.importe, acumulado: acum, nOrdenes: r.ordenes.size }
  })

  // Detalle de líneas ordenadas por fecha desc
  const comprasDetalle: FilaDetalleReporte[] = del
    .slice()
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.ordenCompra - a.ordenCompra)
    .map((c) => ({
      ordenCompra: c.ordenCompra,
      fecha: c.fecha,
      proveedor: c.proveedor,
      comprador: c.comprador,
      descripcion: c.descripcion,
      tipoInsumo: c.tipoInsumo,
      cantidad: c.cantidad,
      unidad: c.unidad,
      precioUnitario: c.precioUnitario,
      importe: c.importe,
      totalConIva: c.totalConIva,
      ahorro: c.ahorro,
    }))

  return { periodo, kpis, variacion, topTipos, topInsumos, topProveedores, topCompradores, gastoEnTiempo, compras: comprasDetalle }
}

// Helper de formato monetario sin importar utils (evita dependencia circular en reportes puros)
function fmt$(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
