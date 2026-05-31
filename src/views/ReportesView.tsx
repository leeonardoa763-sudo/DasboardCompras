import type { Compra } from '../data/schema'
import PlaceholderView from './PlaceholderView'

interface Props { compras: Compra[] }

export default function ReportesView(_: Props) {
  return (
    <PlaceholderView
      color="cyan"
      fase="Fase 7"
      titulo="Reportes Periódicos"
      descripcion="Reportes semanales y mensuales filtrables con resumen de KPIs, tablas de detalle y exportación a PDF para dirección."
      icon={
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M28 4H10a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V16L28 4z" />
          <polyline points="28,4 28,16 40,16" />
          <line x1="14" y1="24" x2="34" y2="24" />
          <line x1="14" y1="30" x2="34" y2="30" />
          <line x1="14" y1="36" x2="24" y2="36" />
        </svg>
      }
    />
  )
}
