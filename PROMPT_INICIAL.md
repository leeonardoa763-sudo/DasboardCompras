# PROMPT_INICIAL.md — Cómo arrancar en Claude Code

## Paso 0 — Preparar el repo
1. Crea la carpeta del proyecto y mete dentro estos archivos:
   - `CLAUDE.md` (raíz)
   - `docs/PLAN.md`
   - `docs/ARQUITECTURA.md`
   - `public/data/ejemplo.xlsx` (tu Excel de muestra)
2. Abre la carpeta en VS Code y lanza Claude Code ahí.

> Claude Code lee `CLAUDE.md` solo al iniciar. Los otros dos los leerá cuando se lo pidas.

---

## Prompt para la PRIMera sesión (pégalo tal cual)

```
Lee CLAUDE.md, docs/PLAN.md y docs/ARQUITECTURA.md antes de escribir nada.

Vamos a construir el proyecto por fases siguiendo docs/PLAN.md. Hoy solo la Fase 0
(Setup) y la Fase 1 (Capa de datos). No avances a la Fase 2.

Reglas:
- Respeta EXACTAMENTE el esquema de 24 columnas de CLAUDE.md §4, incluidas las
  erratas de encabezado "ODEN DE COMPRA" y "%de Ahrro".
- Toda la lógica de cálculo va en src/analytics/, separada de la UI.
- Valida de forma defensiva: si falta una columna o un dato viene raro, no truenes.
- Al terminar, corre typecheck y lint, y prueba que los totales (Importe y Total+IVA)
  con public/data/ejemplo.xlsx cuadren con el Excel.

Empieza explicándome en 5 líneas tu plan para estas dos fases y luego ejecútalo.
Haz un commit por cada tarea cerrada de docs/PLAN.md.
```

---

## Prompt para las siguientes sesiones (plantilla)

```
Lee CLAUDE.md y docs/PLAN.md. Ya está cerrada la Fase N. Hoy hacemos la Fase N+1:
"<nombre de la fase>". Respeta el criterio de aceptación de esa fase en PLAN.md.
Antes de codear, dime en pocas líneas cómo lo vas a abordar. Commit por tarea.
```

---

## Tips de trabajo con Claude Code en este proyecto
- **Una fase por sesión.** No dejes que se adelante; el plan está pensado para que cada
  fase deje algo funcionando y commiteado.
- Si una respuesta se va por las ramas, recuérdale: *"apégate a docs/PLAN.md, Fase N"*.
- Cuando agregues datos reales de varios meses, pídele que **revalide las tendencias**
  (Fase 4 y 5) con ese dataset más grande.
- Para el deploy de "un click": al cerrar la Fase 0 ya debe existir la URL de Vercel;
  así los jefes pueden ver el avance desde el día uno.

---

## Alternativa sin programar (por si la quieres tener en el radar)
Si en algún momento el mantenimiento te pesa, el mismo análisis se puede montar sobre un
**Google Sheet + Looker Studio** (cero código, se comparte con un link). Pierdes el modo
presentación a la medida y el control fino del diseño, pero es la opción de menor esfuerzo.
La ruta de este plan (código propio) te da más control y es más impresionante; esta queda
solo como plan B.
