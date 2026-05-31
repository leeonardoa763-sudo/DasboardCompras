import type { Compra } from '../data/schema'

// ── Proveedores ───────────────────────────────────────────────────────────────

export interface ResumenProveedor {
  proveedor: string
  idProveedor: number
  importe: number
  totalConIva: number
  ahorro: number
  nOrdenes: number
  nCompras: number
  nTipos: number
  pctGasto: number
  pctAcumulado: number
}

export function rankingProveedores(compras: Compra[]): ResumenProveedor[] {
  const map = new Map<
    string,
    {
      idProveedor: number
      importe: number
      totalConIva: number
      ahorro: number
      ordenes: Set<number>
      nCompras: number
      tipos: Set<string>
    }
  >()

  for (const c of compras) {
    const r = map.get(c.proveedor) ?? {
      idProveedor: c.idProveedor,
      importe: 0,
      totalConIva: 0,
      ahorro: 0,
      ordenes: new Set<number>(),
      nCompras: 0,
      tipos: new Set<string>(),
    }
    r.importe += c.importe
    r.totalConIva += c.totalConIva
    r.ahorro += c.ahorro
    r.ordenes.add(c.ordenCompra)
    r.nCompras++
    r.tipos.add(c.tipoInsumo)
    map.set(c.proveedor, r)
  }

  const total = [...map.values()].reduce((s, r) => s + r.importe, 0)
  const sorted = [...map.entries()]
    .map(([proveedor, r]) => ({
      proveedor,
      idProveedor: r.idProveedor,
      importe: r.importe,
      totalConIva: r.totalConIva,
      ahorro: r.ahorro,
      nOrdenes: r.ordenes.size,
      nCompras: r.nCompras,
      nTipos: r.tipos.size,
      pctGasto: total > 0 ? r.importe / total : 0,
      pctAcumulado: 0,
    }))
    .sort((a, b) => b.importe - a.importe)

  let acum = 0
  for (const r of sorted) {
    acum += r.pctGasto
    r.pctAcumulado = acum
  }
  return sorted
}

// ── Comparativa de precios entre proveedores ──────────────────────────────────

export interface ProveedorPrecio {
  proveedor: string
  puPromedio: number
  puMin: number
  puMax: number
  nCompras: number
  importe: number
}

export interface CompetenciaPrecio {
  insumoClave: string
  descripcion: string
  tipoInsumo: string
  unidad: string
  proveedores: ProveedorPrecio[]
  puMin: number
  puMax: number
  pctDiferencia: number
  ahorroPotencial: number
}

export function competenciaPreciosProveedores(compras: Compra[]): CompetenciaPrecio[] {
  const insumoMap = new Map<
    string,
    {
      descripcion: string
      tipoInsumo: string
      unidad: string
      porProveedor: Map<
        string,
        { precios: number[]; importe: number; nCompras: number }
      >
    }
  >()

  for (const c of compras) {
    const ins = insumoMap.get(c.insumoClave) ?? {
      descripcion: c.descripcion,
      tipoInsumo: c.tipoInsumo,
      unidad: c.unidad,
      porProveedor: new Map(),
    }
    const prov = ins.porProveedor.get(c.proveedor) ?? { precios: [], importe: 0, nCompras: 0 }
    prov.precios.push(c.precioUnitario)
    prov.importe += c.importe
    prov.nCompras++
    ins.porProveedor.set(c.proveedor, prov)
    insumoMap.set(c.insumoClave, ins)
  }

  const result: CompetenciaPrecio[] = []

  for (const [insumoClave, ins] of insumoMap.entries()) {
    if (ins.porProveedor.size < 2) continue

    const proveedores: ProveedorPrecio[] = [...ins.porProveedor.entries()].map(
      ([proveedor, data]) => {
        const avg = data.precios.reduce((s, p) => s + p, 0) / data.precios.length
        return {
          proveedor,
          puPromedio: avg,
          puMin: Math.min(...data.precios),
          puMax: Math.max(...data.precios),
          nCompras: data.nCompras,
          importe: data.importe,
        }
      }
    ).sort((a, b) => a.puPromedio - b.puPromedio)

    const puMin = Math.min(...proveedores.map((p) => p.puMin))
    const puMax = Math.max(...proveedores.map((p) => p.puMax))
    const pctDiferencia = puMin > 0 ? (puMax - puMin) / puMin : 0
    const gastoTotal = proveedores.reduce((s, p) => s + p.importe, 0)

    result.push({
      insumoClave,
      descripcion: ins.descripcion,
      tipoInsumo: ins.tipoInsumo,
      unidad: ins.unidad,
      proveedores,
      puMin,
      puMax,
      pctDiferencia,
      ahorroPotencial: gastoTotal * pctDiferencia * 0.5,
    })
  }

  return result.sort((a, b) => b.pctDiferencia - a.pctDiferencia)
}

// ── Compradores ───────────────────────────────────────────────────────────────

export interface ResumenComprador {
  comprador: string
  importe: number
  totalConIva: number
  ahorro: number
  nOrdenes: number
  nProveedores: number
  nTipos: number
  pctGasto: number
  pctAhorro: number
}

export function rankingCompradores(compras: Compra[]): ResumenComprador[] {
  const map = new Map<
    string,
    {
      importe: number
      totalConIva: number
      ahorro: number
      ordenes: Set<number>
      proveedores: Set<string>
      tipos: Set<string>
    }
  >()

  for (const c of compras) {
    const r = map.get(c.comprador) ?? {
      importe: 0,
      totalConIva: 0,
      ahorro: 0,
      ordenes: new Set<number>(),
      proveedores: new Set<string>(),
      tipos: new Set<string>(),
    }
    r.importe += c.importe
    r.totalConIva += c.totalConIva
    r.ahorro += c.ahorro
    r.ordenes.add(c.ordenCompra)
    r.proveedores.add(c.proveedor)
    r.tipos.add(c.tipoInsumo)
    map.set(c.comprador, r)
  }

  const totalImporte = [...map.values()].reduce((s, r) => s + r.importe, 0)

  return [...map.entries()]
    .map(([comprador, r]) => ({
      comprador,
      importe: r.importe,
      totalConIva: r.totalConIva,
      ahorro: r.ahorro,
      nOrdenes: r.ordenes.size,
      nProveedores: r.proveedores.size,
      nTipos: r.tipos.size,
      pctGasto: totalImporte > 0 ? r.importe / totalImporte : 0,
      pctAhorro: (r.importe + r.ahorro) > 0 ? r.ahorro / (r.importe + r.ahorro) : 0,
    }))
    .sort((a, b) => b.importe - a.importe)
}

// ── Centros de costo ──────────────────────────────────────────────────────────

export interface ResumenCentro {
  centro: number
  empresa: string
  importe: number
  totalConIva: number
  ahorro: number
  nOrdenes: number
  nProveedores: number
  nCompradores: number
  pctGasto: number
}

export function desgloseCentros(compras: Compra[]): ResumenCentro[] {
  const map = new Map<
    number,
    {
      empresa: string
      importe: number
      totalConIva: number
      ahorro: number
      ordenes: Set<number>
      proveedores: Set<string>
      compradores: Set<string>
    }
  >()

  for (const c of compras) {
    const r = map.get(c.centroCostos) ?? {
      empresa: c.empresa,
      importe: 0,
      totalConIva: 0,
      ahorro: 0,
      ordenes: new Set<number>(),
      proveedores: new Set<string>(),
      compradores: new Set<string>(),
    }
    r.importe += c.importe
    r.totalConIva += c.totalConIva
    r.ahorro += c.ahorro
    r.ordenes.add(c.ordenCompra)
    r.proveedores.add(c.proveedor)
    r.compradores.add(c.comprador)
    map.set(c.centroCostos, r)
  }

  const total = [...map.values()].reduce((s, r) => s + r.importe, 0)

  return [...map.entries()]
    .map(([centro, r]) => ({
      centro,
      empresa: r.empresa,
      importe: r.importe,
      totalConIva: r.totalConIva,
      ahorro: r.ahorro,
      nOrdenes: r.ordenes.size,
      nProveedores: r.proveedores.size,
      nCompradores: r.compradores.size,
      pctGasto: total > 0 ? r.importe / total : 0,
    }))
    .sort((a, b) => b.importe - a.importe)
}
