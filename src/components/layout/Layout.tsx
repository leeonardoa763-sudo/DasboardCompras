import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Compra } from '../../data/schema'
import type { FilterOptions, FiltrosActivos, ViewId } from './types'
import { FILTROS_VACÍOS } from './types'
import Sidebar from './Sidebar'
import Header from './Header'
import FilterBar from './FilterBar'

interface LayoutProps {
  compras: Compra[]
  ultimaActualizacion: Date | null
  onCargarArchivo: (file: File) => void
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  children: ReactNode
}

function buildFilterOptions(compras: Compra[]): FilterOptions {
  const empresas = [...new Set(compras.map((c) => c.empresa))].sort()
  const compradores = [...new Set(compras.map((c) => c.comprador))].sort()
  const centros = [...new Set(compras.map((c) => c.centroCostos))].sort((a, b) => a - b)
  return { empresas, compradores, centros }
}

export default function Layout({
  compras,
  ultimaActualizacion,
  onCargarArchivo,
  activeView,
  onNavigate,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosActivos>(FILTROS_VACÍOS)

  const opciones = buildFilterOptions(compras)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar fijo */}
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenido principal — desplazado 240px en desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <Header
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          ultimaActualizacion={ultimaActualizacion}
          onCargarArchivo={onCargarArchivo}
        />
        <FilterBar
          opciones={opciones}
          filtros={filtros}
          onChange={setFiltros}
          onLimpiar={() => setFiltros(FILTROS_VACÍOS)}
        />

        {/* Área scrollable de contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export type { FiltrosActivos, FilterOptions, ViewId }
