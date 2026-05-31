import { useEffect, useState } from 'react'
import { cargarEjemplo } from './data/loadExcel'
import { gastoTotal, ahorroTotal } from './analytics/selectors'
import type { ParseResult } from './data/schema'

const fmt = (n: number) =>
  '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarEjemplo()
      .then(setResult)
      .catch((e: unknown) => setError(String(e)))
  }, [])

  const compras = result?.compras ?? []
  const advertencias = result?.advertencias ?? []

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <h1 className="text-3xl font-bold mb-6 text-amber-400">
        Dashboard de Compras
      </h1>

      {error && (
        <p className="text-red-400 mb-4">Error: {error}</p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <Stat label="Filas cargadas"     value={String(compras.length)} />
            <Stat label="Importe sin IVA"    value={fmt(gastoTotal(compras, false))} />
            <Stat label="Total + IVA"        value={fmt(gastoTotal(compras, true))} />
            <Stat label="Ahorro total"       value={fmt(ahorroTotal(compras))} />
          </div>

          {advertencias.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-900/40 rounded text-yellow-300 text-sm">
              <p className="font-bold mb-2">Advertencias ({advertencias.length}):</p>
              {advertencias.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}
        </div>
      )}

      {!result && !error && (
        <p className="text-gray-400">Cargando datos…</p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
