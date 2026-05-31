import type { Compra } from '../data/schema'
import PlaceholderView from './PlaceholderView'

interface Props { compras: Compra[] }

export default function PreciosView(_: Props) {
  return (
    <PlaceholderView
      color="emerald"
      fase="Fase 5"
      titulo="Precios en el Tiempo"
      descripcion="Precio unitario por insumo a lo largo del tiempo, regresión lineal, índice base 100 y volatilidad. Detecta alzas y oportunidades de negociación."
      icon={
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="20" />
          <path d="M24 10v4M24 34v4M14 14l2.8 2.8M31.2 31.2 34 34M10 24h4M34 24h4" />
          <path d="M24 16c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8" />
          <path d="M20 20h8v8" />
        </svg>
      }
    />
  )
}
