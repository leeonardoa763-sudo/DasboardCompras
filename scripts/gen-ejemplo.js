/**
 * Genera public/data/ejemplo.xlsx con 30 filas de datos realistas (Ene–Mar 2024).
 * Uso: node scripts/gen-ejemplo.js   (después de npm install)
 */
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'data', 'ejemplo.xlsx')

const r2 = (n) => Math.round(n * 100) / 100
const d = (s) => new Date(s + 'T12:00:00') // noon local para evitar drift de zona horaria

// Construye una fila calculando importe, ahorro y totalConIva
function fila(empresa, cc, oc, fecha, idProv, prov, insumo, desc, cant, unidad, pu, moneda, tipo, notas, comprador, factorAhorro, mes, semana, insumoClave) {
  const importe = r2(cant * pu)
  const ahorro = r2(importe * (factorAhorro - 1) * 0.9) // ligera discrepancia respecto al factor, intencionada
  const totalConIva = r2(importe * 1.16)
  const codComp = comprador.substring(0, 3).toUpperCase() + '-' + cc
  const codAhorro = 'AH-' + oc
  return [empresa, cc, oc, fecha, idProv, prov, insumo, desc, cant, unidad, pu, moneda, importe, tipo, notas, comprador, factorAhorro, ahorro, codComp, codAhorro, mes, semana, insumoClave, totalConIva]
}

// Encabezados EXACTOS — incluye erratas intencionales
const HEADERS = [
  'Empresa', 'CENTRO DE COSTOS', 'ODEN DE COMPRA', 'Fecha de compra',
  'id Proveedor', 'Proveedor', 'Insumo', 'Descripcion', 'Cantidad',
  'Unidad', 'Pu', 'Moneda', 'Importe', 'Tipo De Insumo', 'Notas',
  'Comprador', '%de Ahrro', 'Ahorro', 'Codigo Comprador',
  'Codigo de ahorro', 'Mes', 'Semana', 'InsumoClave', 'Total + IVA',
]

const ROWS = [
  // ── Enero 2024 ────────────────────────────────────────────────────
  fila('COEDESSA', 149, 1001, d('2024-01-08'), 101, 'FERREX SA DE CV',        10001, 'Varilla 3/8"x12m',           500, 'KG',  22.50, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0200, 1, 2,  '10001-VARILLA'),
  fila('COEDESSA', 149, 1002, d('2024-01-10'), 103, 'ACEROS MONTERREY',        10002, 'Varilla 1/2"x12m',           300, 'KG',  28.00, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0150, 1, 2,  '10002-VARILLA'),
  fila('TRIACO',   134, 1003, d('2024-01-12'), 102, 'MATERIALES DEL NORTE',    20001, 'Tubo 2" PVC hidraulico',      80, 'PZA', 45.00, 'MN', 'TUBERIA',           null, 'Hector', 1.0000, 1, 2,  '20001-TUBO2'),
  fila('COEDESSA', 134, 1004, d('2024-01-15'), 104, 'CEMENTOS TOLTECA',        30001, 'Cemento CPC30 50kg',         200, 'SAC', 185.00,'MN', 'CONCRETO',          null, 'Oscar',  1.0250, 1, 3,  '30001-CEMENTO'),
  fila('TRIACO',   138, 1005, d('2024-01-18'), 105, 'FERRETERIA CENTRAL',      40001, 'Alambre recocido #16',       100, 'KG',  38.50, 'MN', 'FERRETERIA',        null, 'Hector', 1.0000, 1, 3,  '40001-ALAMBRE'),
  fila('CAPAM',    138, 1006, d('2024-01-22'), 101, 'FERREX SA DE CV',         10001, 'Varilla 3/8"x12m',           200, 'KG',  22.80, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0100, 1, 4,  '10001-VARILLA'),
  fila('COEDESSA', 149, 1007, d('2024-01-25'), 102, 'MATERIALES DEL NORTE',    20002, 'Tubo 4" PVC hidraulico',      40, 'PZA', 85.00, 'MN', 'TUBERIA',           null, 'Oscar',  1.0000, 1, 4,  '20002-TUBO4'),
  fila('TRIACO',   134, 1008, d('2024-01-29'), 105, 'FERRETERIA CENTRAL',      40002, 'Clavo 3" de acero',           50, 'KG',  28.00, 'MN', 'FERRETERIA',        null, 'Hector', 1.0000, 1, 5,  '40002-CLAVO'),
  // ── Febrero 2024 ──────────────────────────────────────────────────
  fila('COEDESSA', 149, 1009, d('2024-02-05'), 103, 'ACEROS MONTERREY',        10001, 'Varilla 3/8"x12m',           600, 'KG',  23.00, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0300, 2, 6,  '10001-VARILLA'),
  fila('COEDESSA', 149, 1010, d('2024-02-07'), 103, 'ACEROS MONTERREY',        10002, 'Varilla 1/2"x12m',           250, 'KG',  29.50, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0200, 2, 6,  '10002-VARILLA'),
  fila('TRIACO',   134, 1011, d('2024-02-09'), 101, 'FERREX SA DE CV',         20001, 'Tubo 2" PVC hidraulico',      60, 'PZA', 46.50, 'MN', 'TUBERIA',           null, 'Hector', 1.0000, 2, 6,  '20001-TUBO2'),
  fila('CAPAM',    138, 1012, d('2024-02-12'), 104, 'CEMENTOS TOLTECA',        30001, 'Cemento CPC30 50kg',         150, 'SAC', 187.00,'MN', 'CONCRETO',          null, 'Oscar',  1.0200, 2, 7,  '30001-CEMENTO'),
  fila('COEDESSA', 134, 1013, d('2024-02-14'), 102, 'MATERIALES DEL NORTE',    50001, 'Manguera polietileno 1/2"', 200, 'MT',  15.00, 'MN', 'TUBERIA',           null, 'Leo',    1.0000, 2, 7,  '50001-MANGUERA'),
  fila('TRIACO',   138, 1014, d('2024-02-19'), 105, 'FERRETERIA CENTRAL',      40001, 'Alambre recocido #16',        80, 'KG',  39.00, 'MN', 'FERRETERIA',        null, 'Hector', 1.0000, 2, 8,  '40001-ALAMBRE'),
  fila('COEDESSA', 149, 1015, d('2024-02-21'), 101, 'FERREX SA DE CV',         10001, 'Varilla 3/8"x12m',           400, 'KG',  22.50, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0150, 2, 8,  '10001-VARILLA'),
  fila('CAPAM',    138, 1016, d('2024-02-26'), 102, 'MATERIALES DEL NORTE',    20002, 'Tubo 4" PVC hidraulico',      30, 'PZA', 87.00, 'MN', 'TUBERIA',           null, 'Oscar',  1.0000, 2, 9,  '20002-TUBO4'),
  fila('TRIACO',   134, 1017, d('2024-02-28'), 103, 'ACEROS MONTERREY',        40002, 'Clavo 3" de acero',           40, 'KG',  29.00, 'MN', 'FERRETERIA',        null, 'Hector', 1.0000, 2, 9,  '40002-CLAVO'),
  // ── Marzo 2024 ────────────────────────────────────────────────────
  fila('COEDESSA', 149, 1018, d('2024-03-04'), 103, 'ACEROS MONTERREY',        10001, 'Varilla 3/8"x12m',           800, 'KG',  24.00, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0350, 3, 10, '10001-VARILLA'),
  fila('COEDESSA', 149, 1019, d('2024-03-06'), 101, 'FERREX SA DE CV',         10002, 'Varilla 1/2"x12m',           200, 'KG',  30.00, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0200, 3, 10, '10002-VARILLA'),
  fila('TRIACO',   134, 1020, d('2024-03-08'), 102, 'MATERIALES DEL NORTE',    20001, 'Tubo 2" PVC hidraulico',     100, 'PZA', 47.00, 'MN', 'TUBERIA',           null, 'Hector', 1.0000, 3, 10, '20001-TUBO2'),
  fila('CAPAM',    138, 1021, d('2024-03-11'), 104, 'CEMENTOS TOLTECA',        30001, 'Cemento CPC30 50kg',         180, 'SAC', 188.00,'MN', 'CONCRETO',          null, 'Oscar',  1.0250, 3, 11, '30001-CEMENTO'),
  fila('COEDESSA', 134, 1022, d('2024-03-13'), 105, 'FERRETERIA CENTRAL',      40001, 'Alambre recocido #16',       120, 'KG',  40.00, 'MN', 'FERRETERIA',        null, 'Leo',    1.0000, 3, 11, '40001-ALAMBRE'),
  fila('TRIACO',   138, 1023, d('2024-03-15'), 101, 'FERREX SA DE CV',         10001, 'Varilla 3/8"x12m',           500, 'KG',  23.50, 'MN', 'ACERO DE REFUERZO', null, 'Hector', 1.0200, 3, 11, '10001-VARILLA'),
  fila('COEDESSA', 149, 1024, d('2024-03-18'), 103, 'ACEROS MONTERREY',        10002, 'Varilla 1/2"x12m',           350, 'KG',  30.50, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0250, 3, 12, '10002-VARILLA'),
  fila('CAPAM',    138, 1025, d('2024-03-20'), 102, 'MATERIALES DEL NORTE',    50001, 'Manguera polietileno 1/2"', 300, 'MT',  15.50, 'MN', 'TUBERIA',           null, 'Oscar',  1.0000, 3, 12, '50001-MANGUERA'),
  fila('TRIACO',   134, 1026, d('2024-03-22'), 105, 'FERRETERIA CENTRAL',      40002, 'Clavo 3" de acero',           60, 'KG',  29.50, 'MN', 'FERRETERIA',        null, 'Hector', 1.0000, 3, 12, '40002-CLAVO'),
  fila('COEDESSA', 149, 1027, d('2024-03-25'), 101, 'FERREX SA DE CV',         10001, 'Varilla 3/8"x12m',           300, 'KG',  23.00, 'MN', 'ACERO DE REFUERZO', null, 'Leo',    1.0100, 3, 13, '10001-VARILLA'),
  fila('CAPAM',    138, 1028, d('2024-03-27'), 104, 'CEMENTOS TOLTECA',        30001, 'Cemento CPC30 50kg',         100, 'SAC', 190.00,'MN', 'CONCRETO',          null, 'Oscar',  1.0250, 3, 13, '30001-CEMENTO'),
  fila('TRIACO',   134, 1029, d('2024-03-28'), 103, 'ACEROS MONTERREY',        20002, 'Tubo 4" PVC hidraulico',      50, 'PZA', 88.00, 'MN', 'TUBERIA',           null, 'Hector', 1.0000, 3, 13, '20002-TUBO4'),
  fila('COEDESSA', 149, 1030, d('2024-03-29'), 102, 'MATERIALES DEL NORTE',    40001, 'Alambre recocido #16',        90, 'KG',  40.50, 'MN', 'FERRETERIA',        null, 'Leo',    1.0000, 3, 13, '40001-ALAMBRE'),
]

// Crear workbook
const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS])

// Formatear columna de fecha (columna D = índice 3) como fecha
const dateColIdx = 3
for (let i = 1; i <= ROWS.length; i++) {
  const cellAddr = XLSX.utils.encode_cell({ r: i, c: dateColIdx })
  if (ws[cellAddr] && ws[cellAddr].t === 'd') {
    ws[cellAddr].z = 'dd/mm/yyyy'
  }
}

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Compras')

// Asegurar que el directorio existe
fs.mkdirSync(path.dirname(OUT), { recursive: true })
XLSX.writeFile(wb, OUT)

// Imprimir totales para verificación
const totalImporte = ROWS.reduce((s, r) => s + r[12], 0)
const totalIva     = ROWS.reduce((s, r) => s + r[23], 0)
const totalAhorro  = ROWS.reduce((s, r) => s + r[17], 0)

console.log('✓ Generado:', OUT)
console.log('─'.repeat(45))
console.log(`Total Importe (sin IVA): $${totalImporte.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`)
console.log(`Total + IVA:             $${totalIva.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`)
console.log(`Total Ahorro:            $${totalAhorro.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`)
console.log(`Filas:                   ${ROWS.length}`)
