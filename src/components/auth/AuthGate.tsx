import { useState } from 'react'
import { validarUsuario } from '../../auth/auth'
import type { Usuario } from '../../auth/auth'

interface Props {
  onLogin: (usuario: Usuario) => void
}

export default function AuthGate({ onLogin }: Props) {
  const [nombre, setNombre] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/50">
        <h1 className="text-2xl font-semibold text-white">Acceso restringido</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Ingresa tu nombre y contraseña para continuar.
        </p>

        <label className="mt-6 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Nombre
          <input
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400"
            placeholder="Ej. Leo"
            autoComplete="username"
          />
        </label>

        <label className="mt-4 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Contraseña
          <input
            type="password"
            value={contraseña}
            onChange={(event) => setContraseña(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400"
            placeholder="********"
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            const usuario = validarUsuario(nombre, contraseña)
            if (!usuario) {
              setError('Usuario o contraseña incorrectos.')
              return
            }
            onLogin(usuario)
          }}
          className="mt-6 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Entrar
        </button>

        <p className="mt-6 text-xs text-slate-500">
          Nota: este control de acceso es básico y funciona solo en el cliente. Para datos sensibles, se necesita un backend real.
        </p>
      </div>
    </div>
  )
}
