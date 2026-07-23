/**
 * Valida un RUT chileno (con o sin puntos y guión).
 * Devuelve true si el dígito verificador es correcto.
 * Acepta formatos: "12.345.678-9", "12345678-9", "123456789K".
 */
export function isValidRut(input: string): boolean {
  if (!input) return false;
  const cleaned = input.replace(/[.\s]/g, '').toUpperCase();
  const match = cleaned.match(/^(\d{1,8})-?([\dkK])$/);
  if (!match) return false;

  const body = match[1];
  const verifier = match[2];

  // Algoritmo módulo 11
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedChar =
    expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);

  return verifier === expectedChar;
}

/**
 * Normaliza un RUT a formato "XX.XXX.XXX-Y" para consistencia en almacenamiento
 * y búsqueda. Si no es válido, devuelve el original limpio de espacios.
 */
export function normalizeRut(input: string): string {
  if (!input) return '';
  const cleaned = input.replace(/[.\s]/g, '').toUpperCase();
  const match = cleaned.match(/^(\d{1,8})-?([\dkK])$/);
  if (!match) return cleaned;
  const body = match[1];
  const verifier = match[2];
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${verifier}`;
}
