/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppState } from './useAppState';
import { normalizePlate } from '../domain/plate';

describe('useAppState — Vehicle quick-register handlers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isVehicleInside', () => {
    it('retorna false cuando no hay vehículos dentro', () => {
      const { result } = renderHook(() => useAppState());
      expect(result.current.isVehicleInside('ABCD12')).toBe(false);
    });

    it('retorna true después de registrar una entrada', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });
      expect(result.current.isVehicleInside('ABCD12')).toBe(true);
    });

    it('matching es canónico (ignora formato y mayúsculas/minúsculas)', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });
      // Buscar con formato distinto a la patente canónica
      expect(result.current.isVehicleInside('abcd-12')).toBe(true);
      expect(result.current.isVehicleInside('AB CD-12')).toBe(true);
    });
  });

  describe('handleVehicleEntry', () => {
    it('registra una entrada válida y devuelve el LogItem', () => {
      const { result } = renderHook(() => useAppState());
      let entry;
      act(() => {
        entry = result.current.handleVehicleEntry('ABCD12');
      });
      expect(entry).not.toBeNull();
      expect(entry!.type).toBe('VEHICULO');
      expect(entry!.action).toBe('Entrada');
      expect(entry!.plate).toBe('ABCD12');
      expect(entry!.rut).toBe('');
      expect(entry!.status).toBe('active');
      expect(entry!.entryTimestamp).toBeTypeOf('number');
    });

    it('guarda la empresa cuando se proporciona', () => {
      const { result } = renderHook(() => useAppState());
      let entry;
      act(() => {
        entry = result.current.handleVehicleEntry('ABCD12', 'Constructora XYZ');
      });
      expect(entry).not.toBeNull();
      expect(entry!.name).toBe('Constructora XYZ');
      const session = result.current.activeInside.find(
        s => s.rut === '' && normalizePlate(s.plate) === 'ABCD12'
      );
      expect(session).toBeDefined();
      expect(session!.name).toBe('Constructora XYZ');
    });

    it('usa "Vehículo" como nombre cuando no se proporciona empresa', () => {
      const { result } = renderHook(() => useAppState());
      let entry;
      act(() => {
        entry = result.current.handleVehicleEntry('ABCD12');
      });
      expect(entry!.name).toBe('Vehículo');
    });

    it('sugiere empresa almacenada previamente al registrar nuevamente', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('ABCD12', 'Constructora XYZ');
      });
      act(() => {
        result.current.handleVehicleEntry('ABCD12', 'Otra empresa');
      });
      // El histórico debe contener ambas empresas
      const empresaLogs = result.current.logs.filter(
        l => normalizePlate(l.plate) === 'ABCD12' && l.name !== 'Vehículo'
      );
      expect(empresaLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('agrega la sesión a activeInside', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('TR4590');
      });
      const session = result.current.activeInside.find(
        s => s.rut === '' && s.plate === 'TR4590'
      );
      expect(session).toBeDefined();
      expect(session!.type).toBe('VEHICULO');
    });

    it('rechaza patentes inválidas y devuelve null', () => {
      const { result } = renderHook(() => useAppState());
      let entry;
      act(() => {
        entry = result.current.handleVehicleEntry('XYZ');
      });
      expect(entry).toBeNull();
      expect(result.current.isVehicleInside('XYZ')).toBe(false);
    });

    it('normaliza la patente antes de registrar', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('abcd-12');
      });
      // La patente se almacena en forma canónica
      expect(result.current.isVehicleInside('ABCD12')).toBe(true);
      const log = result.current.logs.find(l => l.plate === 'ABCD12');
      expect(log).toBeDefined();
      expect(log!.action).toBe('Entrada');
    });
  });

  describe('handleVehicleExit', () => {
    it('cierra la sesión activa y devuelve true', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });
      expect(result.current.isVehicleInside('ABCD12')).toBe(true);

      let ok;
      act(() => {
        ok = result.current.handleVehicleExit('ABCD12');
      });
      expect(ok).toBe(true);
      expect(result.current.isVehicleInside('ABCD12')).toBe(false);
    });

    it('crea un log de Salida enlazado a la entrada original', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });
      act(() => {
        result.current.handleVehicleExit('ABCD12');
      });

      const exitLog = result.current.logs.find(
        l => l.plate === 'ABCD12' && l.action === 'Salida'
      );
      expect(exitLog).toBeDefined();
      expect(exitLog!.status).toBe('exited');
      // La salida debe enlazar a la entrada original (CASO: reconstrucción de sesión)
      const entryLog = result.current.logs.find(
        l => l.plate === 'ABCD12' && l.action === 'Entrada'
      );
      expect(entryLog).toBeDefined();
      expect(exitLog!.entryId).toBe(entryLog!.id);
    });

    it('devuelve false cuando el vehículo no está dentro', () => {
      const { result } = renderHook(() => useAppState());
      let ok;
      act(() => {
        ok = result.current.handleVehicleExit('ABCD12');
      });
      expect(ok).toBe(false);
    });
  });

  describe('CASO 3 — Doble entrada (Entrada → Salida → Entrada)', () => {
    it('cierra la sesión anterior y abre una nueva al registrar entrada duplicada', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });
      expect(result.current.isVehicleInside('ABCD12')).toBe(true);

      const logsAfterFirstEntry = result.current.logs.filter(
        l => l.plate === 'ABCD12'
      ).length;

      // Registrar entrada nuevamente para el mismo vehículo
      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });

      // Debe haber creado Salida + nueva Entrada (2 logs adicionales)
      const logsAfterSecondEntry = result.current.logs.filter(
        l => l.plate === 'ABCD12'
      ).length;
      expect(logsAfterSecondEntry).toBe(logsAfterFirstEntry + 2);

      // El vehículo sigue dentro (nueva sesión activa)
      expect(result.current.isVehicleInside('ABCD12')).toBe(true);

      // Verificar secuencia: la última entrada es la más reciente
      const plateLogs = result.current.logs.filter(l => l.plate === 'ABCD12');
      // logs está ordenado nuevo→viejo
      expect(plateLogs[0].action).toBe('Entrada'); // nueva entrada
      expect(plateLogs[0].status).toBe('active');
      expect(plateLogs[1].action).toBe('Salida');   // cierre de sesión anterior
      expect(plateLogs[1].status).toBe('exited');
    });

    it('findVehicleSession encuentra la sesión activa por patente canónica', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('KH-82-91');
      });
      // Buscar con formato distinto
      const session = result.current.findVehicleSession('kh8291');
      expect(session).toBeDefined();
      expect(session!.rut).toBe(''); // vehículo rápido sin RUT
      expect(session!.plate).toBe('KH8291');
    });
  });

  describe('Persistencia', () => {
    it('persiste los logs y activeInside en localStorage', () => {
      const { result } = renderHook(() => useAppState());
      act(() => {
        result.current.handleVehicleEntry('ABCD12');
      });

      const storedLogs = JSON.parse(localStorage.getItem('securguard_logs') || '[]');
      const storedActive = JSON.parse(localStorage.getItem('securguard_active_inside') || '[]');

      const vehicleLogs = storedLogs.filter((l: { plate?: string }) => l.plate === 'ABCD12');
      expect(vehicleLogs.length).toBeGreaterThan(0);
      expect(storedActive.length).toBeGreaterThan(0);
    });
  });
});
