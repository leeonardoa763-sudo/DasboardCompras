import { useState } from 'react'

interface Props {
  onSubmit: (clave: string) => Promise<string | null>
  onDemo: () => void
}

export default function AuthGate({ onSubmit, onDemo }: Props) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [validando, setValidando] = useState(false)

  const entrar = async () => {
    if (!clave || validando) return
    setValidando(true)
    setError(null)
    const msg = await onSubmit(clave)
    if (msg) {
      setError(msg)
      setValidando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void entrar()
        }}
        className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/50"
      >
        <h1 className="text-2xl font-semibold text-white">Acceso restringido</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Ingresa la clave de acceso para descifrar los datos.
        </p>

        <label className="mt-6 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Clave
          <input
            type="password"
            value={clave}
            onChange={(event) => setClave(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400"
            placeholder="********"
            autoComplete="current-password"
            autoFocus
          />
        </label>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={validando}
          className="mt-6 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {validando ? 'Descifrando…' : 'Entrar'}
        </button>

        <button
          type="button"
          onClick={onDemo}
          className="mt-3 w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:border-slate-500"
        >
          Ver demo (sin datos)
        </button>
      </form>
    </div>
  )
}
