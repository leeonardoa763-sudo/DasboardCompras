import Papa from 'papaparse'
import { normalizeRows } from './normalize'
import type { ParseResult } from './schema'

function normalizeGoogleSheetsUrl(url: string, sheetName?: string): string {
  try {
    const parsed = new URL(url.trim())
    const hostname = parsed.hostname.toLowerCase()

    if (hostname.includes('docs.google.com') && parsed.pathname.includes('/spreadsheets/')) {
      // Si el usuario proporcionó el nombre de la hoja, usar el endpoint gviz
      // porque el export CSV normal no permite seleccionar la hoja por nombre.
      const pathParts = parsed.pathname.split('/')
      const idIndex = pathParts.indexOf('d')
      const spreadsheetId = idIndex >= 0 ? pathParts[idIndex + 1] : null
      const gid = parsed.hash ? new URLSearchParams(parsed.hash.slice(1)).get('gid') : parsed.searchParams.get('gid')

      if (spreadsheetId && sheetName) {
        const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`)
        exportUrl.searchParams.set('tqx', 'out:csv')
        exportUrl.searchParams.set('sheet', sheetName)
        return exportUrl.toString()
      }

      // Si ya es un CSV export directo o un gviz CSV directo, devolverlo tal cual.
      if (
        parsed.pathname.includes('/export') ||
        parsed.pathname.includes('/gviz/tq') ||
        parsed.searchParams.get('format') === 'csv' ||
        parsed.searchParams.get('tqx') === 'out:csv'
      ) {
        return url.trim()
      }

      if (spreadsheetId) {
        const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`)
        exportUrl.searchParams.set('format', 'csv')
        if (gid) exportUrl.searchParams.set('gid', gid)
        return exportUrl.toString()
      }
    }
  } catch {
    // No es una URL válida; devolvemos lo que el usuario escribió para que papaParse intente.
  }
  return url.trim()
}

/**
 * Carga datos desde un Google Sheet público. Acepta tanto URL de CSV como
 * enlaces normales de Google Sheets y los convierte a export CSV internamente.
 * El Sheet debe tener los mismos 24 encabezados exactos que el Excel.
 */
export function cargarDesdeGoogleSheets(sheetUrl: string, sheetName?: string): Promise<ParseResult> {
  const csvUrl = normalizeGoogleSheetsUrl(sheetUrl, sheetName)
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
