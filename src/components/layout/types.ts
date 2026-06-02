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
  proveedores: string[]
  fechaDesde: string
  fechaHasta: string
}

export interface FilterOptions {
  empresas: string[]
  compradores: string[]
  centros: number[]
  tiposInsumo: string[]
  proveedores: string[]
}

export const FILTROS_VACÍOS: FiltrosActivos = {
  empresas: [],
  compradores: [],
  centros: [],
  tiposInsumo: [],
  proveedores: [],
  fechaDesde: '',
  fechaHasta: '',
}
