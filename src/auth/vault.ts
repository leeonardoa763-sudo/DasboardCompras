import type { Usuario } from "./auth";

type Llave = { role: Usuario["role"]; salt: string; iv: string; wk: string };

export type Boveda = {
  v: 1;
  iter: number;
  iv: string;
  ct: string;
  llaves: Llave[];
};

export type BovedaAbierta = { role: Usuario["role"]; buffer: ArrayBuffer };

const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derivar(clave: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clave),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: iter, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

export async function cargarBoveda(): Promise<Boveda | null> {
  const res = await fetch("/data/datos.enc", { cache: "no-store" });
  if (!res.ok) return null;
  if ((res.headers.get("content-type") ?? "").includes("text/html")) return null;
  try {
    const json = (await res.json()) as Boveda;
    return json.v === 1 ? json : null;
  } catch {
    return null;
  }
}

export async function abrirBoveda(
  boveda: Boveda,
  clave: string,
): Promise<BovedaAbierta | null> {
  for (const llave of boveda.llaves) {
    try {
      const kek = await derivar(clave, deB64(llave.salt), boveda.iter);
      const raw = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: deB64(llave.iv) as BufferSource },
        kek,
        deB64(llave.wk) as BufferSource,
      );
      const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      const buffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: deB64(boveda.iv) as BufferSource },
        k,
        deB64(boveda.ct) as BufferSource,
      );
      return { role: llave.role, buffer };
    } catch {
      // clave incorrecta para esta llave: probar la siguiente
    }
  }
  return null;
}
