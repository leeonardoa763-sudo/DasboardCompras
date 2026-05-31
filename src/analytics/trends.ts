import type { Compra } from '../data/schema'

export interface PuntoTendencia {
  label: string
  sortKey: string
  importe: number
  totalConIva: number
  acumulado: number
  mediaMovil: number | null   // promedio de 3 periodos; null para los primeros 2
  delta: number               // importe - importe anterior (0 en el primer punto)
  deltaPct: number            // delta / importe anterior (0 en el primer punto)
}

function buildSerie(
  compras: Compra[],
  getKey: (c: Compra) => string,
  getLabel: (c: Compra) => string
): PuntoTendencia[] {
  if (compras.length === 0) return []

  const map = new Map<string, { label: string; importe: number; totalConIva: number }>()
  for (const c of compras) {
    const key = getKey(c)
    const g = map.get(key)
    if (g) {
      g.importe += c.importe
      g.totalConIva += c.totalConIva
    } else {
      map.set(key, { label: getLabel(c), importe: c.importe, totalConIva: c.totalConIva })
    }
  }

  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  let acumulado = 0

  return sorted.map(([sortKey, g], i) => {
    acumulado += g.importe
    const prevImporte = i > 0 ? sorted[i - 1][1].importe : 0
    const delta = i > 0 ? g.importe - prevImporte : 0
    const deltaPct = i > 0 && prevImporte !== 0 ? delta / prevImporte : 0
    const mediaMovil =
      i >= 2
        ? (sorted[i - 2][1].importe + sorted[i - 1][1].importe + g.importe) / 3
        : null
    return { label: g.label, sortKey, importe: g.importe, totalConIva: g.totalConIva, acumulado, mediaMovil, delta, deltaPct }
  })
}

export function serieSemanal(compras: Compra[]): PuntoTendencia[] {
  return buildSerie(
    compras,
    (c) => `${c.fecha.getFullYear()}-${String(c.semana).padStart(2, '0')}`,
    (c) => `S${c.semana}`
  )
}

export function serieMensual(compras: Compra[]): PuntoTendencia[] {
  return buildSerie(
    compras,
    (c) => {
      const yr = c.fecha.getFullYear()
      const mo = c.fecha.getMonth() + 1
      return `${yr}-${String(mo).padStart(2, '0')}`
    },
    (c) => c.fecha.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
  )
}

export interface ComparativaPeriodo {
  labelActual: string
  labelAnterior: string
  importeActual: number
  importeAnterior: number
  delta: number
  deltaPct: number
}

export function comparativaUltimos(serie: PuntoTendencia[]): ComparativaPeriodo | null {
  if (serie.length < 2) return null
  const actual = serie[serie.length - 1]
  const anterior = serie[serie.length - 2]
  return {
    labelActual: actual.label,
    labelAnterior: anterior.label,
    importeActual: actual.importe,
    importeAnterior: anterior.importe,
    delta: actual.importe - anterior.importe,
    deltaPct: anterior.importe !== 0 ? (actual.importe - anterior.importe) / anterior.importe : 0,
  }
}
