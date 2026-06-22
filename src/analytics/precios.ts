import type { Compra } from '../data/schema'
import * as ss from 'simple-statistics'

export interface PuntoPrecio {
  fecha: Date
  diasDesdeInicio: number   // x para la regresión
  fechaLabel: string
  precioUnitario: number
  cantidad: number
  importe: number
  unidad: string
  empresa: string
  proveedor: string
  comprador: string
  centroCostos: number
  ordenCompra: number
}

export interface RegresionLineal {
  pendiente: number       // $/día
  intercepto: number      // precio en t=0 (primer día de la serie)
  r2: number              // coef. de determinación [0, 1]
  proyeccion30d: number   // precio estimado 30 días después de la última compra
}

export interface ResumenInsumo {
  insumoClave: string
  descripcion: string
  tipoInsumo: string
  unidad: string
  nCompras: number
  puMin: number
  puMax: number
  puPromedio: number
  stdDev: number            // desviación estándar absoluta del Pu
  tendencia: 'sube' | 'baja' | 'estable' | 'sin_datos'
  pendiente: number         // $/día de la regresión (0 si sin_datos)
  r2: number
  ultimaFecha: Date
  ultimoPrecio: number
  gastoTotal: number
  cantidadTotal: number
  nProveedores: number
}

/** Devuelve los puntos de precio ordenados por fecha para un id de insumo dado. */
export function seriePrecios(compras: Compra[], insumoClave: string): PuntoPrecio[] {
  const filtradas = compras
    .filter((c) => String(c.insumo) === insumoClave && c.precioUnitario > 0)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  if (filtradas.length === 0) return []

  const t0 = filtradas[0].fecha.getTime()
  return filtradas.map((c) => ({
    fecha: c.fecha,
    diasDesdeInicio: (c.fecha.getTime() - t0) / 86_400_000,
    fechaLabel: c.fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }),
    precioUnitario: c.precioUnitario,
    cantidad: c.cantidad,
    importe: c.importe,
    unidad: c.unidad,
    empresa: c.empresa,
    proveedor: c.proveedor,
    comprador: c.comprador,
    centroCostos: c.centroCostos,
    ordenCompra: c.ordenCompra,
  }))
}

/**
 * Regresión lineal por mínimos cuadrados sobre la serie de precios.
 * Requiere al menos 2 puntos con fechas distintas.
 */
export function calcularRegresion(puntos: PuntoPrecio[]): RegresionLineal | null {
  const distintos = new Set(puntos.map((p) => p.diasDesdeInicio))
  if (distintos.size < 2) return null

  const pairs: [number, number][] = puntos.map((p) => [p.diasDesdeInicio, p.precioUnitario])
  const { m, b } = ss.linearRegression(pairs)
  const lineFunc = ss.linearRegressionLine({ m, b })
  const r2Raw = ss.rSquared(pairs, lineFunc)
  const maxDias = Math.max(...puntos.map((p) => p.diasDesdeInicio))

  return {
    pendiente: m,
    intercepto: b,
    r2: Math.max(0, Math.min(1, r2Raw)),
    proyeccion30d: lineFunc(maxDias + 30),
  }
}

/** Normaliza los precios de la serie a índice base 100 (primer punto = 100). */
export function calcularIndiceBase100(puntos: PuntoPrecio[]): number[] {
  if (puntos.length === 0) return []
  const base = puntos[0].precioUnitario
  if (base === 0) return puntos.map(() => 100)
  return puntos.map((p) => (p.precioUnitario / base) * 100)
}

/**
 * Heurística O(n) para la tabla resumen: compara precio de la primera vs última
 * compra (cronológicamente). Evita correr regresión lineal en todos los insumos
 * al cargar — la regresión completa solo se corre cuando el usuario abre el detalle.
 */
function tendenciaRapida(
  sorted: Compra[]
): { tendencia: ResumenInsumo['tendencia']; pendiente: number } {
  if (sorted.length < 2) return { tendencia: 'sin_datos', pendiente: 0 }
  const diasTotal =
    (sorted[sorted.length - 1].fecha.getTime() - sorted[0].fecha.getTime()) / 86_400_000
  if (diasTotal < 1) return { tendencia: 'estable', pendiente: 0 }
  const p0 = sorted[0].precioUnitario
  const pN = sorted[sorted.length - 1].precioUnitario
  const prom = sorted.reduce((s, c) => s + c.precioUnitario, 0) / sorted.length
  const pendiente = (pN - p0) / diasTotal
  const pctDia = prom > 0 ? pendiente / prom : 0
  return {
    tendencia: pctDia > 0.001 ? 'sube' : pctDia < -0.001 ? 'baja' : 'estable',
    pendiente,
  }
}

/** Construye la tabla resumen de todos los insumos presentes en las compras. */
export function resumenPreciosTodos(compras: Compra[]): ResumenInsumo[] {
  const map = new Map<string, Compra[]>()
  for (const c of compras) {
    if (c.precioUnitario <= 0) continue
    const key = String(c.insumo)
    const arr = map.get(key) ?? []
    arr.push(c)
    map.set(key, arr)
  }

  return [...map.entries()]
    .map(([insumoClave, rows]) => {
      const sorted = rows.slice().sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      const precios = rows.map((c) => c.precioUnitario)
      const puMin = Math.min(...precios)
      const puMax = Math.max(...precios)
      const puPromedio = precios.reduce((s, p) => s + p, 0) / precios.length
      const stdDev = precios.length > 1 ? ss.standardDeviation(precios) : 0
      const { tendencia, pendiente } = tendenciaRapida(sorted)
      const gastoTotal = rows.reduce((s, c) => s + c.importe, 0)
      const cantidadTotal = rows.reduce((s, c) => s + c.cantidad, 0)

      const ultimoPrecio = sorted[sorted.length - 1].precioUnitario
      const nProveedores = new Set(rows.map((c) => c.idProveedor)).size

      return {
        insumoClave,
        descripcion: rows[0].descripcion,
        tipoInsumo: rows[0].tipoInsumo,
        unidad: rows[0].unidad,
        nCompras: rows.length,
        puMin,
        puMax,
        puPromedio,
        stdDev,
        tendencia,
        pendiente,
        r2: 0,
        ultimaFecha: sorted[sorted.length - 1].fecha,
        ultimoPrecio,
        gastoTotal,
        cantidadTotal,
        nProveedores,
      }
    })
    .sort((a, b) => b.gastoTotal - a.gastoTotal)
}
