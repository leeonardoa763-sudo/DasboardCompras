import * as XLSX from 'xlsx'
import { normalizeRows } from './normalize'
import type { ParseResult } from './schema'

function parsearBuffer(buffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(new Uint8Array(buffer), {
      type: 'array',
      cellDates: true,
    })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: true,
      defval: null,
    })
    return normalizeRows(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { compras: [], advertencias: [`El archivo no es un .xlsx válido: ${msg}`] }
  }
}

/** Carga un archivo .xlsx subido por el usuario. */
export async function cargarDesdeArchivo(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  return parsearBuffer(buffer)
}

/**
 * Carga el dataset de ejemplo desde /public/data/ejemplo.xlsx.
 * Usado como fuente inicial si no se configura Google Sheets.
 */
export async function cargarEjemplo(): Promise<ParseResult> {
  const response = await fetch('/data/ejemplo.xlsx')
  if (!response.ok) {
    return {
      compras: [],
      advertencias: [`No se pudo cargar ejemplo.xlsx: HTTP ${response.status}`],
    }
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    return {
      compras: [],
      advertencias: ['El archivo ejemplo.xlsx no se encontró en /public/data/'],
    }
  }
  const buffer = await response.arrayBuffer()
  return parsearBuffer(buffer)
}
