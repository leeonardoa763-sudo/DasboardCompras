import Papa from 'papaparse'
import { normalizeRows } from './normalize'
import type { ParseResult } from './schema'

/**
 * Carga datos desde un Google Sheet publicado como CSV.
 * El Sheet debe tener los mismos 24 encabezados exactos que el Excel.
 *
 * Para obtener la URL:
 *   Archivo → Compartir → Publicar en la web → CSV → copiar URL.
 */
export function cargarDesdeGoogleSheets(csvUrl: string): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, unknown>>(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve(normalizeRows(results.data))
      },
      error: (err) => {
        resolve({
          compras: [],
          advertencias: [`Error al descargar Google Sheets CSV: ${err.message}`],
        })
      },
    })
  })
}
