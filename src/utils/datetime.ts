/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns the LOCAL calendar date as `YYYY-MM-DD`.
 *
 * Why not `new Date().toISOString().split('T')[0]`? `toISOString()` is always UTC,
 * so for a guard working late (e.g. Chile, UTC-4) the UTC date can already be the
 * next day. That made daily reports show entries dated 2026-06-18 while the export
 * timestamp (local time) said 17/6/2026. Using the local date keeps every record
 * and report aligned to the guard's actual working day.
 */
export const getLocalDateISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
