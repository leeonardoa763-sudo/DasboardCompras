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
