interface KpiCardProps {
  label: string
  value: string
  sublabel?: string
  accent?: 'amber' | 'blue' | 'green' | 'purple'
}

const ACCENTS = {
  amber:  { val: 'text-amber-400',   border: 'border-amber-500/20',   bg: 'bg-amber-500/[0.06]'   },
  blue:   { val: 'text-blue-400',    border: 'border-blue-500/20',    bg: 'bg-blue-500/[0.06]'    },
  green:  { val: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]' },
  purple: { val: 'text-violet-400',  border: 'border-violet-500/20',  bg: 'bg-violet-500/[0.06]'  },
} as const

export default function KpiCard({ label, value, sublabel, accent = 'amber' }: KpiCardProps) {
  const a = ACCENTS[accent]
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-4 flex flex-col gap-1.5`}>
      <span className="text-[10px] font-500 uppercase tracking-widest text-[#4d6480]">
        {label}
      </span>
      <span className={`text-[22px] font-700 leading-none tracking-tight ${a.val}`}>
        {value}
      </span>
      {sublabel && (
        <span className="text-[10px] text-[#4d6480] leading-tight">{sublabel}</span>
      )}
    </div>
  )
}
