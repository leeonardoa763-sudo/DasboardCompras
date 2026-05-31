# ARQUITECTURA.md — Diseño técnico

> Detalle de cómo fluyen los datos, qué hace cada módulo y las **fórmulas exactas** de
> análisis. Pensado para que Claude Code implemente sin ambigüedad.

---

## 1. Flujo de datos

```
Excel (.xlsx)  ──SheetJS──┐
                          ├──► normalize.ts ──► Compra[]  ──► analytics/  ──► views/ (UI)
Google Sheet (CSV) ─Papa──┘        (tipado)     (puras)      (cálculo)        (pinta)
```

- **Una sola forma de datos:** todo se convierte a `Compra[]` (tipo en `schema.ts`).
  No importa si vino de Excel o de Google Sheets; de ahí para arriba el código es idéntico.
- **Funciones puras en `analytics/`:** reciben `Compra[]` + parámetros y regresan números
  o estructuras listas para graficar. Sin React, sin estado → fáciles de probar.
- **UI tonta en `components/`:** recibe props ya calculadas y solo las muestra.

---

## 2. Tipo base

```ts
// src/data/schema.ts
export interface Compra {
  empresa: string;
  centroCostos: number;
  ordenCompra: number;
  fecha: Date;
  idProveedor: number;
  proveedor: string;
  insumo: number;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;   // Pu, sin IVA
  moneda: string;
  importe: number;          // sin IVA
  tipoInsumo: string;
  notas: string | null;
  comprador: string;
  factorAhorro: number;     // %de Ahrro (ver nota en CLAUDE.md §4)
  ahorro: number;           // monto MXN (usar este)
  codComprador: string;
  codAhorro: string;
  mes: number;
  semana: number;
  insumoClave: string;
  totalConIva: number;      // = importe * 1.16
}

// Mapa de encabezados EXACTOS del Excel -> campo interno
export const HEADERS: Record<string, keyof Compra> = {
  "Empresa": "empresa",
  "CENTRO DE COSTOS": "centroCostos",
  "ODEN DE COMPRA": "ordenCompra",      // errata intencional: "ODEN"
  "Fecha de compra": "fecha",
  "id Proveedor": "idProveedor",
  "Proveedor": "proveedor",
  "Insumo": "insumo",
  "Descripcion": "descripcion",
  "Cantidad": "cantidad",
  "Unidad": "unidad",
  "Pu": "precioUnitario",
  "Moneda": "moneda",
  "Importe": "importe",
  "Tipo De Insumo": "tipoInsumo",
  "Notas": "notas",
  "Comprador": "comprador",
  "%de Ahrro": "factorAhorro",          // errata intencional: "Ahrro"
  "Ahorro": "ahorro",
  "Codigo Comprador": "codComprador",
  "Codigo de ahorro": "codAhorro",
  "Mes": "mes",
  "Semana": "semana",
  "InsumoClave": "insumoClave",
  "Total + IVA": "totalConIva",
};
```

---

## 3. Módulos de `analytics/`

### `selectors.ts` — agregaciones
Funciones tipo:
- `gastoTotal(compras, { conIva })` → number
- `ahorroTotal(compras)` → number
- `porGrupo(compras, campo)` → `{ clave, importe, totalConIva, ahorro, conteo }[]`
  (campo = `empresa | proveedor | comprador | tipoInsumo | centroCostos`)
- `topN(filas, n)` y ordenamientos.

### `trends.ts` — series y tendencias (ver §4 fórmulas)
- `serieSemanal(compras)` y `serieMensual(compras)` → `{ periodo, importe }[]`
- `variacion(serie)` → Δ absoluto y Δ% periodo contra anterior
- `acumulado(serie)`
- `mediaMovil(serie, ventana=3)`
- `regresionPrecio(compras, insumoClave)` → `{ pendiente, intercepto, r2, proyeccion }`
- `indiceBase100(serie)`
- `volatilidad(valores)` → desviación estándar

### `reports.ts` — reportes
- `reporteMensual(compras, mes)` y `reporteSemanal(compras, semana)` → estructura con
  KPIs del periodo, tablas y texto de variación contra el periodo previo.

---

## 4. FÓRMULAS DE ANÁLISIS (especificación exacta)

Usar `simple-statistics` donde aplique, pero estas son las definiciones a respetar.

### 4.1 Regresión lineal de precio (mínimos cuadrados)
Para un insumo, ordenar sus compras por fecha. Sea `x` = días transcurridos desde la
primera compra y `y` = `precioUnitario`.

```
pendiente (m) = Σ((xᵢ − x̄)(yᵢ − ȳ)) / Σ((xᵢ − x̄)²)
intercepto (b) = ȳ − m·x̄
y_estimado(x) = m·x + b
```
- `m` = cambio de precio por día. Mostrar también como **% mensual ≈ m·30 / ȳ**.
- Tendencia visual: `m > umbral` → ↑ subiendo, `m < −umbral` → ↓ bajando, si no → → estable.
- Requiere **≥ 2 puntos**; con 1 punto marcar "datos insuficientes".

### 4.2 Bondad de ajuste (r²)
```
r² = 1 − ( Σ(yᵢ − ŷᵢ)²  /  Σ(yᵢ − ȳ)² )
```
- r² cercano a 1 = la recta explica bien el precio. Mostrarlo como confianza de la tendencia.

### 4.3 Media móvil (suavizado)
```
MM(t, ventana=3) = promedio(valores[t−ventana+1 .. t])
```

### 4.4 Variación periodo vs periodo
```
Δ      = valorₜ − valorₜ₋₁
Δ%     = (valorₜ − valorₜ₋₁) / valorₜ₋₁          (cuidar división entre 0)
```
Aplica a gasto semanal y mensual.

### 4.5 Índice de precios base 100
```
indiceₜ = (valorₜ / valor₀) · 100
```
Permite comparar varios insumos en una sola gráfica aunque tengan precios muy distintos.

### 4.6 Volatilidad (desviación estándar muestral del Pu)
```
σ = sqrt( Σ(xᵢ − x̄)² / (n − 1) )
```
Insumos con σ alta = precios inestables → foco de negociación.

### 4.7 % de ahorro (SUPUESTO — confirmar con el usuario)
```
%ahorro = ahorro / (importe + ahorro)
```
No derivar de `factorAhorro`. Dejar comentario en el código marcando el supuesto.

### 4.8 Concentración de proveedores (opcional, Pareto / HHI)
```
participación_i = gasto_proveedor_i / gasto_total
HHI = Σ (participación_i)²        // cercano a 1 = muy concentrado en pocos proveedores
```

---

## 5. Guía de diseño visual

- **Tono:** ejecutivo industrial. Limpio, denso de información pero ordenado. Nada de
  degradados morados ni look genérico de plantilla.
- **Color:** una base oscura o gris carbón con **un** acento fuerte (ej. ámbar de
  seguridad o azul acero) para los números clave y las alertas. El resto, neutros.
- **Tipografía:** una fuente display con carácter para títulos/KPIs y una fuente de
  lectura limpia para tablas. Evitar Arial/Inter/Roboto. Números en variante tabular
  para que las cifras se alineen.
- **Jerarquía:** los KPIs grandes mandan; las gráficas apoyan; las tablas dan el detalle.
- **Color con significado:** verde = ahorro/baja de precio, rojo = sobrecosto/alza,
  neutro = estable. Consistente en toda la app.
- **Densidad responsable:** márgenes generosos, no amontonar; el modo presentación
  respira aún más.

---

## 6. Notas de implementación

- Parsear fechas con cuidado (SheetJS puede dar número serial de Excel o string).
- Normalizar nombres de proveedor (espacios, mayúsculas) para que no se dupliquen al
  agrupar — ya pasó antes con datos de Enkontrol.
- Toda cifra monetaria debe **declarar si lleva IVA o no** en su etiqueta.
- No subir el Excel real al repo (`.gitignore`), solo `ejemplo.xlsx`.
- Probar SIEMPRE con: (a) el ejemplo de un mes y (b) un dataset inventado de varios
  meses, para que las tendencias tengan sentido.
