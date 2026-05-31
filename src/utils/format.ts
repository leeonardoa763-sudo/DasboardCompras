export const fmt$ = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

export const fmtNum = (n: number) => new Intl.NumberFormat('es-MX').format(n)

export const fmtFecha = (d: Date) =>
  d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
