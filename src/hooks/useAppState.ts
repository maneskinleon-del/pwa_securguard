/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { LogItem, IncidentReport, GuardProfile, AccessType, Persona, ActiveCheckIn } from '../types';
import { INITIAL_LOGS, INITIAL_INCIDENTS, DEFAULT_GUARD } from '../data/mockData';
import { getLocalDateISO } from '../utils/datetime';

// --- Defensive rehydration helpers (Incidencia A) ---
// Normalize a RUT for safe comparison without throwing on null/undefined.
const normRut = (v?: string | null): string => (v ?? '').trim().toUpperCase();

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object';
const safeStr = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const safeOptStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const safeNum = (v: unknown): number | undefined => (typeof v === 'number' && isFinite(v) ? v : undefined);

// Read an array from localStorage, returning null on missing/invalid/non-array JSON.
const readArray = (key: string): any[] | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    console.error(`[rehydrate] No se pudo parsear ${key}; usando valores por defecto.`, e);
    return null;
  }
};

const sanitizeLogs = (arr: any[]): LogItem[] =>
  arr.filter(isObj).map((l, i) => ({
    id: safeStr(l.id) || `rehydrated-log-${i}`,
    name: safeStr(l.name),
    rut: safeStr(l.rut),
    plate: safeOptStr(l.plate),
    type: safeStr(l.type, 'VISITANTE') as AccessType,
    action: l.action === 'Salida' ? 'Salida' : 'Entrada',
    time: safeStr(l.time),
    date: safeStr(l.date),
    unit: safeStr(l.unit),
    avatar: safeOptStr(l.avatar),
    status: l.status === 'exited' ? 'exited' : 'active',
    duration: safeOptStr(l.duration),
    entryId: safeOptStr(l.entryId),
    entryTimestamp: safeNum(l.entryTimestamp),
  }));

const sanitizeActive = (arr: any[]): ActiveCheckIn[] =>
  arr.filter(isObj).map((s, i) => ({
    id: safeStr(s.id) || `rehydrated-active-${i}`,
    name: safeStr(s.name),
    rut: safeStr(s.rut),
    plate: safeOptStr(s.plate),
    type: safeStr(s.type, 'VISITANTE') as AccessType,
    unit: safeStr(s.unit),
    entryTime: safeStr(s.entryTime),
    entryDate: safeStr(s.entryDate),
    entryTimestamp: safeNum(s.entryTimestamp) ?? 0,
    avatar: safeOptStr(s.avatar),
  }));

const sanitizePersonas = (arr: any[]): Persona[] =>
  arr
    .filter(isObj)
    .filter(p => safeStr(p.name).trim() !== '' || safeStr(p.rut).trim() !== '')
    .map((p, i) => ({
      id: safeStr(p.id) || `rehydrated-persona-${i}`,
      name: safeStr(p.name),
      rut: safeStr(p.rut),
      plate: safeOptStr(p.plate),
      type: safeStr(p.type, 'VISITANTE') as AccessType,
      unit: safeStr(p.unit),
      avatar: safeOptStr(p.avatar),
    }));

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export interface AppState {
  // Data
  logs: LogItem[];
  activeInside: ActiveCheckIn[];
  incidents: IncidentReport[];
  profile: GuardProfile;
  personas: Persona[];
  setProfile: Dispatch<SetStateAction<GuardProfile>>;
  // Actions
  handleMarkExit: (idOrRut: string, customExitTime?: string) => void;
  handleSaveRegister: (newEntry: Omit<LogItem, 'id' | 'time' | 'date' | 'status'>) => void;
  handleSaveIncident: (newIncident: Omit<IncidentReport, 'id' | 'time' | 'reporter' | 'gate'>) => void;
  handleImportedPersonas: (incoming: Persona[]) => void;
  handleQuickCheckIn: (persona: Persona) => void;
  handleResetDay: () => void;
  handleExportBackup: () => void;
  handleDeleteAll: () => void;
  handleResolveIncident: (id: string) => void;
  handleCompleteHandover: (nextGuardName: string) => void;
}

/**
 * Centraliza el estado global de SecurGuard y su lógica de negocio.
 *
 * Extraído de App.tsx para reducir el "god component": App ahora solo se
 * encarga de navegación, modales y presentación. La interfaz de props de los
 * tabs no cambia, así que este refactor es transparente para ellos.
 */
export const useAppState = (): AppState => {
  // Persistence State
  const [logs, setLogs] = useState<LogItem[]>(() => {
    const arr = readArray('securguard_logs');
    return arr ? sanitizeLogs(arr) : INITIAL_LOGS;
  });

  const [activeInside, setActiveInside] = useState<ActiveCheckIn[]>(() => {
    const arr = readArray('securguard_active_inside');
    if (arr) return sanitizeActive(arr);
    // Fallback: build initial active states from INITIAL_LOGS to keep demo complete
    return INITIAL_LOGS.filter(l => l.status === 'active').map(l => ({
      id: l.id,
      name: l.name,
      rut: l.rut,
      plate: l.plate,
      type: l.type,
      unit: l.unit,
      entryTime: l.time,
      entryDate: l.date,
      entryTimestamp: Date.now() - 3600000 * 1.5, // simulate 1.5 hours ago entry
      avatar: l.avatar,
    }));
  });

  const [incidents, setIncidents] = useState<IncidentReport[]>(() => {
    const saved = localStorage.getItem('securguard_incidents');
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });

  const [profile, setProfile] = useState<GuardProfile>(() => {
    const saved = localStorage.getItem('securguard_profile');
    return saved ? JSON.parse(saved) : DEFAULT_GUARD;
  });

  const [personas, setPersonas] = useState<Persona[]>(() => {
    const arr = readArray('securguard_personas');
    if (arr) return sanitizePersonas(arr);
    return [
      { id: 'per-1', name: 'Sarah Jenkins', rut: '19.453.120-K', type: 'VISITANTE', unit: 'Unit 115', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120' },
      { id: 'per-2', name: 'James Wilson', rut: '15.823.149-6', type: 'CONTRATISTA', unit: 'Service/Cleaning', plate: 'ABC-123', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120' },
      { id: 'per-3', name: 'Jonathan Wick', rut: '12.443.512-4', type: 'CONTRATISTA', unit: 'Security Contractor', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120' },
      { id: 'per-4', name: 'Elena Vance', rut: '20.198.543-2', type: 'VISITANTE', unit: 'Unit 204' },
      { id: 'per-5', name: 'Clara Ocampo', rut: '16.892.110-3', type: 'CONTRATISTA', unit: 'Mantenimiento Ascensores', plate: 'GH-89-12' },
      { id: 'per-6', name: 'Mario Rossi', rut: '21.332.901-K', type: 'VISITANTE', unit: 'Depto 1102' },
    ];
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('securguard_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('securguard_active_inside', JSON.stringify(activeInside));
  }, [activeInside]);

  useEffect(() => {
    localStorage.setItem('securguard_incidents', JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('securguard_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('securguard_personas', JSON.stringify(personas));
  }, [personas]);

  // System Core actions
  const handleMarkExit = (idOrRut: string, customExitTime?: string) => {
    const timestamp = customExitTime || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    // Find in activeInside (RUT comparison is null-safe via normRut)
    const target = normRut(idOrRut);
    const session = activeInside.find(s => s.id === idOrRut || (target !== '' && normRut(s.rut) === target));
    if (!session) {
      console.error('[handleMarkExit] No se encontró sesión activa para el identificador:', idOrRut, '· activeInside actual:', activeInside);
      return;
    }

    // When an exit time is supplied manually, the date of the exit should follow
    // the entry's own date (the guard is correcting the same-day shift), not today.
    const datestamp = customExitTime ? (session.entryDate || getLocalDateISO()) : getLocalDateISO();

    // Resolve the real exit timestamp so duration is accurate even when a custom
    // exit time is provided (otherwise it would wrongly use Date.now()).
    let exitTs = Date.now();
    if (customExitTime && session.entryDate) {
      const parsed = new Date(`${session.entryDate}T${customExitTime}`);
      if (!Number.isNaN(parsed.getTime())) exitTs = parsed.getTime();
    }

    // Calculate stay duration safely
    const diffMs = session.entryTimestamp ? (exitTs - session.entryTimestamp) : 0;
    let durationStr = 'N/A';
    if (diffMs > 0) {
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) {
        durationStr = `${Math.floor(diffMs / 1000)}s`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
    } else {
      durationStr = '45m'; // sensible default
    }

    // Defensive construction of independent permanent Salida log event
    const sessionName = session.name || 'Desconocido';
    const exitLog: LogItem = {
      id: `log-exit-${generateId()}`,
      name: sessionName,
      rut: session.rut || '',
      plate: session.plate,
      type: session.type || 'VISITANTE',
      unit: session.unit || 'N/A',
      action: 'Salida',
      time: timestamp,
      date: datestamp,
      status: 'exited',
      duration: durationStr,
      avatar: session.avatar || '',
    };

    setLogs(prev => [exitLog, ...prev]);

    // 2. Remove from activeInside
    setActiveInside(prev => prev.filter(s => s.id !== session.id));
  };

  const handleSaveRegister = (newEntry: Omit<LogItem, 'id' | 'time' | 'date' | 'status'>) => {
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const datestamp = getLocalDateISO();

    // Check if they are already inside
    const alreadyInside = activeInside.find(s => normRut(s.rut) !== '' && normRut(s.rut) === normRut(newEntry.rut));
    if (alreadyInside) {
      handleMarkExit(alreadyInside.id);
    }

    const entryId = `log-${generateId()}`;

    // 1. Create immutable Entrada log record
    const entryLog: LogItem = {
      ...newEntry,
      id: entryId,
      time: timestamp,
      date: datestamp,
      action: 'Entrada',
      status: 'active',
    };

    setLogs(prev => [entryLog, ...prev]);

    // 2. Add to activeInside
    const newActive: ActiveCheckIn = {
      id: entryId,
      name: newEntry.name,
      rut: newEntry.rut,
      plate: newEntry.plate,
      type: newEntry.type,
      unit: newEntry.unit,
      entryTime: timestamp,
      entryDate: datestamp,
      entryTimestamp: Date.now(),
      avatar: newEntry.avatar,
    };

    setActiveInside(prev => [newActive, ...prev]);
  };

  const handleSaveIncident = (newIncident: Omit<IncidentReport, 'id' | 'time' | 'reporter' | 'gate'>) => {
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const report: IncidentReport = {
      ...newIncident,
      id: `inc-${generateId()}`,
      time: timestamp,
      reporter: profile.name,
      gate: profile.gate,
    };
    setIncidents(prev => [report, ...prev]);

    // Notificación del sistema si el operador habilitó radiodifusión de alertas
    if (profile.notifications && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(`SecurGuard · ${newIncident.category}`, {
            body: `${newIncident.title}\n${newIncident.description}`,
          });
        }
      } catch (_) { /* notificaciones no disponibles en este contexto */ }
    }
  };

  const handleImportedPersonas = (incoming: Persona[]) => {
    setPersonas(prev => {
      const map = new Map<string, Persona>();
      prev.forEach(p => {
        if (p.rut) map.set(p.rut.trim().toUpperCase(), p);
      });
      incoming.forEach(p => {
        if (p.rut) map.set(p.rut.trim().toUpperCase(), p);
      });
      return Array.from(map.values());
    });
  };

  const handleQuickCheckIn = (persona: Persona) => {
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const datestamp = getLocalDateISO();

    // Check if they are already inside
    const alreadyInside = activeInside.find(s => normRut(s.rut) !== '' && normRut(s.rut) === normRut(persona.rut));
    if (alreadyInside) {
      handleMarkExit(alreadyInside.id);
    }

    const entryId = `log-${generateId()}`;

    // 1. Create immutable Entrada log record
    const entryLog: LogItem = {
      id: entryId,
      name: persona.name,
      rut: persona.rut,
      plate: persona.plate,
      type: persona.type,
      action: 'Entrada',
      time: timestamp,
      date: datestamp,
      unit: persona.unit,
      avatar: persona.avatar || '',
      status: 'active',
    };

    setLogs(prev => [entryLog, ...prev]);

    // 2. Add to activeInside
    const newActive: ActiveCheckIn = {
      id: entryId,
      name: persona.name,
      rut: persona.rut,
      plate: persona.plate,
      type: persona.type,
      unit: persona.unit,
      entryTime: timestamp,
      entryDate: datestamp,
      entryTimestamp: Date.now(),
      avatar: persona.avatar || '',
    };

    setActiveInside(prev => [newActive, ...prev]);

    // Give visual haptic confirmation: play audio synthesize in console if sound alerts enabled
    if (profile.soundAlerts && 'speechSynthesis' in window) {
      try {
        const sentence = `Entrada registrada para ${persona.name}`;
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // ignore speech synth sandbox roadblocks
      }
    }
  };

  const handleResetDay = () => {
    setLogs([]);
    setIncidents([]);
    setActiveInside([]);
    // Do NOT clear setPersonas()! This preserves master base
    localStorage.removeItem('securguard_logs');
    localStorage.removeItem('securguard_incidents');
    localStorage.removeItem('securguard_active_inside');
  };

  const handleExportBackup = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      logs,
      activeInside,
      incidents,
      personas,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SecurGuard-Respaldo-${getLocalDateISO()}.json`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleDeleteAll = () => {
    setLogs([]);
    setIncidents([]);
    setPersonas([]);
    setActiveInside([]);
    localStorage.removeItem('securguard_logs');
    localStorage.removeItem('securguard_incidents');
    localStorage.removeItem('securguard_personas');
    localStorage.removeItem('securguard_active_inside');
  };

  const handleResolveIncident = (id: string) => {
    setIncidents(prev => prev.filter(inc => inc.id !== id));
  };

  const handleCompleteHandover = (nextGuardName: string) => {
    setProfile(prev => ({
      ...prev,
      name: nextGuardName,
    }));

    // Register shift change log
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const handoverLog: LogItem = {
      id: `handover-${generateId()}`,
      name: `🔄 Cambio Guardia: ${nextGuardName}`,
      rut: 'CONSOLA',
      type: 'CONTRATISTA',
      action: 'Entrada',
      time: timestamp,
      date: getLocalDateISO(),
      unit: 'Entrega Turno Bitácora',
      status: 'exited',
    };
    setLogs(prev => [handoverLog, ...prev]);
  };

  return {
    logs,
    activeInside,
    incidents,
    profile,
    personas,
    setProfile,
    handleMarkExit,
    handleSaveRegister,
    handleSaveIncident,
    handleImportedPersonas,
    handleQuickCheckIn,
    handleResetDay,
    handleExportBackup,
    handleDeleteAll,
    handleResolveIncident,
    handleCompleteHandover,
  };
};
