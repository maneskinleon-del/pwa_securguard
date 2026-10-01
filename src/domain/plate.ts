/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dominio: normalización y validación de patentes chilenas (PPU).
 *
 * Formatos reconocidos (verificado contra el Registro Civil / SRCeI y Wikipedia):
 *
 * 1. Formato histórico (1985-2007): 2 letras + 4 números  →  "AB-1234"
 *    Presente en los datos mock del proyecto (KH-82-91, TR-45-90, GP-99-88).
 *
 * 2. Formato pre-PPU (antes 1985): 3 letras + 3 números    →  "ABC-123"
 *    Presente en los datos mock del proyecto (ABC-123).
 *
 * 3. Formato actual (2007-presente): 4 letras + 2 números →  "ABCD12"
 *    Patente revisada introducida por el proyecto de modernización.
 *    En los datos físicos usa 4 consonantes (del alfabeto autorizado de 18
 *    consonantes: se omiten vocales y M, N, Ñ, Q), pero aquí se valida de
 *    forma permisiva (cualquier letra A-Z) para no rechazar patentes
 *    legacy o formatos regionales no estandarizados. La regla es: no
 *    inventar restricciones que el proyecto no documenta.
 *
 * La normalización DEBE ser la misma para "ABCD12", "abcd12", "AB-CD-12",
 * "AB CD12" y "AB.CD.12" para que la búsqueda y deduplicación funcionen.
 *
 * IMPORTANTE: este módulo es independiente de `rut.ts` (RUT personal). Las
 * patentes son un dominio ortogonal: un vehículo puede circular sin RUT asociado.
 */

// --- Constants ---

/** Caracteres alfanuméricos permitidos en una patente canónica. */
export const ALLOWED_PLATE_CHARS = /^[A-Z0-9]+$/i;

/**
 * Longitudes canónicas aceptadas (después de quitar separadores y espacios).
 * - 6: formatos clásicos (3L+3N, 2L+4N, 4L+2N)
 * - 7: formato con dígito verificador (PPU con DV)
 */
const CANONICAL_LENGTHS = new Set([6, 7]);

/**
 * Un "segmento" de letras o números.
 * 3L+3N, 2L+4N, 4L+2N son los tres arquetipos reconocidos.
 */
const PAT_PLATE_3L3N = /^[A-Z]{3}[0-9]{3}$/; // pre-1985 (ABC123)
const PAT_PLATE_2L4N = /^[A-Z]{2}[0-9]{4}$/; // 1985-2007 (AB1234)
const PAT_PLATE_4L2N = /^[A-Z]{4}[0-9]{2}$/; // 2007+ (ABCD12)
/** 7 chars: 6 base + 1 dígito verificador (letra o número). */
const PAT_PLATE_3L3N_DV = /^[A-Z]{3}[0-9]{3}[0-9A-Z]$/;
const PAT_PLATE_2L4N_DV = /^[A-Z]{2}[0-9]{4}[0-9A-Z]$/;
const PAT_PLATE_4L2N_DV = /^[A-Z]{4}[0-9]{2}[0-9A-Z]$/;

const ALL_PATTERNS: ReadonlyArray<RegExp> = [
  PAT_PLATE_3L3N,
  PAT_PLATE_2L4N,
  PAT_PLATE_4L2N,
  PAT_PLATE_3L3N_DV,
  PAT_PLATE_2L4N_DV,
  PAT_PLATE_4L2N_DV,
];

// --- Normalization ---

/**
 * Produce la representación canónica de una patente:
 * - elimina espacios, puntos, guiones, barras y cualquier separador
 * - pasa a mayúsculas
 * - conserva sólo caracteres alfanuméricos
 *
 * Ejemplos:
 *   "abcd-12"  → "ABCD12"
 *   "AB CD 12" → "ABCD12"
 *   "ab.c.123" → "ABC123"
 *   " kh 82 91 "→ "KH8291"
 */
export function normalizePlate(input: string | undefined | null): string {
  if (input == null) return '';
  return String(input)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

// --- Validation ---

/**
 * Valida si una patente (ya sea en forma bruta o canónica) corresponde a un
 * formato de patente chilena reconocible.
 *
 * La validación es estructural (distribución de letras/números) y no impone
 * el alfabeto restrictivo de consonantes para no rechazar formatos legacy.
 */
export function isValidPlate(input: string | undefined | null): boolean {
  const candidate = normalizePlate(input);
  if (candidate === '' || candidate.length < 6) return false;
  // Recorta dígito verificador opcional: valida sobre los 6 caracteres base.
  const base = candidate.slice(0, 6);
  return CANONICAL_LENGTHS.has(candidate.length) && ALL_PATTERNS.some(p => p.test(base));
}

/**
 * Compara dos patentes usando su forma canónica, evitando falsos duplicados
 * producidos por diferencias de formato (espacios, mayúsculas/minúsculas,
 * separadores).
 */
export function isPlateMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = normalizePlate(a);
  const nb = normalizePlate(b);
  if (na === '' || nb === '') return false;
  return na === nb;
}

/**
 * Busca una patente dentro de una lista de strings (por ejemplo, el campo `plate`
 * de varios LogItem) comparando canónicamente. Devuelve el índice del primer match
 * o -1 si no hay ninguno.
 */
export function findPlateIndex(items: ReadonlyArray<{ plate?: string | null }>, plate: string): number {
  const target = normalizePlate(plate);
  if (target === '') return -1;
  return items.findIndex(item => isPlateMatch(item.plate, target));
}

/**
 * Formatea una patente canónica para mostrarla al usuario con separadores
 * legibles, según el formato detectado:
 *   ABCD12  → "ABCD-12"
 *   ABC123  → "ABC-123"
 *   AB1234  → "AB-1234"
 * Si no se reconoce el patrón, devuelve la forma canónica sin separar.
 */
export function formatPlateForDisplay(input: string): string {
  const canonical = normalizePlate(input);
  if (canonical.length < 6) return canonical;
  if (PAT_PLATE_4L2N.test(canonical)) return `${canonical.slice(0, 4)}-${canonical.slice(4)}`;
  if (PAT_PLATE_3L3N.test(canonical)) return `${canonical.slice(0, 3)}-${canonical.slice(3)}`;
  if (PAT_PLATE_2L4N.test(canonical)) return `${canonical.slice(0, 2)}-${canonical.slice(2)}`;
  return canonical;
}
