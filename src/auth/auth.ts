import type { ViewId } from "../components/layout/types";

export type Usuario = {
  nombre: string;
  role: "admin" | "viewer";
};

export const VISTAS_POR_ROLE: Record<Usuario["role"], ViewId[]> = {
  admin: [
    "resumen",
    "tendencias",
    "precios",
    "proveedores",
    "compradores",
    "reportes",
  ],
  viewer: ["precios", "proveedores", "compradores"],
};

const STORAGE_KEY = "dashboard-compras-user";

const USUARIOS = [
  { nombre: "leo", contraseña: "Leonardo12345", role: "admin" as const },
  { nombre: "invitado", contraseña: "invitado2026", role: "viewer" as const },
];

export function validarUsuario(
  nombre: string,
  contraseña: string,
): Usuario | null {
  const encontrado = USUARIOS.find(
    (u) =>
      u.nombre.toLowerCase() === nombre.trim().toLowerCase() &&
      u.contraseña === contraseña,
  );

  return encontrado
    ? { nombre: encontrado.nombre, role: encontrado.role }
    : null;
}

export function guardarSesion(usuario: Usuario | null) {
  if (usuario) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function cargarSesion(): Usuario | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Usuario;
    if (parsed.nombre && parsed.role) return parsed;
  } catch {
    return null;
  }
  return null;
}
