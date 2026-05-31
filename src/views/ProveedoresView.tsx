import type { Compra } from '../data/schema'
import PlaceholderView from './PlaceholderView'

interface Props { compras: Compra[] }

export default function ProveedoresView({ compras: _ }: Props) {
  return (
    <PlaceholderView
      color="violet"
      fase="Fase 6"
      titulo="Análisis de Proveedores"
      descripcion="Ranking por gasto y ahorro, concentración de proveedores (Pareto), comparativa de precios del mismo insumo entre distintos proveedores."
      icon={
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 38V18l18-10 18 10v20" />
          <rect x="16" y="24" width="16" height="18" rx="1" />
          <line x1="24" y1="24" x2="24" y2="42" />
          <line x1="8" y1="22" x2="8" y2="38" />
          <line x1="40" y1="22" x2="40" y2="38" />
        </svg>
      }
    />
  )
}
