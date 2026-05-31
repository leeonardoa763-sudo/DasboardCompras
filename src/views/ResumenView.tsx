import type { Compra } from '../data/schema'
import PlaceholderView from './PlaceholderView'

interface Props { compras: Compra[] }

export default function ResumenView({ compras: _ }: Props) {
  return (
    <PlaceholderView
      color="amber"
      fase="Fase 3"
      titulo="Resumen Ejecutivo"
      descripcion="KPIs principales: gasto total, ahorro, órdenes de compra, proveedores y ticket promedio. Vista de alto nivel para juntas directivas."
      icon={
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="18" height="18" rx="2" />
          <rect x="26" y="4" width="18" height="18" rx="2" />
          <rect x="4" y="26" width="18" height="18" rx="2" />
          <rect x="26" y="26" width="18" height="18" rx="2" />
        </svg>
      }
    />
  )
}
