import type { Compra } from '../data/schema'

export function gastoTotal(compras: Compra[], conIva: boolean): number {
  return compras.reduce((sum, c) => sum + (conIva ? c.totalConIva : c.importe), 0)
}

export function ahorroTotal(compras: Compra[]): number {
  return compras.reduce((sum, c) => sum + c.ahorro, 0)
}

// SUPUESTO: confirmar fórmula de % con el usuario
export function porcentajeAhorro(compras: Compra[]): number {
  const base = compras.reduce((sum, c) => sum + c.importe + c.ahorro, 0)
  return base === 0 ? 0 : ahorroTotal(compras) / base
}

export function totalOrdenesUnicas(compras: Compra[]): number {
  return new Set(compras.map((c) => c.ordenCompra)).size
}

export function totalProveedoresUnicos(compras: Compra[]): number {
  return new Set(compras.map((c) => c.proveedor)).size
}

export function ticketPromedio(compras: Compra[]): number {
  const ordenes = totalOrdenesUnicas(compras)
  return ordenes === 0 ? 0 : gastoTotal(compras, false) / ordenes
}

export interface GrupoGasto {
  nombre: string
  importe: number
  totalConIva: number
}

export function gastoPerTipoInsumo(compras: Compra[]): GrupoGasto[] {
  const map = new Map<string, GrupoGasto>()
  for (const c of compras) {
    const g = map.get(c.tipoInsumo) ?? { nombre: c.tipoInsumo, importe: 0, totalConIva: 0 }
    g.importe += c.importe
    g.totalConIva += c.totalConIva
    map.set(c.tipoInsumo, g)
  }
  return [...map.values()].sort((a, b) => b.importe - a.importe)
}

export function gastoPerEmpresa(compras: Compra[]): GrupoGasto[] {
  const map = new Map<string, GrupoGasto>()
  for (const c of compras) {
    const g = map.get(c.empresa) ?? { nombre: c.empresa, importe: 0, totalConIva: 0 }
    g.importe += c.importe
    g.totalConIva += c.totalConIva
    map.set(c.empresa, g)
  }
  return [...map.values()].sort((a, b) => b.importe - a.importe)
}

export interface GrupoCentro {
  centro: number
  importe: number
  totalConIva: number
}

export function gastoPerCentro(compras: Compra[], topN = 8): GrupoCentro[] {
  const map = new Map<number, GrupoCentro>()
  for (const c of compras) {
    const g = map.get(c.centroCostos) ?? { centro: c.centroCostos, importe: 0, totalConIva: 0 }
    g.importe += c.importe
    g.totalConIva += c.totalConIva
    map.set(c.centroCostos, g)
  }
  return [...map.values()].sort((a, b) => b.importe - a.importe).slice(0, topN)
}

export interface ResumenOrden {
  ordenCompra: number
  fecha: Date
  proveedor: string
  empresa: string
  tipoInsumo: string
  totalImporte: number
  nItems: number
}

export function ultimasOrdenes(compras: Compra[], n = 8): ResumenOrden[] {
  const map = new Map<number, ResumenOrden>()
  for (const c of compras) {
    const existing = map.get(c.ordenCompra)
    if (!existing) {
      map.set(c.ordenCompra, {
        ordenCompra: c.ordenCompra,
        fecha: c.fecha,
        proveedor: c.proveedor,
        empresa: c.empresa,
        tipoInsumo: c.tipoInsumo,
        totalImporte: c.importe,
        nItems: 1,
      })
    } else {
      existing.totalImporte += c.importe
      existing.nItems++
      if (c.fecha > existing.fecha) existing.fecha = c.fecha
    }
  }
  return [...map.values()]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, n)
}

// Últimas compras individuales (cada línea del Excel), no agrupadas por OC
export function ultimasCompras(compras: Compra[], n = 12): Compra[] {
  return [...compras]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.ordenCompra - a.ordenCompra)
    .slice(0, n)
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export interface PuntoTiempo {
  label: string
  importe: number
  totalConIva: number
  sortKey: string
}

export function gastoTimeline(compras: Compra[]): {
  data: PuntoTiempo[]
  granularidad: 'semana' | 'mes'
} {
  if (compras.length === 0) return { data: [], granularidad: 'mes' }

  const tiempos = compras.map((c) => c.fecha.getTime())
  const diasRango = (Math.max(...tiempos) - Math.min(...tiempos)) / 86_400_000
  const porMes = diasRango > 60

  const map = new Map<string, PuntoTiempo>()

  for (const c of compras) {
    let sortKey: string
    let label: string
    if (porMes) {
      const yr = c.fecha.getFullYear()
      const mo = c.fecha.getMonth() + 1
      sortKey = `${yr}-${String(mo).padStart(2, '0')}`
      label = c.fecha.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
    } else {
      const yr = c.fecha.getFullYear()
      sortKey = `${yr}-${String(c.semana).padStart(2, '0')}`
      label = `Sem ${c.semana}`
    }
    const g = map.get(sortKey) ?? { label, importe: 0, totalConIva: 0, sortKey }
    g.importe += c.importe
    g.totalConIva += c.totalConIva
    map.set(sortKey, g)
  }

  return {
    data: [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    granularidad: porMes ? 'mes' : 'semana',
  }
}

// ── Ranking de tipos de insumo ────────────────────────────────────────────────

export interface RankingTipo {
  tipo: string
  importe: number
  pctTotal: number
  nOrdenes: number
  insumoTop: string   // descripción del insumo con mayor gasto dentro del tipo
}

export function rankingTipos(compras: Compra[]): RankingTipo[] {
  const total = gastoTotal(compras, false)

  const tipoMap = new Map<
    string,
    { importe: number; ordenes: Set<number>; insumos: Map<string, number> }
  >()

  for (const c of compras) {
    const t = tipoMap.get(c.tipoInsumo) ?? {
      importe: 0,
      ordenes: new Set<number>(),
      insumos: new Map<string, number>(),
    }
    t.importe += c.importe
    t.ordenes.add(c.ordenCompra)
    t.insumos.set(c.descripcion, (t.insumos.get(c.descripcion) ?? 0) + c.importe)
    tipoMap.set(c.tipoInsumo, t)
  }

  return [...tipoMap.entries()]
    .map(([tipo, data]) => {
      const insumoTop =
        [...data.insumos.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'
      return {
        tipo,
        importe: data.importe,
        pctTotal: total > 0 ? data.importe / total : 0,
        nOrdenes: data.ordenes.size,
        insumoTop,
      }
    })
    .sort((a, b) => b.importe - a.importe)
}
