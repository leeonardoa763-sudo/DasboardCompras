import type { ViewId } from "../components/layout/types";

export type Usuario = {
  nombre: string;
  role: "admin" | "viewer";
};

export const VISTAS_POR_ROLE: Record<Usuario["role"], ViewId[]> = {
  admin: [
    "tendencias",
    "precios",
    "proveedores",
    "compradores",
    "reportes",
  ],
  viewer: ["precios", "proveedores", "compradores"],
};

export const USUARIO_POR_ROLE: Record<Usuario["role"], Usuario> = {
  admin: { nombre: "Administrador", role: "admin" },
  viewer: { nombre: "Invitado", role: "viewer" },
};
