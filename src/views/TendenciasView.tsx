import type { Compra } from '../data/schema'
import PlaceholderView from './PlaceholderView'

interface Props { compras: Compra[] }

export default function TendenciasView({ compras: _ }: Props) {
  return (
    <PlaceholderView
      color="blue"
      fase="Fase 4"
      titulo="Análisis de Tendencias"
      descripcion="Gasto semanal y mensual, variaciones periodo vs periodo, media móvil y acumulados. Identifica si el gasto va al alza o a la baja."
      icon={
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4,36 14,22 22,28 34,12 44,8" />
          <polyline points="36,8 44,8 44,16" />
          <line x1="4" y1="44" x2="44" y2="44" />
        </svg>
      }
    />
  )
}
