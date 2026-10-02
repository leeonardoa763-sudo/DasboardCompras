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

/** Carga un .xlsx ya en memoria (p. ej. descifrado de datos.enc). */
export async function cargarDesdeBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  return parsearBuffer(buffer)
}
