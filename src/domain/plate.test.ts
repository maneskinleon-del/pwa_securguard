/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePlate,
  isValidPlate,
  isPlateMatch,
  findPlateIndex,
  formatPlateForDisplay,
} from './plate';

describe('normalizePlate', () => {
  it('elimina espacios, puntos, guiones y barras', () => {
    expect(normalizePlate('AB-CD-12')).toBe('ABCD12');
    expect(normalizePlate('ab.c.123')).toBe('ABC123');
    expect(normalizePlate(' KH 82 91 ')).toBe('KH8291');
  });

  it('normaliza a mayúsculas', () => {
    expect(normalizePlate('abcd12')).toBe('ABCD12');
    expect(normalizePlate('AbCdEf')).toBe('ABCDEF');
  });

  it('retorna vacío para entradas nulas o vacías', () => {
    expect(normalizePlate('')).toBe('');
    expect(normalizePlate(null)).toBe('');
    expect(normalizePlate(undefined)).toBe('');
  });

  it('mantiene sólo caracteres alfanuméricos', () => {
    expect(normalizePlate('AB-12!@#')).toBe('AB12');
  });
});

describe('isValidPlate', () => {
  it('acepta el formato 4L+2N (2007+)', () => {
    expect(isValidPlate('ABCD12')).toBe(true);
    expect(isValidPlate('abcd12')).toBe(true);
    expect(isValidPlate('AB-CD-12')).toBe(true);
  });

  it('acepta el formato 3L+3N (pre-1985)', () => {
    expect(isValidPlate('ABC123')).toBe(true);
    expect(isValidPlate('ABC-123')).toBe(true);
  });

  it('acepta el formato 2L+4N (1985-2007) presente en mock data', () => {
    expect(isValidPlate('AB1234')).toBe(true);
    expect(isValidPlate('KH8291')).toBe(true);
    expect(isValidPlate('TR4590')).toBe(true);
    expect(isValidPlate('GP9988')).toBe(true);
    expect(isValidPlate('GP-99-88')).toBe(true);
  });

  it('rechaza patentes demasiado cortas', () => {
    expect(isValidPlate('AB12')).toBe(false);
    expect(isValidPlate('')).toBe(false);
    expect(isValidPlate(null)).toBe(false);
  });

  it('rechaza patentes que no siguen ningún formato letra/número reconocido', () => {
    expect(isValidPlate('123456')).toBe(false); // solo números
    expect(isValidPlate('ABCDEF')).toBe(false); // solo letras
    expect(isValidPlate('1A2B3C')).toBe(false); // intercalado
  });

  it('acepta con dígito verificador (7 chars) cuando la base es válida', () => {
    expect(isValidPlate('ABCD12K')).toBe(true);
    expect(isValidPlate('ABC1235')).toBe(true);
    expect(isValidPlate('AB12349')).toBe(true);
  });
});

describe('isPlateMatch', () => {
  it('considera iguales patentes con distinto formato', () => {
    expect(isPlateMatch('ABCD12', 'abcd-12')).toBe(true);
    expect(isPlateMatch('AB CD 12', 'ab.cd.12')).toBe(true);
    expect(isPlateMatch('KH-82-91', 'KH8291')).toBe(true);
  });

  it('considera distintas patentes distintas', () => {
    expect(isPlateMatch('ABCD12', 'ABCD13')).toBe(false);
  });

  it('retorna false si alguna entrada es nula/vacía', () => {
    expect(isPlateMatch('', 'ABCD12')).toBe(false);
    expect(isPlateMatch('ABCD12', null)).toBe(false);
  });
});

describe('findPlateIndex', () => {
  const items = [
    { plate: 'ABC-123' },
    { plate: 'KH8291' },
    { plate: undefined },
  ];

  it('encuentra por patente con formato distinto', () => {
    expect(findPlateIndex(items, 'kh-82-91')).toBe(1);
    expect(findPlateIndex(items, 'abc123')).toBe(0);
  });

  it('retorna -1 si no encuentra', () => {
    expect(findPlateIndex(items, 'ZZ99ZZ')).toBe(-1);
    expect(findPlateIndex(items, '')).toBe(-1);
  });
});

describe('formatPlateForDisplay', () => {
  it('da formato legible según el patrón', () => {
    expect(formatPlateForDisplay('ABCD12')).toBe('ABCD-12');
    expect(formatPlateForDisplay('ABC123')).toBe('ABC-123');
    expect(formatPlateForDisplay('AB1234')).toBe('AB-1234');
  });

  it('retorna canónico si no reconoce el patrón', () => {
    expect(formatPlateForDisplay('12345')).toBe('12345');
  });
});
