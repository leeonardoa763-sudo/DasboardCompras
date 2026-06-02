interface KpiCardProps {
  label: string
  value: string
  sublabel?: string
  accent?: 'amber' | 'blue' | 'green' | 'purple'
}

const ACCENTS = {
  amber:  { color: 'var(--kpi-amber)',  border: 'border-amber-500/25',   bg: 'bg-amber-500/[0.07]'   },
  blue:   { color: 'var(--kpi-blue)',   border: 'border-blue-500/25',    bg: 'bg-blue-500/[0.07]'    },
  green:  { color: 'var(--kpi-green)',  border: 'border-emerald-500/25', bg: 'bg-emerald-500/[0.07]' },
  purple: { color: 'var(--kpi-purple)', border: 'border-violet-500/25',  bg: 'bg-violet-500/[0.07]'  },
} as const

export default function KpiCard({ label, value, sublabel, accent = 'amber' }: KpiCardProps) {
  const a = ACCENTS[accent]
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-4 flex flex-col gap-1.5`}>
      <span className="text-[10px] font-500 uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-[24px] font-700 leading-none tracking-tight" style={{ color: a.color }}>
        {value}
      </span>
      {sublabel && (
        <span className="text-[10px] text-[var(--text-muted)] leading-tight">{sublabel}</span>
      )}
    </div>
  )
}
