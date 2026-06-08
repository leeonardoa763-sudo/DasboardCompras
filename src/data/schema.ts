export interface Compra {
  empresa: string
  centroCostos: number
  ordenCompra: number
  fecha: Date
  idProveedor: number
  proveedor: string
  insumo: number
  descripcion: string
  cantidad: number
  unidad: string
  precioUnitario: number   // Pu, sin IVA
  moneda: string
  importe: number          // sin IVA
  tipoInsumo: string
  notas: string | null
  comprador: string
  factorAhorro: number     // %de Ahrro — ver CLAUDE.md §4 nota sobre ahorro
  ahorro: number           // monto MXN (usar este para KPIs)
  codComprador: string
  codAhorro: string
  mes: number
  semana: number
  insumoClave: string
  totalConIva: number      // = importe * 1.16
}

/**
 * Mapa de encabezados EXACTOS del Excel al campo interno.
 * ⚠️ Erratas intencionales: "ODEN DE COMPRA" (no "ORDEN") y "%de Ahrro" (no "Ahorro").
 */
export const HEADERS: Record<string, keyof Compra> = {
  'Empresa':              'empresa',
  'CC':                   'centroCostos',     // abreviación real: "CENTRO DE COSTOS"
  'OC':                   'ordenCompra',      // abreviación real: "ODEN DE COMPRA"
  'Fecha':                'fecha',            // abreviación real: "Fecha de compra"
  'id Proveedor':         'idProveedor',
  'Proveedor':            'proveedor',
  'Insumo':               'insumo',
  'Descripcion':          'descripcion',
  'Cantidad':             'cantidad',
  'Unidad':               'unidad',
  'Pu':                   'precioUnitario',
  'Moneda':               'moneda',
  'Importe':              'importe',
  'Tipo De Insumo':       'tipoInsumo',
  'Notas':                'notas',
  'Comprador':            'comprador',
  '%de Ahrro':            'factorAhorro',     // errata intencional
  'Ahorro':               'ahorro',
  'Codigo Comprador':     'codComprador',
  'Codigo de ahorro':     'codAhorro',
  'Mes':                  'mes',
  'Semana':               'semana',
  'InsumoClave':          'insumoClave',
  'Total + IVA':          'totalConIva',
}

export interface ParseResult {
  compras: Compra[]
  advertencias: string[]
}

export const HEADER_ALIASES: Record<string, string> = {
  'fecha de compra': 'Fecha',
  'fecha compra': 'Fecha',
  'orden de compra': 'OC',
  'oden de compra': 'OC',
  'codigo comprador': 'Codigo Comprador',
  'código comprador': 'Codigo Comprador',
  'codigo de ahorro': 'Codigo de ahorro',
  'código de ahorro': 'Codigo de ahorro',
  'tipo de insumo': 'Tipo De Insumo',
  'total + iva': 'Total + IVA',
  '% de ahorro': '%de Ahrro',
  '% de ahrro': '%de Ahrro',
}
