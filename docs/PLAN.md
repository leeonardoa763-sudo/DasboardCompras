# PLAN.md — Roadmap de construcción

> Plan por fases para construir el dashboard con Claude Code.
> Trabajar **una fase a la vez**. No empezar una fase hasta cerrar la anterior con su
> criterio de aceptación. Cada checkbox es, idealmente, un commit.

---

## Fase 0 — Setup del proyecto
**Objetivo:** repo vacío que ya hace deploy.

- [x] `npm create vite@latest dashboard-compras -- --template react-ts`
- [x] Instalar: `tailwindcss recharts xlsx papaparse simple-statistics html2canvas jspdf`
- [x] Configurar Tailwind (postcss + `index.css`).
- [x] Crear la estructura de carpetas de `CLAUDE.md §5`.
- [ ] Subir a GitHub y conectar a **Vercel** (deploy automático en cada push).
- [x] Poner `public/data/ejemplo.xlsx` (el archivo de muestra).

**Aceptación:** `npm run dev` levanta una página "Hola" y existe una URL de Vercel viva.

---

## Fase 1 — Capa de datos
**Objetivo:** convertir cualquier Excel con la estructura fija en datos tipados y limpios.

- [ ] `src/data/schema.ts`: tipo `Compra` + mapa de **encabezados exactos** (incluir las
      erratas `ODEN DE COMPRA` y `%de Ahrro` — ver `CLAUDE.md §4`).
- [ ] `src/data/loadExcel.ts`: leer `.xlsx` con SheetJS → filas crudas.
- [ ] `src/data/normalize.ts`: crudo → `Compra[]` (parsear fechas, números, nulos).
- [ ] Validación defensiva: si falta una columna o el tipo no cuadra, registrar el
      problema y no tronar (devolver filas válidas + lista de advertencias).
- [ ] `src/data/loadSheet.ts`: leer CSV publicado de Google Sheets con PapaParse.

**Aceptación:** una función `cargarCompras()` devuelve `Compra[]` correcto desde el
`ejemplo.xlsx`; los totales coinciden con el Excel (Importe y Total+IVA).

---

## Fase 2 — Layout, navegación y tema
**Objetivo:** el "esqueleto" visual profesional.

- [ ] `src/theme/`: tokens de color (paleta industrial/ejecutiva), tipografía, sombras.
- [ ] Layout con barra lateral o superior: **Resumen · Tendencias · Precios ·
      Proveedores · Compradores · Reportes**.
- [ ] Filtros globales: empresa, centro de costo, rango de fechas, comprador.
- [ ] Encabezado con logo/título y fecha de última actualización del dataset.
- [ ] Diseño responsive (escritorio + celular).

**Aceptación:** navegación entre secciones funciona; filtros existen (aunque aún no
afecten datos); se ve bien en celular.

---

## Fase 3 — Resumen ejecutivo (KPIs)
**Objetivo:** la pantalla que impresiona en los primeros 5 segundos.

- [ ] `analytics/selectors.ts`: agregados base (totales, conteos, agrupaciones).
- [ ] Tarjetas KPI: Gasto total (con y sin IVA), Ahorro total, % ahorro, # OCs,
      # proveedores, ticket promedio.
- [ ] Gráfica: gasto por **tipo de insumo** (dona) y por **empresa** (barras).
- [ ] Gráfica: gasto por **centro de costo** (barras horizontales, top N).
- [ ] Tabla compacta: últimas órdenes.

**Aceptación:** KPIs cuadran con cálculos manuales sobre el `ejemplo.xlsx`; los filtros
de la Fase 2 ya recalculan todo.

---

## Fase 4 — Análisis de tendencias (semanal y mensual)
**Objetivo:** el "cómo vamos en el tiempo".

- [ ] `analytics/trends.ts`: serie de gasto por **semana** y por **mes**.
- [ ] Variación **semana vs semana** y **mes vs mes** (Δ absoluto y Δ%).
- [ ] Gasto **acumulado** en el periodo.
- [ ] Media móvil de 3 periodos sobre la serie semanal.
- [ ] Gráficas de línea/área + indicadores de subida/bajada con color.

**Aceptación:** con un dataset de varios meses, las series y los Δ% son correctos;
con un solo mes (como el ejemplo) no truena y muestra lo disponible.

---

## Fase 5 — Análisis de precios en el tiempo
**Objetivo:** la pestaña que pediste de precios contra el tiempo.

- [ ] Serie de **precio unitario (Pu)** por insumo a lo largo de las fechas
      (agrupar por `insumoClave`).
- [ ] **Regresión lineal** (mínimos cuadrados) por insumo: pendiente ($/día), proyección
      y r² (ver fórmulas en `ARQUITECTURA.md`).
- [ ] Índice de precios **base 100** (primer periodo) por insumo.
- [ ] **Volatilidad**: desviación estándar del Pu por insumo.
- [ ] Tabla: por insumo → Pu mín / máx / promedio / tendencia (↑↓→) / volatilidad.
- [ ] Selector para enfocar un insumo y ver su curva.

**Aceptación:** para insumos con varias compras se dibuja la curva y la recta de
tendencia; para insumos con una sola compra se marca "datos insuficientes".

---

## Fase 6 — Proveedores, compradores y centros de costo
**Objetivo:** rankings y negociación.

- [ ] Ranking de proveedores por gasto, # OCs y ahorro generado.
- [ ] Concentración de proveedores (% del gasto en el top proveedor / Pareto).
- [ ] Comparativa de **precio del mismo insumo entre proveedores** (oportunidad de ahorro).
- [ ] Ranking de **compradores**: gasto manejado y ahorro generado por cada uno.
- [ ] Desglose por centro de costo.

**Aceptación:** los rankings suman al total global; comparativa de precios identifica
correctamente el proveedor más barato por insumo.

---

## Fase 7 — Reportes mensuales y semanales
**Objetivo:** lo que se manda/imprime para dirección.

- [ ] `analytics/reports.ts`: armar un reporte para un (mes) o (semana) elegidos.
- [ ] Vista de reporte: encabezado, KPIs del periodo, tablas y comentario de variación.
- [ ] Selector de periodo (mes / semana).
- [ ] Botón **"Descargar PDF"** (html2canvas + jsPDF) y **"Imprimir"** con estilos print.

**Aceptación:** elegir una semana/mes genera un reporte coherente y exportable a PDF
legible.

---

## Fase 8 — Modo presentación + pulido
**Objetivo:** que se vea de empresa multimillonaria en la junta.

- [ ] Modo presentación a pantalla completa (secciones como "slides", navegación con
      flechas), sin menús distractores.
- [ ] Animaciones sobrias de entrada de KPIs/gráficas.
- [ ] Estados vacíos y de carga bien resueltos.
- [ ] Revisión final de tipografía, espaciados y contraste.

**Aceptación:** se puede dar toda la junta desde el modo presentación sin tocar el menú.

---

## Fase 9 — Deploy y acceso "de un click"
**Objetivo:** que los jefes entren sin fricción.

- [ ] Deploy de producción en Vercel con URL final.
- [ ] (Opcional) subdominio con nombre claro (ej. `compras.tuempresa.com`).
- [ ] Conectar la fuente **Google Sheets** publicada como CSV (actualizar Sheet =
      actualizar dashboard).
- [ ] Convertir en **PWA** ("agregar a pantalla de inicio") para que sea un ícono/app.
- [ ] (Opcional) protección con contraseña simple o gate de Vercel.
- [ ] Generar un **QR** a la URL para compartir en juntas.

**Aceptación:** desde un celular nuevo se abre la URL/QR y el dashboard carga con los
datos actuales sin instalar nada.

---

## Orden de prioridad si hay poco tiempo
Para una primera demo que impresione: **Fase 0 → 1 → 3 → 4 → 9** (deploy).
Precios (5), rankings (6) y reportes (7) se agregan después sin rehacer nada,
porque toda la lógica vive en `analytics/`.
