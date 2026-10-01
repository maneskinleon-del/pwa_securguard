/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * QuickVehicleRegister
 *
 * UI de alta velocidad para registrar entradas/salidas de vehículos en una
 * obra. Identificado por patente (canónica) y empresa opcional. Diseñado para
 * uso móvil por un guardia que necesita registrar muchas patentes
 * consecutivamente.
 *
 * Flujo ideal:
 *   1. Escribe PATENTE (auto-uppercase, auto-normalización)
 *   2. Opcionalmente escribe EMPRESA
 *   3. Toca ENTRADA o SALIDA
 *   4. El formulario se limpia y vuelve a enfocarse en PATENTE
 *
 * Reutiliza la infraestructura de useAppState (logs, activeInside, persistencia)
 * y el dominio de patentes (src/domain/plate.ts).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Car, LogIn, LogOut, CheckCircle2, AlertCircle, Trash2, Building } from 'lucide-react';
import { ActiveCheckIn, LogItem } from '../types';
import { normalizePlate, isValidPlate, formatPlateForDisplay } from '../domain/plate';

export type VehicleToastType = 'success' | 'alert' | 'info';

export interface QuickVehicleRegisterProps {
  activeInside: ActiveCheckIn[];
  logs: LogItem[];
  isVehicleInside: (plate: string) => boolean;
  onVehicleEntry: (plate: string, company?: string) => LogItem | null;
  onVehicleExit: (plate: string, company?: string) => boolean;
  onShowToast: (toast: { message: string; type: VehicleToastType }) => void;
}

export function QuickVehicleRegister({
  activeInside,
  logs,
  isVehicleInside,
  onVehicleEntry,
  onVehicleExit,
  onShowToast,
}: QuickVehicleRegisterProps) {
  const [plateInput, setPlateInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const plateRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  // Auto-focus en PATENTE al montar
  useEffect(() => {
    plateRef.current?.focus();
  }, []);

  // Normaliza la patente en tiempo real
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlateInput(e.target.value.toUpperCase());
  };

  // Sugerir empresa si ya existe historial para esta patente
  const suggestCompany = (plate: string): string => {
    const canonical = normalizePlate(plate);
    if (canonical === '') return '';
    const match = logs.find(l => normalizePlate(l.plate) === canonical && l.name && l.name !== 'Vehículo');
    return match ? match.name : '';
  };

  // Cuando la patente cambia, sugerir empresa si no se ha ingresado una
  const handlePlateBlur = () => {
    const normalized = normalizePlate(plateInput);
    if (normalized && !companyInput) {
      const suggestion = suggestCompany(normalized);
      if (suggestion) setCompanyInput(suggestion);
    }
  };

  // Enfocar y limpiar para el registro consecutivo
  const resetField = () => {
    setPlateInput('');
    setCompanyInput('');
    setTimeout(() => plateRef.current?.focus(), 50);
  };

  const canonicalInput = normalizePlate(plateInput);
  const inputValid = isValidPlate(canonicalInput);
  const currentPlate = inputValid ? canonicalInput : '';
  const inside = currentPlate ? isVehicleInside(currentPlate) : false;

  // Último movimiento de una patente en el historial (logs: nuevo→viejo)
  const getLastMovement = (plate: string): LogItem | null => {
    const canonical = normalizePlate(plate);
    if (canonical === '') return null;
    return logs.find(l => normalizePlate(l.plate) === canonical) || null;
  };

  const lastMovement = currentPlate ? getLastMovement(currentPlate) : null;
  const activeSession = currentPlate && inside
    ? activeInside.find(s => s.rut === '' && normalizePlate(s.plate) === currentPlate)
    : undefined;

  const handleEntry = () => {
    const canonical = normalizePlate(plateInput);
    if (!isValidPlate(canonical)) {
      onShowToast({ message: 'Patente inválida. Usa formato chileno (ej. ABCD12, ABC123, AB1234).', type: 'alert' });
      return;
    }
    const wasInside = isVehicleInside(canonical);
    const company = companyInput.trim() || undefined;

    setIsValidating(true);
    const result = onVehicleEntry(canonical, company);
    setIsValidating(false);

    if (result) {
      if (wasInside) {
        onShowToast({
          message: formatPlateForDisplay(canonical) + ': Salida ' + result.time + ' → Nueva Entrada',
          type: 'success',
        });
      } else {
        const companyStr = company ? ' · ' + company : '';
        onShowToast({
          message: 'Entrada ' + formatPlateForDisplay(canonical) + companyStr + ' · ' + result.time,
          type: 'success',
        });
      }
    } else {
      onShowToast({ message: 'No se pudo registrar la entrada.', type: 'alert' });
    }
    resetField();
  };

  const handleExit = () => {
    const canonical = normalizePlate(plateInput);
    if (!isValidPlate(canonical)) {
      onShowToast({ message: 'Patente inválida. Usa formato chileno (ej. ABCD12).', type: 'alert' });
      return;
    }
    if (!isVehicleInside(canonical)) {
      onShowToast({ message: formatPlateForDisplay(canonical) + ' no está dentro. Registra ENTRADA primero.', type: 'alert' });
      resetField();
      return;
    }

    setIsValidating(true);
    const ok = onVehicleExit(canonical, companyInput.trim() || undefined);
    setIsValidating(false);

    if (ok) {
      const timeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      onShowToast({ message: 'Salida ' + formatPlateForDisplay(canonical) + ' · ' + timeStr, type: 'success' });
    } else {
      onShowToast({ message: 'No se pudo registrar la salida.', type: 'alert' });
    }
    resetField();
  };

  const clearPlate = () => {
    setPlateInput('');
    setCompanyInput('');
    plateRef.current?.focus();
  };

  return (
    <section className="space-y-4">
      {/* Header */ }
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0">
          <Car className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Control de Acceso Vehicular</h2>
          <p className="text-[10px] text-slate-500 font-medium">Patente → Empresa → Entrada / Salida</p>
        </div>
      </div>

      {/* PATENTE input (primary) */ }
      <div className="relative">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
          PATENTE
        </label>
        <input
          ref={plateRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={8}
          value={plateInput}
          onChange={handlePlateChange}
          onBlur={handlePlateBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (plateInput.trim()) {
                if (companyInput) companyRef.current?.focus();
                else handleEntry();
              }
            }
          }}
          placeholder="ABCD12"
          className={`w-full bg-[#020617] border rounded-2xl px-4 py-3.5 text-lg font-mono font-bold text-white text-center placeholder:text-slate-600/40 transition-all focus:outline-none focus:ring-2 ${
            plateInput.trim() === ''
              ? 'border-slate-700 focus:border-slate-600 focus:ring-slate-600/30'
              : inputValid
              ? 'border-emerald-500/40 focus:border-emerald-400 focus:ring-emerald-400/30'
              : 'border-rose-500/40 focus:border-rose-400 focus:ring-rose-400/30'
          }`}
        />
        {plateInput.trim() !== '' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1 top-[26px]">
            {inputValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <button
              type="button"
              onClick={clearPlate}
              className="p-0.5 rounded hover:bg-slate-700/40 text-slate-500 hover:text-slate-300 transition-colors"
              title="Limpiar"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* EMPRESA input (optional) */ }
      <div className="relative">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1">
          <Building className="w-3 h-3" />
          EMPRESA <span className="text-slate-600 font-normal">(opcional)</span>
        </label>
        <input
          ref={companyRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={companyInput}
          onChange={(e) => setCompanyInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (plateInput.trim()) handleEntry();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setCompanyInput('');
              plateRef.current?.focus();
            }
          }}
          placeholder="Constructora XYZ"
          className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600/40 transition-all focus:outline-none focus:ring-2 focus:border-indigo-400 focus:ring-indigo-400/30"
        />
        {companyInput && (
          <button
            onClick={() => { setCompanyInput(''); plateRef.current?.focus(); }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            title="Limpiar empresa"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ENTRADA / SALIDA buttons */ }
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleEntry}
          disabled={isValidating || !inputValid}
          className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-extrabold uppercase tracking-wider transition-all disabled:opacity-40 ${
            inputValid
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <LogIn className="w-5 h-5" />
          ENTRADA
        </button>
        <button
          onClick={handleExit}
          disabled={isValidating || !inputValid}
          className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-extrabold uppercase tracking-wider transition-all disabled:opacity-40 ${
            inputValid && inside
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-95'
              : inputValid
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <LogOut className="w-5 h-5" />
          SALIDA
        </button>
      </div>

      {/* Estado actual de la patente */ }
      {currentPlate && (
        <div className={`flex items-center justify-between p-3 rounded-2xl text-xs font-mono transition-all ${
          inside
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-slate-900/40 border border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${inside ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
            <span>{formatPlateForDisplay(currentPlate)} · {inside ? 'DENTRO' : 'FUERA'}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {lastMovement && (
              <span className="text-[9px] text-slate-500">
                Último: {lastMovement.action} {lastMovement.time}
              </span>
            )}
            {activeSession && (
              <span className="text-[9px] text-slate-500 truncate max-w-[120px]">
                {activeSession.name !== 'Vehículo' ? activeSession.name : '—'}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
