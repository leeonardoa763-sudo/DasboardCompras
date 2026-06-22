import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Compra } from '../../data/schema'
import type { Usuario } from '../../auth/auth'
import type { FilterOptions, FiltrosActivos, ViewId } from './types'
import Sidebar from './Sidebar'
import Header from './Header'
import FilterBar from './FilterBar'

interface LayoutProps {
  compras: Compra[]
  filtros: FiltrosActivos
  onFiltrosChange: (f: FiltrosActivos) => void
  onLimpiarFiltros: () => void
  ultimaActualizacion: Date | null
  onCargarArchivo: (file: File) => void
  onCargarGoogleSheets: (sheetUrl: string, sheetName?: string) => void
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  onPresentar?: () => void
  usuario: Usuario | null
  onLogout: () => void
  vistasPermitidas: ViewId[]
  children: ReactNode
}

function buildFilterOptions(compras: Compra[]): FilterOptions {
  const empresas = [...new Set(compras.map((c) => c.empresa))].sort()
  const compradores = [...new Set(compras.map((c) => c.comprador))].sort()
  const centros = [...new Set(compras.map((c) => c.centroCostos))].sort((a, b) => a - b)
  const categorias1 = [...new Set(compras.map((c) => c.categoria1).filter(Boolean))].sort()
  const tiposInsumo = [...new Set(compras.map((c) => c.tipoInsumo))].sort()
  const proveedores = [...new Set(compras.map((c) => c.proveedor).filter(Boolean))].sort()
  return { empresas, compradores, centros, categorias1, tiposInsumo, proveedores }
}

export default function Layout({
  compras,
  filtros,
  onFiltrosChange,
  onLimpiarFiltros,
  ultimaActualizacion,
  onCargarArchivo,
  onCargarGoogleSheets,
  activeView,
  onNavigate,
  onPresentar,
  usuario,
  onLogout,
  vistasPermitidas,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const opciones = buildFilterOptions(compras)

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        vistasPermitidas={vistasPermitidas}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <Header
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          ultimaActualizacion={ultimaActualizacion}
          onCargarArchivo={onCargarArchivo}
          onCargarGoogleSheets={onCargarGoogleSheets}
          onPresentar={onPresentar}
          usuario={usuario}
          onLogout={onLogout}
        />
        <FilterBar
          opciones={opciones}
          filtros={filtros}
          onChange={onFiltrosChange}
          onLimpiar={onLimpiarFiltros}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export type { FiltrosActivos, FilterOptions, ViewId }
