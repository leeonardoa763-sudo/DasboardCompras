export type ViewId =
  | 'resumen'
  | 'tendencias'
  | 'precios'
  | 'proveedores'
  | 'compradores'
  | 'reportes'

export interface FiltrosActivos {
  empresas: string[]
  compradores: string[]
  centros: number[]
  tiposInsumo: string[]
  fechaDesde: string
  fechaHasta: string
}

export interface FilterOptions {
  empresas: string[]
  compradores: string[]
  centros: number[]
  tiposInsumo: string[]
}

export const FILTROS_VACÍOS: FiltrosActivos = {
  empresas: [],
  compradores: [],
  centros: [],
  tiposInsumo: [],
  fechaDesde: '',
  fechaHasta: '',
}
