export type ViewId =
  | 'tendencias'
  | 'precios'
  | 'proveedores'
  | 'compradores'
  | 'reportes'

export interface FiltrosActivos {
  empresas: string[]
  compradores: string[]
  centros: number[]
  categorias1: string[]
  tiposInsumo: string[]
  proveedores: string[]
  fechaDesde: string
  fechaHasta: string
}

export interface FilterOptions {
  empresas: string[]
  compradores: string[]
  centros: number[]
  categorias1: string[]
  tiposInsumo: string[]
  proveedores: string[]
}

export const FILTROS_VACÍOS: FiltrosActivos = {
  empresas: [],
  compradores: [],
  centros: [],
  categorias1: [],
  tiposInsumo: [],
  proveedores: [],
  fechaDesde: '',
  fechaHasta: '',
}
