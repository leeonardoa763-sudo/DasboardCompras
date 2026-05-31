import type { ReactNode } from 'react'

type Color = 'amber' | 'blue' | 'emerald' | 'violet' | 'rose' | 'cyan'

interface PlaceholderViewProps {
  icon: ReactNode
  titulo: string
  descripcion: string
  color: Color
  fase: string
}

const COLOR_MAP: Record<Color, { bg: string; text: string; badge: string }> = {
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  badge: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
}

export default function PlaceholderView({ icon, titulo, descripcion, color, fase }: PlaceholderViewProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm px-4">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${c.bg} ${c.text} mb-6`}>
          {icon}
        </div>
        <h2 className="text-[22px] font-600 text-[#e8edf5] mb-2 tracking-tight">{titulo}</h2>
        <p className="text-[13px] text-[#8fa3be] leading-relaxed mb-6">{descripcion}</p>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-500 px-3 py-1.5 rounded-full border ${c.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          En construcción — {fase}
        </span>
      </div>
    </div>
  )
}
