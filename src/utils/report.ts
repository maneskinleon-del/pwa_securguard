/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActiveCheckIn, GuardProfile, IncidentReport, LogItem } from '../types';
import { csvBlob, csvRow } from './csv';
import { getLocalDateISO } from './datetime';

/**
 * Consolidación de estados de presencia para los informes.
 *
 * `activeInside` es la fuente de verdad de quién está físicamente en el recinto:
 * el sistema agrega a la persona en su Entrada y la remueve en su Salida, por lo
 * que contiene exactamente a quienes tienen una "Entrada sin Salida correspondiente".
 *
 * Cada `ActiveCheckIn.id` es el id del log de Entrada que abrió la sesión, por lo
 * que podemos identificar de forma exacta (por sesión, no por RUT) qué filas de
 * Entrada de la bitácora siguen abiertas.
 */

const normRut = (v?: string | null): string => (v ?? '').trim().toUpperCase();

/**
 * Normaliza texto libre (descripciones, títulos, nombres) para el CSV.
 *
 * Convierte saltos de línea (textarea/enter) a un solo espacio para que cada
 * registro quede en UNA fila: Excel móvil renderiza los saltos de línea como
 * una celda gigante "hacia abajo", lo que rompe la visualización del informe.
 * Las comas siguen escapadas por csvRow (RFC 4180) — esto solo ataca los \n/\r.
 */
const flatText = (v: string | null | undefined): string =>
  (v ?? '').replace(/[\r\n]+/g, ' ').trim();

/** Conjunto de IDs de entradas que siguen abiertas (persona aún dentro). */
export const openEntryIds = (activeInside: ActiveCheckIn[]): Set<string> =>
  new Set(activeInside.map(a => a.id).filter(Boolean));

/**
 * ¿La sesión de esta Entrada sigue abierta?
 *
 * Sólo aplica a logs de acción 'Entrada'. Usa el match exacto por id de sesión, de
 * modo que si una persona entró, salió y volvió a entrar, la Entrada antigua queda
 * correctamente como cerrada (sólo la nueva sesión está abierta).
 */
export const isEntryStillOpen = (
  log: Pick<LogItem, 'id' | 'action'>,
  openIds: Set<string>,
): boolean => log.action === 'Entrada' && !!log.id && openIds.has(log.id);

/** ¿Esta persona (por RUT) está físicamente en el recinto ahora? */
export const isRutInside = (rut: string | undefined, activeInside: ActiveCheckIn[]): boolean => {
  const r = normRut(rut);
  return r !== '' && activeInside.some(a => normRut(a.rut) === r);
};

/** Formatea una duración en milisegundos a "Xh Ym" / "Ym" / "Zs". */
export const formatDurationFromMs = (ms: number): string => {
  if (!ms || ms <= 0) return 'N/A';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return `${Math.floor(ms / 1000)}s`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/**
 * Construye el contenido CSV del informe de control de accesos.
 *
 * Unifica la lógica que antes vivía duplicada en ControlTab y PersonasTab.
 * La única diferencia semántica entre ambos tabs era el encabezado de la
 * columna de estado ("Estado / Permanencia" vs "Estado") y el nombre del
 * archivo de descarga, controlados respectivamente por `statusHeader` y por
 * quien llama (cada tab conserva su propio nombre de archivo).
 *
 * @param logs        Bitácora completa de movimientos.
 * @param activeInside Personas físicamente presentes en el recinto.
 * @param profile      Perfil del guardia a cargo (nombre y punto de control).
 * @param incidents    Incidencias reportadas (sección opcional).
 * @param statusHeader Texto del encabezado de la columna de estado.
 */
export const buildSecurityReportCSV = (
  params: {
    logs: LogItem[];
    activeInside: ActiveCheckIn[];
    profile: GuardProfile;
    incidents: IncidentReport[];
    statusHeader: string;
  },
): string => {
  const { logs, activeInside, profile, incidents, statusHeader } = params;
  const openIds = openEntryIds(activeInside);

  const topMeta = [
    `Reporte de Control de Accesos y Seguridad`,
    csvRow(['Guardia a Cargo:', profile.name]),
    csvRow(['Punto de Control:', profile.gate]),
    csvRow(['Fecha de Exportación:', new Date().toLocaleString()]),
    csvRow(['Personas Actualmente en Recinto:', activeInside.length]),
    ``,
    `--- ESTADO ACTUAL DEL RECINTO (Solo personas presentes) ---`,
  ].join('\r\n');

  const presentHeaders = ['Nombre', 'RUT', 'Tipo', 'Destino / Unidad', 'Patente', 'Hora Entrada', 'Permanencia'];
  const presentRows = activeInside.map(s => [
    s.name ?? '',
    s.rut,
    s.type,
    s.unit ?? '',
    s.plate || 'N/A',
    s.entryTime,
    s.entryTimestamp ? formatDurationFromMs(Date.now() - s.entryTimestamp) : 'N/A',
  ]);
  const presentContent =
    presentRows.length > 0
      ? [csvRow(presentHeaders), ...presentRows.map(csvRow)].join('\r\n')
      : 'Sin personas en el recinto en este momento.';

  const headers = ['Fecha', 'Hora', 'Nombre', 'RUT', 'Tipo', 'Destino / Unidad', 'Patente', 'Acción', statusHeader];
  const rows = logs.map(l => [
    l.date,
    l.time,
    l.name ?? '',
    l.rut,
    l.type,
    l.unit ?? '',
    l.plate || 'N/A',
    l.action,
    l.action === 'Salida'
      ? `Permanencia: ${l.duration || 'N/A'}`
      : (isEntryStillOpen(l, openIds) ? 'EN RECINTO' : 'Fuera del recinto'),
  ]);

  const accessContent = [
    `--- BITÁCORA COMPLETA DE MOVIMIENTOS ---`,
    csvRow(headers),
    ...rows.map(csvRow),
  ].join('\r\n');

  let incidentContent = '';
  if (incidents.length > 0) {
    const incidentHeaders = ['Fecha', 'Hora', 'Categoría', 'Reportero', 'Ubicación', 'Título', 'Descripción'];
    const incidentRows = incidents.map(i => [
      i.date, // fecha REAL del incidente (useAppState la backfillea al rehidratar)
      i.time,
      i.category,
      flatText(i.reporter),
      flatText(i.gate),
      flatText(i.title),
      flatText(i.description),
    ]);
    incidentContent = [
      '\r\n--- INFORME DE INCIDENCIAS ---',
      csvRow(incidentHeaders),
      ...incidentRows.map(csvRow),
    ].join('\r\n');
  }

  // `sep=,` lo agrega csvBlob() (centralizado en utils/csv.ts) para todos los
  // exports; aquí solo se construye el contenido de las secciones.
  return `${topMeta}\r\n${presentContent}\r\n\r\n${accessContent}${incidentContent}`;
};

/**
 * Dispara la descarga del informe CSV en el navegador.
 * Centraliza la creación del blob y el anchor para evitar duplicación.
 */
export const downloadSecurityReportCSV = (csvContent: string, fileName: string): void => {
  const blob = csvBlob(csvContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

