/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook para gestionar el estado de choferes con persistencia en localStorage.
 * Cada chofer tiene: nombre, RUT, patente, unidad, y estado activo/inactivo.
 */

import { useEffect, useState } from 'react';
import { Chofer } from '../types';
import { INITIAL_CHOFERES } from '../data/mockChoferes';

const STORAGE_KEY = 'securguard_choferes';

const readArray = (key: string): any[] | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const sanitizeChoferes = (arr: any[]): Chofer[] =>
  arr
    .filter((c: any) => c && typeof c === 'object')
    .filter((c: any) => c.name && c.rut)
    .map((c: any, i: number) => ({
      id: typeof c.id === 'string' ? c.id : `ch-${Date.now()}-${i}`,
      name: String(c.name ?? ''),
      rut: String(c.rut ?? ''),
      plate: String(c.plate ?? ''),
      unit: String(c.unit ?? 'Aparcadero'),
      active: c.active !== false, // default true
      avatar: typeof c.avatar === 'string' ? c.avatar : undefined,
    }));

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export function useChoferesState() {
  const [choferes, setChoferes] = useState<Chofer[]>(() => {
    const arr = readArray(STORAGE_KEY);
    return arr ? sanitizeChoferes(arr) : INITIAL_CHOFERES;
  });

  // Persistir en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choferes));
  }, [choferes]);

  /** Agregar un nuevo chofer */
  const addChofer = (chofer: Omit<Chofer, 'id'>) => {
    const nuevo: Chofer = { ...chofer, id: `ch-${generateId()}` };
    setChoferes(prev => [nuevo, ...prev]);
    return nuevo;
  };

  /** Actualizar un chofer existente (ej: cambiar patente o nombre) */
  const updateChofer = (id: string, changes: Partial<Chofer>) => {
    setChoferes(prev => prev.map(c => (c.id === id ? { ...c, ...changes } : c)));
  };

  /** Marcar chofer como inactivo (ya no trabaja) */
  const deactivateChofer = (id: string) => {
    setChoferes(prev => prev.map(c => (c.id === id ? { ...c, active: false } : c)));
  };

  /** Reactivar chofer */
  const reactivateChofer = (id: string) => {
    setChoferes(prev => prev.map(c => (c.id === id ? { ...c, active: true } : c)));
  };

  /** Eliminar chofer permanentemente */
  const removeChofer = (id: string) => {
    setChoferes(prev => prev.filter(c => c.id !== id));
  };

  /** Restablecer la lista a los choferes iniciales (recargar catálogo) */
  const resetChoferes = () => {
    setChoferes(INITIAL_CHOFERES);
  };

  /** Obtener solo choferes activos */
  const activeChoferes = choferes.filter(c => c.active);

  /** Obtener choferes inactivos */
  const inactiveChoferes = choferes.filter(c => !c.active);

  return {
    choferes,
    activeChoferes,
    inactiveChoferes,
    addChofer,
    updateChofer,
    deactivateChofer,
    reactivateChofer,
    removeChofer,
    resetChoferes,
    setChoferes,
  };
}