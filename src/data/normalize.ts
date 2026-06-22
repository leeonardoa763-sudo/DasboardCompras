import { HEADERS, HEADER_ALIASES } from './schema'
import type { Compra, ParseResult } from './schema'

type RawRow = Record<string, unknown>

// ── Helpers de conversión defensivos ────────────────────────────────

function toStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  return String(v).trim()
}

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return isFinite(n) ? n : null
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseDateString(value: string): Date | null {
  const text = value.trim()
  if (!text) return null

  const parsed = new Date(text)
  if (!isNaN(parsed.getTime())) return parsed

  const match = text.match(/^\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/)
  if (!match) return null

  const [, day, month, yearRaw, hours = '0', minutes = '0', seconds = '0'] = match
  const year = yearRaw.length === 2 ? Number(yearRaw) + (Number(yearRaw) > 50 ? 1900 : 2000) : Number(yearRaw)
  const date = new Date(year, Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds))
  return isNaN(date.getTime()) ? null : date
}

function toDate(v: unknown): Date | null {
  if (v == null) return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  // SheetJS puede devolver número serial de Excel o string
  if (typeof v === 'number') {
    // Serial de Excel: días desde 1900-01-00 (con bug de 1900 como bisiesto)
    const date = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(date.getTime()) ? null : date
  }
  if (typeof v === 'string') {
    return parseDateString(v)
  }
  return null
}

// ── Normalización de una fila ────────────────────────────────────────

function normalizeRow(
  raw: RawRow,
  rowNum: number,
  advertencias: string[],
): Compra | null {
  const warn = (msg: string) => advertencias.push(`Fila ${rowNum}: ${msg}`)

  // Remapear por nombre de encabezado exacto
  const mapped: Partial<Record<keyof Compra, unknown>> = {}
  for (const [excelKey, field] of Object.entries(HEADERS)) {
    if (excelKey in raw) {
      mapped[field] = raw[excelKey]
    }
  }

  // Verificar campos obligatorios mínimos
  const empresa = toStr(mapped.empresa)
  if (!empresa) { warn('campo "Empresa" vacío — fila omitida'); return null }

  const fecha = toDate(mapped.fecha)
  if (!fecha) { warn('"Fecha de compra" inválida — fila omitida'); return null }

  const importe = toNum(mapped.importe)
  if (importe == null) { warn('"Importe" no es número — fila omitida'); return null }

  // Campos numéricos con fallback a 0 si vienen vacíos
  const centroCostos     = toNum(mapped.centroCostos)     ?? 0
  const ordenCompra      = toNum(mapped.ordenCompra)      ?? 0
  const idProveedor      = toNum(mapped.idProveedor)      ?? 0
  const insumo           = toNum(mapped.insumo)           ?? 0
  const cantidad         = toNum(mapped.cantidad)         ?? 0
  const precioUnitario   = toNum(mapped.precioUnitario)   ?? 0
  const factorAhorro     = toNum(mapped.factorAhorro)     ?? 1
  const ahorro           = toNum(mapped.ahorro)           ?? 0
  const mes              = toNum(mapped.mes)              ?? fecha.getMonth() + 1
  const semana           = toNum(mapped.semana)           ?? 0
  const totalConIva      = toNum(mapped.totalConIva)      ?? importe * 1.16

  return {
    empresa,
    centroCostos,
    ordenCompra,
    fecha,
    idProveedor,
    proveedor:      toStr(mapped.proveedor),
    insumo,
    descripcion:    toStr(mapped.descripcion),
    cantidad,
    unidad:         toStr(mapped.unidad),
    precioUnitario,
    moneda:         toStr(mapped.moneda, 'MN'),
    importe,
    categoria1:     toStr(mapped.categoria1),
    tipoInsumo:     toStr(mapped.tipoInsumo),
    notas:          mapped.notas != null ? toStr(mapped.notas) : null,
    comprador:      toStr(mapped.comprador),
    factorAhorro,
    ahorro,
    codComprador:   toStr(mapped.codComprador),
    codAhorro:      toStr(mapped.codAhorro),
    mes,
    semana,
    insumoClave:    toStr(mapped.insumoClave),
    totalConIva,
  }
}

// ── Punto de entrada público ─────────────────────────────────────────

/**
 * Construye un mapa de clave-normalizada → clave-original para tolerar
 * diferencias de mayúsculas/minúsculas y espacios en los encabezados del Excel.
 */
function buildKeyMap(raw: RawRow): Map<string, string> {
  const map = new Map<string, string>()
  for (const key of Object.keys(raw)) {
    map.set(normalizeKey(key), key)
  }
  return map
}

function resolveHeaderName(header: string): string {
  const normalized = normalizeKey(header)
  const alias = HEADER_ALIASES[normalized]
  if (alias) return alias
  return Object.keys(HEADERS).find((key) => normalizeKey(key) === normalized) ?? header
}

function remapRow(raw: RawRow): RawRow {
  const remapped: RawRow = {}

  for (const actualKey of Object.keys(raw)) {
    const targetKey = resolveHeaderName(actualKey)
    if (targetKey in HEADERS) {
      remapped[targetKey] = raw[actualKey]
    }
  }

  return remapped
}

export function normalizeRows(rows: RawRow[]): ParseResult {
  const compras: Compra[] = []
  const advertencias: string[] = []

  // Detectar encabezados faltantes usando la primera fila
  if (rows.length > 0) {
    const keyMap = buildKeyMap(rows[0])
    const faltantes = Object.keys(HEADERS).filter((expectedHeader) => {
      if (keyMap.has(normalizeKey(expectedHeader))) return false
      const aliasKeys = Object.entries(HEADER_ALIASES)
        .filter(([, canonical]) => canonical === expectedHeader)
        .map(([alias]) => alias)
      return !aliasKeys.some((alias) => keyMap.has(alias))
    })
    if (faltantes.length > 0) {
      advertencias.push(
        `Encabezados no encontrados en el Excel: ${faltantes.join(', ')}. ` +
        `Encabezados reales: ${Object.keys(rows[0]).join(', ')}`,
      )
    }
  }

  for (let i = 0; i < rows.length; i++) {
    try {
      const remapped = remapRow(rows[i])
      const compra = normalizeRow(remapped, i + 2, advertencias)
      if (compra) compras.push(compra)
    } catch (err) {
      advertencias.push(`Fila ${i + 2}: error inesperado — ${err}`)
    }
  }

  return { compras, advertencias }
}
