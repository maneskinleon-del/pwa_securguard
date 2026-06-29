/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActiveCheckIn, LogItem } from '../types';

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
