// Cifra el Excel real → public/data/datos.enc
// Uso: npm run cifrar [ruta.xlsx]   (por defecto datos-privados/datos.xlsx)
// Claves: variables DASH_CLAVE_ADMIN / DASH_CLAVE_VIEWER, o se piden por consola.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { webcrypto as crypto } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ITER = 600_000
const MIN_LARGO = 12
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const entrada = process.argv[2] ?? join(raiz, 'datos-privados', 'datos.xlsx')
const salida = join(raiz, 'public', 'data', 'datos.enc')

const b64 = (u8) => Buffer.from(u8).toString('base64')
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n))

function pedir(texto) {
  return new Promise((resolve) => {
    process.stdout.write(texto)
    const stdin = process.stdin
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let buf = ''
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(buf)
        }
        if (c === '\u0003') process.exit(1)
        if (c === '\u007f' || c === '\b') buf = buf.slice(0, -1)
        else buf += c
      }
    }
    stdin.on('data', onData)
  })
}

async function derivar(clave, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
}

const claves = {
  admin: process.env.DASH_CLAVE_ADMIN ?? (await pedir('Clave ADMIN (ve todas las vistas): ')),
  viewer: process.env.DASH_CLAVE_VIEWER ?? (await pedir('Clave INVITADO (Enter para omitir): ')),
}
if (!claves.viewer) delete claves.viewer
if (claves.viewer && claves.viewer === claves.admin) throw new Error('Las claves deben ser distintas')
for (const [rol, c] of Object.entries(claves)) {
  if (c.length < MIN_LARGO) throw new Error(`La clave ${rol} debe tener al menos ${MIN_LARGO} caracteres`)
}

const k = rnd(32)
const key = await crypto.subtle.importKey('raw', k, 'AES-GCM', false, ['encrypt'])
const iv = rnd(12)
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, readFileSync(entrada))

const llaves = []
for (const [role, clave] of Object.entries(claves)) {
  const salt = rnd(16)
  const wiv = rnd(12)
  const kek = await derivar(clave, salt)
  const wk = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: wiv }, kek, k)
  llaves.push({ role, salt: b64(salt), iv: b64(wiv), wk: b64(new Uint8Array(wk)) })
}

mkdirSync(dirname(salida), { recursive: true })
writeFileSync(salida, JSON.stringify({ v: 1, iter: ITER, iv: b64(iv), ct: b64(new Uint8Array(ct)), llaves }))
console.log(`✓ ${entrada} → ${salida} (roles: ${llaves.map((l) => l.role).join(', ')})`)
