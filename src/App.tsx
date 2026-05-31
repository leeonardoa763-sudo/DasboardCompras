import { useEffect, useState } from 'react'
import { cargarEjemplo, cargarDesdeArchivo } from './data/loadExcel'
import { gastoTotal, ahorroTotal } from './analytics/selectors'
import type { ParseResult } from './data/schema'
import type { ViewId } from './components/layout/types'
import Layout from './components/layout/Layout'
import ResumenView from './views/ResumenView'
import TendenciasView from './views/TendenciasView'
import PreciosView from './views/PreciosView'
import ProveedoresView from './views/ProveedoresView'
import CompradoresView from './views/CompradoresView'
import ReportesView from './views/ReportesView'

// gastoTotal y ahorroTotal se mantienen importados; se usarán en Fase 3
void gastoTotal
void ahorroTotal

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('resumen')
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  useEffect(() => {
    cargarEjemplo()
      .then((r) => {
        setResult(r)
        setUltimaActualizacion(new Date())
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setCargando(false))
  }, [])

  const handleCargarArchivo = (file: File) => {
    setCargando(true)
    setError(null)
    cargarDesdeArchivo(file)
      .then((r) => {
        setResult(r)
        setUltimaActualizacion(new Date())
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setCargando(false))
  }

  const compras = result?.compras ?? []

  const renderView = () => {
    switch (activeView) {
      case 'resumen':      return <ResumenView compras={compras} />
      case 'tendencias':   return <TendenciasView compras={compras} />
      case 'precios':      return <PreciosView compras={compras} />
      case 'proveedores':  return <ProveedoresView compras={compras} />
      case 'compradores':  return <CompradoresView compras={compras} />
      case 'reportes':     return <ReportesView compras={compras} />
    }
  }

  return (
    <Layout
      compras={compras}
      ultimaActualizacion={ultimaActualizacion}
      onCargarArchivo={handleCargarArchivo}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {/* Estado de carga inicial */}
      {cargando && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-[#4d6480]">Cargando datos…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!cargando && error && (
        <div className="m-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[13px] text-red-400 font-500">Error al cargar el archivo</p>
          <p className="text-[12px] text-red-400/70 mt-1">{error}</p>
        </div>
      )}

      {/* Advertencias no fatales */}
      {!cargando && result && result.advertencias.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
          <p className="text-[11px] text-amber-400/80 font-500">
            {result.advertencias.length} advertencia{result.advertencias.length > 1 ? 's' : ''} al parsear el archivo
          </p>
        </div>
      )}

      {/* Vista activa */}
      {!cargando && !error && renderView()}
    </Layout>
  )
}
