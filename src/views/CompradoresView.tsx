import type { Compra } from '../data/schema'
import PlaceholderView from './PlaceholderView'

interface Props { compras: Compra[] }

export default function CompradoresView(_: Props) {
  return (
    <PlaceholderView
      color="rose"
      fase="Fase 6"
      titulo="Compradores y Centros de Costo"
      descripcion="Ranking de compradores por gasto gestionado y ahorro generado. Desglose de gasto por centro de costo / obra."
      icon={
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="16" r="8" />
          <path d="M4 42c0-7.7 6.3-14 14-14" />
          <circle cx="34" cy="28" r="6" />
          <path d="M26 42c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      }
    />
  )
}
