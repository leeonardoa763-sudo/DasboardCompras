import { useEffect, useMemo, useState } from 'react'
import { cargarEjemplo, cargarDesdeArchivo } from './data/loadExcel'
import type { ParseResult } from './data/schema'
import type { Compra } from './data/schema'
import type { ViewId, FiltrosActivos } from './components/layout/types'
import { FILTROS_VACÍOS } from './components/layout/types'
import Layout from './components/layout/Layout'
import ResumenView from './views/ResumenView'
import TendenciasView from './views/TendenciasView'
import PreciosView from './views/PreciosView'
import ProveedoresView from './views/ProveedoresView'
import CompradoresView from './views/CompradoresView'
import ReportesView from './views/ReportesView'

function filtrarCompras(compras: Compra[], f: FiltrosActivos): Compra[] {
  return compras.filter((c) => {
    if (f.empresas.length > 0 && !f.empresas.includes(c.empresa)) return false
    if (f.compradores.length > 0 && !f.compradores.includes(c.comprador)) return false
    if (f.centros.length > 0 && !f.centros.includes(c.centroCostos)) return false
    if (f.fechaDesde) {
      if (c.fecha < new Date(f.fechaDesde)) return false
    }
    if (f.fechaHasta) {
      const hasta = new Date(f.fechaHasta)
      hasta.setHours(23, 59, 59, 999)
      if (c.fecha > hasta) return false
    }
    return true
  })
}

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('resumen')
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [filtros, setFiltros] = useState<FiltrosActivos>(FILTROS_VACÍOS)

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
        setFiltros(FILTROS_VACÍOS)
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setCargando(false))
  }

  const compras = useMemo(() => result?.compras ?? [], [result])
  const comprasFiltradas = useMemo(
    () => filtrarCompras(compras, filtros),
    [compras, filtros],
  )

  const renderView = () => {
    switch (activeView) {
      case 'resumen':     return <ResumenView compras={comprasFiltradas} />
      case 'tendencias':  return <TendenciasView compras={comprasFiltradas} />
      case 'precios':     return <PreciosView compras={comprasFiltradas} />
      case 'proveedores': return <ProveedoresView compras={comprasFiltradas} />
      case 'compradores': return <CompradoresView compras={comprasFiltradas} />
      case 'reportes':    return <ReportesView compras={comprasFiltradas} />
    }
  }

  return (
    <Layout
      compras={compras}
      filtros={filtros}
      onFiltrosChange={setFiltros}
      onLimpiarFiltros={() => setFiltros(FILTROS_VACÍOS)}
      ultimaActualizacion={ultimaActualizacion}
      onCargarArchivo={handleCargarArchivo}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {cargando && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-[#4d6480]">Cargando datos…</p>
          </div>
        </div>
      )}

      {!cargando && error && (
        <div className="m-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[13px] text-red-400 font-500">Error al cargar el archivo</p>
          <p className="text-[12px] text-red-400/70 mt-1">{error}</p>
        </div>
      )}

      {!cargando && result && result.advertencias.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
          <p className="text-[11px] text-amber-400/80 font-500">
            {result.advertencias.length} advertencia{result.advertencias.length > 1 ? 's' : ''} al parsear el archivo
          </p>
        </div>
      )}

      {!cargando && !error && renderView()}
    </Layout>
  )
}
