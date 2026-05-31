import type { Compra } from '../data/schema'

export function gastoTotal(compras: Compra[], conIva: boolean): number {
  return compras.reduce((sum, c) => sum + (conIva ? c.totalConIva : c.importe), 0)
}

export function ahorroTotal(compras: Compra[]): number {
  return compras.reduce((sum, c) => sum + c.ahorro, 0)
}
