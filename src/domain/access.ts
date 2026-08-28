/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Domain layer for SecurGuard access control.
 * 
 * Conceptual model:
 * 
 *   Persona (identity/pre-registration)
 *      │
 *      │ identity
 *      ▼
 *   AccessSession (a concrete visit)
 *      │
 *      ├── Entrada (log entry)
 *      └── Salida (log exit)
 * 
 * This module contains pure functions for computing derived data
 * from the raw LogItem[] and ActiveCheckIn[] arrays.
 */

import { LogItem, ActiveCheckIn } from '../types';
import { getLocalDateISO } from '../utils/datetime';

// --- Constants ---

/** Duration threshold (ms) to consider a stay as "long". Default: 60 minutes */
export const LONG_STAY_THRESHOLD_MS = 60 * 60 * 1000;

/** Number of histogram bars to show (one per hour from 00 to 23) */
export const HISTOGRAM_BARS = 24;

// --- Pure metric functions ---

/**
 * Calculate the number of entries for today.
 */
export function calculateEntriesToday(logs: LogItem[]): number {
  const today = getLocalDateISO();
  return logs.filter(l => l.action === 'Entrada' && l.date === today).length;
}

/**
 * Calculate the number of active people currently inside.
 */
export function calculateActiveCount(activeInside: ActiveCheckIn[]): number {
  return activeInside.length;
}

/**
 * Returns true if a given active check-in has been inside longer than the
 * long-stay threshold.
 */
export function isLongStay(active: ActiveCheckIn): boolean {
  if (!active.entryTimestamp) return false;
  const durationMs = Date.now() - active.entryTimestamp;
  return durationMs >= LONG_STAY_THRESHOLD_MS;
}

/**
 * Calculate how many people are currently in "long stay" status.
 * Only counts VISITANTE type by default (configurable).
 */
export function calculateLongStayAlerts(
  activeInside: ActiveCheckIn[],
  typeFilter?: string
): number {
  return activeInside.filter(a => {
    const matchesType = !typeFilter || a.type === typeFilter;
    return matchesType && isLongStay(a);
  }).length;
}

/**
 * Get the current stay duration in milliseconds for an active check-in.
 * Returns 0 if entryTimestamp is missing.
 */
export function getStayDurationMs(active: ActiveCheckIn): number {
  if (!active.entryTimestamp) return 0;
  return Date.now() - active.entryTimestamp;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * e.g. "1h 15m", "45m", "30s"
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Calculate hourly traffic distribution from today's entries.
 * Returns an array of 24 numbers (entries per hour 00-23).
 */
export function calculateHourlyTraffic(logs: LogItem[]): number[] {
  const today = getLocalDateISO();
  const todayEntries = logs.filter(l => l.action === 'Entrada' && l.date === today);
  
  const hourlyCounts = new Array(HISTOGRAM_BARS).fill(0);
  
  for (const entry of todayEntries) {
    // Parse time string "HH:MM" to extract hour
    const hour = parseHourFromTimeString(entry.time);
    if (hour >= 0 && hour < HISTOGRAM_BARS) {
      hourlyCounts[hour]++;
    }
  }
  
  return hourlyCounts;
}

/**
 * Parse hour from a time string like "14:30" or "06:30 AM".
 * Returns -1 if parsing fails.
 */
export function parseHourFromTimeString(timeStr: string): number {
  if (!timeStr) return -1;
  
  // Handle 12-hour format with AM/PM
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  }
  
  // Handle 24-hour format
  const basicMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (basicMatch) {
    return parseInt(basicMatch[1], 10);
  }
  
  return -1;
}

/**
 * Find the hour with the peak traffic.
 * Returns { hour: number, count: number } or null if no entries today.
 */
export function findPeakHour(logs: LogItem[]): { hour: number; count: number } | null {
  const hourlyCounts = calculateHourlyTraffic(logs);
  let maxCount = 0;
  let maxHour = 0;
  
  for (let i = 0; i < hourlyCounts.length; i++) {
    if (hourlyCounts[i] > maxCount) {
      maxCount = hourlyCounts[i];
      maxHour = i;
    }
  }
  
  if (maxCount === 0) return null;
  return { hour: maxHour, count: maxCount };
}

/**
 * Format hour number (0-23) to display string like "14:00".
 */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Calculate the percentage change compared to yesterday's entry count.
 * Returns null if yesterday had 0 entries (can't calculate % change).
 */
export function calculatePercentageChange(
  logs: LogItem[],
  previousDayLogs?: LogItem[]
): number | null {
  const today = getLocalDateISO();
  const yesterday = getYesterdayISO();
  
  const todayCount = logs.filter(l => l.action === 'Entrada' && l.date === today).length;
  
  if (previousDayLogs) {
    // Use provided previous day data
    const yesterdayCount = previousDayLogs.filter(l => l.action === 'Entrada' && l.date === yesterday).length;
    if (yesterdayCount === 0) return null;
    return Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
  }
  
  // Without previous day data, we can't calculate real change
  // Return null instead of inventing a number
  return null;
}

/**
 * Get yesterday's date in ISO format.
 */
export function getYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateISO(d);
}

/**
 * Normalize a RUT for safe comparison.
 */
export function normalizeRutForComparison(rut?: string | null): string {
  return (rut ?? '').trim().toUpperCase();
}

/**
 * Pair an exit log entry with its corresponding entry log using entryId.
 * This allows finding the original entry for a given exit.
 */
export function pairExitWithEntry(exitLog: LogItem, allLogs: LogItem[]): LogItem | null {
  if (!exitLog.entryId) return null;
  return allLogs.find(l => l.id === exitLog.entryId) ?? null;
}

/**
 * Check if an exit log has a valid entryId pointing to a real entry.
 */
export function hasValidEntryPair(exitLog: LogItem): boolean {
  return !!exitLog.entryId;
}

// --- Entry/Exit pairing for session reconstruction ---

/**
 * Represents a paired entry-exit session.
 */
export interface AccessSession {
  entryLog: LogItem;
  exitLog: LogItem | null;
  durationMs: number | null;
}

/**
 * Reconstruct access sessions from log entries.
 * Groups entries with their corresponding exits (via entryId).
 */
export function reconstructSessions(logs: LogItem[]): AccessSession[] {
  const sessions: AccessSession[] = [];
  const processedExits = new Set<string>();
  
  // Process logs in chronological order (oldest first)
  const sortedLogs = [...logs].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
  
  for (const log of sortedLogs) {
    if (log.action === 'Entrada') {
      let exitLog: LogItem | null = null;
      let durationMs: number | null = null;
      
      // Look for matching exit
      const matchingExit = sortedLogs.find(
        l => l.action === 'Salida' && l.entryId === log.id
      );
      
      if (matchingExit) {
        exitLog = matchingExit;
        processedExits.add(matchingExit.id);
        
        // Calculate duration if we have timestamps
        if (log.entryTimestamp && matchingExit.entryTimestamp) {
          durationMs = matchingExit.entryTimestamp - log.entryTimestamp;
        }
      }
      
      sessions.push({ entryLog: log, exitLog, durationMs });
    }
  }
  
  return sessions;
}

// --- Single-movement deletion (sesión Entrada ↔ Salida) ---

/**
 * Plan de borrado para un movimiento individual.
 *
 * `removeLogIds`: ids de `LogItem[]` a eliminar.
 * `removeActiveIds`: ids de `ActiveCheckIn[]` a eliminar para no dejar
 * sesiones activas huérfanas (una Entrada activa que muere también debe
 * desaparecer de `activeInside`).
 */
export interface MovementDeletionPlan {
  removeLogIds: string[];
  removeActiveIds: string[];
}

/**
 * Decide qué eliminar al borrar un movimiento individual, manteniendo la
 * consistencia de la sesión Entrada ↔ Salida vía `entryId`.
 *
 * Reglas de negocio (decisión documentada):
 * - Eliminar una **Salida** → se borra SOLO esa Salida. La Entrada se
 *   conserva como historial: una Salida es un evento terminal que no deja
 *   sesiones activas ni hijas que huérfanas.
 * - Eliminar una **Entrada** → se borra la sesión COMPLETA: la Entrada y
 *   todas sus Salidas asociadas por `entryId` (no se deja una Salida
 *   huérfana apuntando a una Entrada inexistente).
 * - Si la Entrada sigue **activa** (`activeInside` referenciándola por id),
 *   también se elimina de `activeInside` para mantener la consistencia
 *   logs ↔ activeInside.
 * - Esta operación NO toca `personas[]`: el directorio es independiente
 *   del historial de movimientos.
 *
 * Devuelve sets vacíos si `targetId` no existe en los logs (idempotente).
 */
export function resolveMovementDeletion(
  logs: LogItem[],
  activeInside: ActiveCheckIn[],
  targetId: string
): MovementDeletionPlan {
  const target = logs.find(l => l.id === targetId);
  if (!target) return { removeLogIds: [], removeActiveIds: [] };

  // Salida: evento terminal — borrar solo ella, conservar la Entrada.
  if (target.action === 'Salida') {
    return { removeLogIds: [target.id], removeActiveIds: [] };
  }

  // Entrada: sesión completa — ella + todas sus Salidas vía entryId.
  const exitIds = logs
    .filter(l => l.action === 'Salida' && l.entryId === target.id)
    .map(l => l.id);

  const removeLogIds = [target.id, ...exitIds];

  // Si la Entrada sigue activa, sacarla también de activeInside (consistencia).
  const removeActiveIds = activeInside
    .filter(a => a.id === target.id)
    .map(a => a.id);

  return { removeLogIds, removeActiveIds };
}
