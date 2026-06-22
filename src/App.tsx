import { useEffect, useMemo, useState } from 'react'
import { cargarEjemplo, cargarDesdeArchivo } from './data/loadExcel'
import { cargarDesdeGoogleSheets } from './data/loadSheet'
import type { ParseResult } from './data/schema'
import type { Compra } from './data/schema'
import type { Usuario } from './auth/auth'
import { cargarSesion, guardarSesion, VISTAS_POR_ROLE } from './auth/auth'
import type { ViewId, FiltrosActivos } from './components/layout/types'
import { FILTROS_VACÍOS } from './components/layout/types'
import Layout from './components/layout/Layout'
import PresentacionMode from './components/presentacion/PresentacionMode'
import AuthGate from './components/auth/AuthGate'
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
    if (f.categorias1.length > 0 && !f.categorias1.includes(c.categoria1)) return false
    if (f.tiposInsumo.length > 0 && !f.tiposInsumo.includes(c.tipoInsumo)) return false
    if (f.proveedores.length > 0 && !f.proveedores.includes(c.proveedor)) return false
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
  const [activeView, setActiveView] = useState<ViewId>('precios')
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [filtros, setFiltros] = useState<FiltrosActivos>(FILTROS_VACÍOS)
  const [modoPresent, setModoPresent] = useState(false)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  const vistasPermitidas = useMemo(
    () => (usuario ? VISTAS_POR_ROLE[usuario.role] : []),
    [usuario],
  )

  useEffect(() => {
    if (usuario && vistasPermitidas.length > 0 && !vistasPermitidas.includes(activeView)) {
      setActiveView(vistasPermitidas[0])
    }
  }, [usuario, vistasPermitidas, activeView])

  useEffect(() => {
    const sesion = cargarSesion()
    if (sesion) {
      setUsuario(sesion)
    }

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

  const handleCargarGoogleSheets = (sheetUrl: string, sheetName?: string) => {
    setCargando(true)
    setError(null)
    cargarDesdeGoogleSheets(sheetUrl, sheetName)
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
      case 'tendencias':  return <TendenciasView compras={comprasFiltradas} />
      case 'precios':     return <PreciosView compras={comprasFiltradas} />
      case 'proveedores': return <ProveedoresView compras={comprasFiltradas} />
      case 'compradores': return <CompradoresView compras={comprasFiltradas} />
      case 'reportes':    return <ReportesView compras={comprasFiltradas} />
    }
  }

  const content = (
    <>
      {cargando && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-[var(--text-muted)]">Cargando datos…</p>
          </div>
        </div>
      )}

      {!cargando && error && (
        <div className="m-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[13px] text-red-400 font-500">Error al cargar el archivo</p>
          <p className="text-[12px] text-red-400/70 mt-1">{error}</p>
        </div>
      )}

      {!cargando && result && result.advertencias.length > 0 && result.compras.length === 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[11px] text-red-400 font-500 mb-1">
            No se pudieron leer datos del archivo ({result.advertencias.length} advertencia{result.advertencias.length > 1 ? 's' : ''})
          </p>
          {result.advertencias.slice(0, 3).map((a, i) => (
            <p key={i} className="text-[10px] text-red-400/70 font-mono leading-relaxed">{a}</p>
          ))}
        </div>
      )}
      {!cargando && result && result.advertencias.length > 0 && result.compras.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
          <p className="text-[11px] text-amber-400/80 font-500">
            {result.advertencias.length} fila{result.advertencias.length > 1 ? 's' : ''} omitida{result.advertencias.length > 1 ? 's' : ''} al parsear · {result.compras.length} filas cargadas
          </p>
        </div>
      )}

      {!cargando && !error && renderView()}
    </>
  )

  if (!usuario) {
    return (
      <AuthGate
        onLogin={(u) => {
          setUsuario(u)
          guardarSesion(u)
        }}
      />
    )
  }

  if (modoPresent) {
    return (
      <PresentacionMode
        activeView={activeView}
        allowedViews={vistasPermitidas}
        onNavigate={setActiveView}
        onExit={() => setModoPresent(false)}
      >
        {!cargando && !error && renderView()}
      </PresentacionMode>
    )
  }

  return (
    <Layout
      compras={compras}
      filtros={filtros}
      onFiltrosChange={setFiltros}
      onLimpiarFiltros={() => setFiltros(FILTROS_VACÍOS)}
      ultimaActualizacion={ultimaActualizacion}
      onCargarArchivo={handleCargarArchivo}
      onCargarGoogleSheets={handleCargarGoogleSheets}
      activeView={activeView}
      onNavigate={setActiveView}
      onPresentar={() => setModoPresent(true)}
      usuario={usuario}
      onLogout={() => {
        guardarSesion(null)
        setUsuario(null)
      }}
      vistasPermitidas={vistasPermitidas}
    >
      {content}
    </Layout>
  )
}
