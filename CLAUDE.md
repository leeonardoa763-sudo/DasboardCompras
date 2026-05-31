# CLAUDE.md — Dashboard Ejecutivo de Compras

> Este archivo lo lee Claude Code automáticamente al iniciar cada sesión.
> Contiene las reglas y hechos **permanentes** del proyecto. El plan paso a paso
> está en `PLAN.md` (en raíz) y el detalle técnico en `ARQUITECTURA.md`.

**Repositorio GitHub:** https://github.com/leeonardoa763-sudo/DasboardCompras  
**Estado actual (2026-05-30):** Fases 0 ✅, 1 ✅, 2 ✅, 3 ✅ y 4 ✅ completas. Siguiente: Fase 5 (Análisis de Precios).

---

## 1. Qué es este proyecto

Aplicación web de una sola página (SPA) que funciona como **dashboard ejecutivo + modo
presentación** para las compras de la empresa. La fuente de datos es **siempre un Excel
con la misma estructura fija de 24 columnas** (descrita abajo). El dashboard debe:

- Calcular y mostrar KPIs (gasto, ahorro, # de órdenes, proveedores, etc.).
- Generar **reportes mensuales y semanales** filtrables.
- Analizar **tendencias** (gasto en el tiempo, semana vs semana, mes vs mes).
- Analizar **precios unitarios a lo largo del tiempo** por insumo, con regresión lineal.
- Comparar proveedores, compradores y centros de costo.
- Tener un **modo presentación** a pantalla completa para juntas con dirección.
- Abrirse con **un solo click** desde una URL (sin instalar nada, sin login complicado).

Audiencia final: dirección / jefes. Prioridad: que se vea **profesional, claro y rápido**.

---

## 2. Stack tecnológico (NO cambiar sin justificar)

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Build | **Vite** | Arranque rápido, build estático para deploy de "un click" |
| Lenguaje | **TypeScript** | Tipar el esquema del Excel evita el 80% de los bugs |
| UI | **React 18** | Componentes reutilizables; Leo ya conoce React (RN) |
| Estilos | **Tailwind CSS** | Diseño consistente sin pelear con CSS |
| Gráficas | **Recharts** | Declarativo, integra bien con React |
| Lectura de Excel | **SheetJS (`xlsx`)** | Parsea el `.xlsx` directo en el navegador |
| Lectura de CSV | **PapaParse** | Para la fuente Google Sheets (CSV publicado) |
| Estadística | **simple-statistics** | Regresión lineal, media, desviación estándar |
| Exportar PDF | **html2canvas + jsPDF** | "Descargar reporte" desde el navegador |
| Hosting | **Vercel** | Deploy automático en cada `git push`, URL HTTPS gratis |

**Regla:** todo corre **en el navegador**. No hay backend, no hay base de datos.
Esto hace el deploy trivial y el acceso de los jefes literalmente un click.

---

## 3. Fuentes de datos (dos modos)

1. **Modo Google Sheets (recomendado para producción):** Leo pega/sube los datos a un
   Google Sheet con la estructura fija → lo publica como CSV → la app lo lee al cargar.
   Actualizar el Sheet = dashboard actualizado. Los jefes solo abren la URL.
2. **Modo carga de archivo (respaldo):** botón / drag-and-drop para subir un `.xlsx`
   directamente en la interfaz. Útil para análisis ad-hoc sin tocar el Sheet.

Siempre debe existir un **dataset de ejemplo** en `public/data/ejemplo.xlsx` para que la
app nunca se vea vacía en el primer load.

---

## 4. ESQUEMA DE DATOS — CRÍTICO

El Excel **siempre** tiene estas 24 columnas, en este orden, con estos nombres **exactos**.
El parser debe mapear por nombre de encabezado, NO por posición.

> ⚠️ **ERRATAS EN LOS ENCABEZADOS — RESPETARLAS TAL CUAL:**
> - `ODEN DE COMPRA` (dice "ODEN", no "ORDEN")
> - `%de Ahrro` (dice "Ahrro", no "Ahorro")
> Si el parser busca "ORDEN DE COMPRA" o "% de Ahorro" → no encuentra la columna y truena.
> Mapear con las cadenas exactas y exponerlas en el código con nombres limpios.

| # | Encabezado exacto en Excel | Nombre interno (TS) | Tipo | Significado / notas |
|---|----------------------------|---------------------|------|---------------------|
| 1 | `Empresa` | `empresa` | string | Empresa compradora (COEDESSA, TRIACO, CAPAM…). |
| 2 | `CENTRO DE COSTOS` | `centroCostos` | number | Centro de costo / obra (ej. 149, 134, 138). |
| 3 | `ODEN DE COMPRA` | `ordenCompra` | number | Folio de la orden de compra. (Errata: "ODEN".) |
| 4 | `Fecha de compra` | `fecha` | Date | Fecha de la compra. |
| 5 | `id Proveedor` | `idProveedor` | number | Clave numérica del proveedor. |
| 6 | `Proveedor` | `proveedor` | string | Nombre del proveedor. |
| 7 | `Insumo` | `insumo` | number | Código numérico del material/insumo. |
| 8 | `Descripcion` | `descripcion` | string | Descripción del insumo. |
| 9 | `Cantidad` | `cantidad` | number | Cantidad comprada. |
| 10 | `Unidad` | `unidad` | string | KG, PAR, LT, PZA, ML… |
| 11 | `Pu` | `precioUnitario` | number | Precio unitario SIN IVA. |
| 12 | `Moneda` | `moneda` | string | MN (peso) y eventualmente otras. |
| 13 | `Importe` | `importe` | number | = Cantidad × Pu (SIN IVA). |
| 14 | `Tipo De Insumo` | `tipoInsumo` | string | Categoría (ACERO DE REFUERZO, TUBERIA…). |
| 15 | `Notas` | `notas` | string\|null | Casi siempre vacío. |
| 16 | `Comprador` | `comprador` | string | Quién compró (Leo, Hector, Oscar…). |
| 17 | `%de Ahrro` | `factorAhorro` | number | Factor de ahorro (ej. 1.03125). Ver nota ⬇. (Errata: "Ahrro".) |
| 18 | `Ahorro` | `ahorro` | number | Monto ahorrado en MXN (valor absoluto, usar este). |
| 19 | `Codigo Comprador` | `codComprador` | string | Llave compuesta (no mostrar al usuario). |
| 20 | `Codigo de ahorro` | `codAhorro` | string | Llave compuesta (no mostrar al usuario). |
| 21 | `Mes` | `mes` | number | Número de mes (1–12). |
| 22 | `Semana` | `semana` | number | Número de semana ISO. |
| 23 | `InsumoClave` | `insumoClave` | string | Llave compuesta del insumo. Útil para agrupar precios. |
| 24 | `Total + IVA` | `totalConIva` | number | = Importe × 1.16. |

**Nota sobre ahorro (CONFIRMAR CON LEO antes de asumir):**
- Usar **`ahorro`** (col 18) como monto en pesos. Es el dato confiable.
- `factorAhorro` (col 17) parece un cociente referencia/pagado y **no** coincide
  exactamente con `ahorro / importe`. NO calcular el % de ahorro a partir de él.
- Para mostrar "% de ahorro" en el dashboard, derivarlo como `ahorro / (importe + ahorro)`
  y dejar un comentario `// SUPUESTO: confirmar fórmula de % con el usuario`.

**Reglas de cálculo (no hardcodear, siempre derivar del dataset):**
- Gasto = sumar `importe` (sin IVA) o `totalConIva` según el KPI; etiquetar SIEMPRE si
  el número lleva IVA o no.
- Toda agrupación (por empresa, proveedor, comprador, tipo, centro, semana, mes) se
  calcula en una capa de "selectors", no dentro de los componentes de UI.

---

## 5. Estructura de carpetas

```
dashboard-compras/
├── CLAUDE.md                  # este archivo
├── PLAN.md                    # roadmap por fases (leer al planear)
├── public/
│   └── data/ejemplo.xlsx      # dataset de muestra (nunca subir el real)
├── src/
│   ├── data/                  # carga y normalización del Excel/CSV
│   │   ├── schema.ts          # tipos Compra + mapa de encabezados exactos
│   │   ├── loadExcel.ts       # SheetJS: cargarEjemplo() y cargarDesdeArchivo()
│   │   ├── loadSheet.ts       # PapaParse (Google Sheets CSV publicado)
│   │   └── normalize.ts       # Excel crudo → Compra[] tipado
│   ├── analytics/             # TODO el cálculo vive aquí (sin React)
│   │   ├── selectors.ts       # ✅ agrupaciones, KPIs, timeline, ranking, ultimas
│   │   ├── trends.ts          # (Fase 4) regresión, medias móviles, deltas
│   │   └── reports.ts         # (Fase 7) armado de reporte semanal/mensual
│   ├── components/
│   │   ├── layout/            # ✅ Sidebar, Header, FilterBar, Layout, types
│   │   └── kpi/               # ✅ KpiCard.tsx
│   ├── utils/
│   │   └── format.ts          # ✅ fmt$, fmtPct, fmtNum, fmtFecha (es-MX)
│   ├── views/                 # ✅ ResumenView completo; demás con PlaceholderView
│   │   ├── ResumenView.tsx    # ✅ KPIs, donut, empresa, timeline, ranking, tabla
│   │   ├── TendenciasView.tsx # (Fase 4)
│   │   ├── PreciosView.tsx    # (Fase 5)
│   │   ├── ProveedoresView.tsx# (Fase 6)
│   │   ├── CompradoresView.tsx# (Fase 6)
│   │   ├── ReportesView.tsx   # (Fase 7)
│   │   └── PlaceholderView.tsx
│   ├── theme/tokens.ts        # ✅ colores, tipografía, sombras
│   └── App.tsx                # ✅ filtros globales con useMemo, filtrarCompras()
└── ...
```

**Separación obligatoria:** los datos se calculan en `analytics/` (funciones puras,
testeables) y la UI en `components/` solo pinta. Nunca calcular dentro de un componente.

---

## 6. Comandos

```bash
npm install         # dependencias
npm run dev         # desarrollo local (http://localhost:5173)
npm run build       # build estático a /dist
npm run preview     # ver el build localmente
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

---

## 7. Convenciones

- **Idioma:** toda la UI, etiquetas y reportes en **español de México**.
- **Moneda:** formato `$#,###.##` con separador de miles; etiquetar IVA sí/no.
- **Commits:** mensajes claros en español, un commit por tarea de `docs/PLAN.md`.
- **Sin datos sensibles** en el repo (ni en commits): el Excel real no se sube a Git;
  solo el `ejemplo.xlsx`. Agregar `*.xlsx` salvo el de ejemplo al `.gitignore`.
- **Código mínimo y limpio**, sin comentarios obvios. Tipar todo lo del esquema.
- **Mobile-friendly**: los jefes lo van a abrir desde el celular también.

---

## 8. Definición de "terminado" (Definition of Done)

Una tarea está terminada cuando:
1. `npm run typecheck` y `npm run lint` pasan sin errores.
2. Funciona con el `ejemplo.xlsx` **y** con un dataset más grande (varios meses).
3. No revienta si una columna viene vacía o con texto inesperado (validación defensiva).
4. Se ve bien en escritorio y en celular.
5. Está commiteado con mensaje descriptivo.
