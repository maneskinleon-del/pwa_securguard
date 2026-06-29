/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Bell, Plus, ShieldAlert, CheckCircle2, Siren, UserPlus, Settings2, History, Users, MonitorSmartphone } from 'lucide-react';
import { LogItem, IncidentReport, GuardProfile, AccessType, Persona, ActiveCheckIn } from './types';
import { INITIAL_LOGS, INITIAL_INCIDENTS, DEFAULT_GUARD } from './data/mockData';
import { ControlTab } from './components/ControlTab';
import { LogsTab } from './components/LogsTab';
import { PersonasTab } from './components/PersonasTab';
import { SettingsTab } from './components/SettingsTab';
import { RegisterModal, IncidentModal, JsonImportModal, ShiftHandoverModal } from './components/Modals';
import { getLocalDateISO } from './utils/datetime';

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

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'control' | 'logs' | 'personas' | 'settings'>('control');

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
      avatar: l.avatar
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
      { id: 'per-6', name: 'Mario Rossi', rut: '21.332.901-K', type: 'VISITANTE', unit: 'Depto 1102' }
    ];
  });

  const [emergencyLock, setEmergencyLock] = useState<boolean>(() => {
    const saved = localStorage.getItem('securguard_emergencylock');
    return saved ? JSON.parse(saved) === 'true' : false;
  });

  // Modal display toggles
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerPreset, setRegisterPreset] = useState<AccessType>('VISITANTE');
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // System alerts & clock counter
  const [clock, setClock] = useState('');
  const [bellShake, setBellShake] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'alert' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('securguard_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('securguard_active_inside', JSON.stringify(activeInside));
  }, [activeInside]);

  useEffect(() => {
    localStorage.setItem('securguard_incidents', JSON.stringify(incidents));
    if (incidents.length > 0) {
      setBellShake(true);
      const timer = setTimeout(() => setBellShake(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('securguard_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('securguard_personas', JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem('securguard_emergencylock', String(emergencyLock));
  }, [emergencyLock]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('es-CL', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // System Core actions
  const handleMarkExit = (idOrRut: string, customExitTime?: string) => {
    const timestamp = customExitTime || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const datestamp = getLocalDateISO();

    // Find in activeInside (RUT comparison is null-safe via normRut)
    const target = normRut(idOrRut);
    const session = activeInside.find(s => s.id === idOrRut || (target !== '' && normRut(s.rut) === target));
    if (!session) {
      console.error('[handleMarkExit] No se encontró sesión activa para el identificador:', idOrRut, '· activeInside actual:', activeInside);
      setToast({ message: 'No se pudo registrar la salida: la sesión ya no está activa.', type: 'alert' });
      return;
    }

    // Calculate stay duration safely
    const diffMs = session.entryTimestamp ? (Date.now() - session.entryTimestamp) : 0;
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
      avatar: session.avatar || ''
    };

    setLogs(prev => [exitLog, ...prev]);

    // 2. Remove from activeInside
    setActiveInside(prev => prev.filter(s => s.id !== session.id));

    // Toast feedback notification to let users know the checkout succeeded
    setToast({
      message: `Salida registrada con éxito para ${sessionName}`,
      type: 'success'
    });
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
      status: 'active'
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
      avatar: newEntry.avatar
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
      gate: profile.gate
    };
    setLogs(prevLogs => [
      {
        id: `inc-log-${generateId()}`,
        name: `🚨 Alerta: ${newIncident.title}`,
        rut: 'SISTEMA',
        type: 'VISITANTE',
        action: 'Entrada',
        time: timestamp,
        date: getLocalDateISO(),
        unit: 'Módulo de Emergencias',
        status: 'active'
      },
      ...prevLogs
    ]);
    setIncidents(prev => [report, ...prev]);
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
      status: 'active'
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
      avatar: persona.avatar || ''
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

    setToast({
      message: 'Registros del día reiniciados. La base de personas se mantuvo intacta.',
      type: 'success'
    });
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

    setToast({
      message: 'Base de datos y bitácora de fábrica reestablecidas completamente.',
      type: 'alert'
    });
  };

  const handleResolveIncident = (id: string) => {
    setIncidents(prev => prev.filter(inc => inc.id !== id));
  };

  const handleCompleteHandover = (nextGuardName: string) => {
    setProfile(prev => ({
      ...prev,
      name: nextGuardName
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
      status: 'exited'
    };
    setLogs(prev => [handoverLog, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-28 selection:bg-indigo-500/30 select-none font-sans overflow-x-hidden w-full">
      
      {/* Emergency Lockdown high visibility flash banner */}
      {emergencyLock && (
        <div className="bg-red-650 text-white py-2.5 px-4 text-center text-xs font-black tracking-widest flex items-center justify-center gap-2 animate-pulse sticky top-0 z-50 w-full overflow-hidden">
          <Siren className="w-5 h-5 flex-shrink-0 animate-spin text-white" />
          <span className="truncate">⚠️ ALERTA: SISTEMA SECUREGUARD EN ESTADO BLOQUEO DE EMERGENCIA ⚠️</span>
        </div>
      )}

      {/* Top Header Bar precisely styled like the mockups */}
      <header className="sticky top-0 w-full z-40 bg-[#020617]/90 backdrop-blur-md shadow-md flex justify-between items-center px-4 sm:px-6 h-16 sm:h-20 border-b border-slate-900">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#818cf8] flex-shrink-0" />
          <div className="flex flex-col">
            <h1 className="font-bold text-sm sm:text-base text-white tracking-tight leading-none uppercase">SecurGuard AI</h1>
            <span className="text-[8px] sm:text-[9px] text-[#818cf8] uppercase tracking-widest font-black">Gate Patrol</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Dynamic clock output inside header display */}
          <div className="font-mono text-[10px] sm:text-xs text-[#818cf8] tracking-widest bg-indigo-950/20 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-xl border border-slate-800 font-bold whitespace-nowrap">
            {clock || '19:08:43'}
          </div>

          <button
            onClick={() => setCurrentTab('settings')}
            className={`p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all relative flex-shrink-0 ${
              bellShake ? 'animate-bounce' : 'active:scale-95'
            }`}
          >
            <Bell className="w-4 h-4 text-slate-300" />
            {incidents.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container screen wrapper */}
      <main className="max-w-xl mx-auto px-4 pt-5">
        {currentTab === 'control' && (
          <ControlTab
            logs={logs}
            activeInside={activeInside}
            profile={profile}
            incidents={incidents}
            onMarkExit={handleMarkExit}
            onResetDay={handleResetDay}
            onOpenRegister={() => {
              setRegisterPreset('VISITANTE');
              setIsRegisterOpen(true);
            }}
          />
        )}

        {currentTab === 'logs' && (
          <LogsTab
            logs={logs}
            activeInside={activeInside}
            personas={personas}
            onQuickCheckIn={handleQuickCheckIn}
            onMarkExit={handleMarkExit}
            onOpenRegister={(preset) => {
              setRegisterPreset(preset || 'VISITANTE');
              setIsRegisterOpen(true);
            }}
            onOpenIncident={() => setIsIncidentOpen(true)}
            onOpenHandover={() => setIsHandoverOpen(true)}
            emergencyLock={emergencyLock}
            onToggleLock={() => setEmergencyLock(!emergencyLock)}
          />
        )}

        {currentTab === 'personas' && (
          <PersonasTab
            logs={logs}
            activeInside={activeInside}
            personas={personas}
            profile={profile}
            incidents={incidents}
            onOpenImport={() => setIsImportOpen(true)}
            onResetDay={handleResetDay}
            onDeleteAll={handleDeleteAll}
            onImportPersonas={handleImportedPersonas}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            profile={profile}
            onChangeProfile={setProfile}
            incidents={incidents}
            onResolveIncident={handleResolveIncident}
            onResetDay={handleResetDay}
            onDeleteAll={handleDeleteAll}
          />
        )}
      </main>

      {/* Bottom Floating Access check-in button (+) as shown in mockups */}
      <button
        onClick={() => {
          setRegisterPreset('VISITANTE');
          setIsRegisterOpen(true);
        }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-tr from-indigo-500 via-purple-600 to-[#818cf8] text-white rounded-full shadow-2xl flex items-center justify-center hover:opacity-95 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer border border-indigo-400/30"
        title="Registrar Acceso Rápido"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Primary Navigation bottom navbar matching screen designs */}
      <nav className="fixed bottom-0 left-0 w-full z-40 bg-[#020617]/95 backdrop-blur-md shadow-[0px_-4px_30px_rgba(0,0,0,0.8)] rounded-t-[2rem] border-t border-slate-900 overflow-hidden pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center px-4 sm:px-8 py-2.5 sm:py-3">
          
          {/* Tab 1: Control bar */}
          <button
            onClick={() => setCurrentTab('control')}
            className={`flex items-center justify-center p-2.5 sm:p-3 transition-all duration-250 cursor-pointer rounded-2xl ${
              currentTab === 'control'
                ? 'bg-slate-900 text-indigo-400 font-extrabold border border-indigo-950 scale-105 shadow-lg shadow-indigo-600/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            } flex-1 max-w-[64px] h-12`}
            title="Control de Accesos"
          >
            <MonitorSmartphone className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Tab 2: Logs list */}
          <button
            onClick={() => setCurrentTab('logs')}
            className={`flex items-center justify-center p-2.5 sm:p-3 transition-all duration-250 cursor-pointer rounded-2xl ${
              currentTab === 'logs'
                ? 'bg-slate-900 text-indigo-400 font-extrabold border border-indigo-950 scale-105 shadow-lg shadow-indigo-600/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            } flex-1 max-w-[64px] h-12`}
            title="Consola de Pre-registros y Entradas"
          >
            <History className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Tab 3: Personas database */}
          <button
            onClick={() => setCurrentTab('personas')}
            className={`flex items-center justify-center p-2.5 sm:p-3 transition-all duration-250 cursor-pointer rounded-2xl ${
              currentTab === 'personas'
                ? 'bg-slate-900 text-indigo-400 font-extrabold border border-indigo-950 scale-105 shadow-lg shadow-indigo-600/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            } flex-1 max-w-[64px] h-12`}
            title="Estadísticas de Personal y CCTV"
          >
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Tab 4: Settings config */}
          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex items-center justify-center p-2.5 sm:p-3 transition-all duration-250 cursor-pointer rounded-2xl ${
              currentTab === 'settings'
                ? 'bg-slate-900 text-indigo-400 font-extrabold border border-indigo-950 scale-105 shadow-lg shadow-indigo-600/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            } flex-1 max-w-[64px] h-12`}
            title="Configuraciones de Consola"
          >
            <Settings2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

        </div>
      </nav>

      {/* Dialogue and Modals handlers */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSave={handleSaveRegister}
        initialType={registerPreset}
      />

      <IncidentModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        onSave={handleSaveIncident}
      />

      <JsonImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportedPersonas}
      />

      <ShiftHandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        onComplete={handleCompleteHandover}
        currentGuard={profile.name}
      />

      {/* Floating System-wide Overlay Toast Notification */}
      {toast && (
        <div
          id="system-toast"
          className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs font-bold font-sans transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-[#0f172a]/95 text-emerald-400 border-emerald-500/30'
              : toast.type === 'alert'
              ? 'bg-[#0f172a]/95 text-rose-400 border-rose-500/30'
              : 'bg-[#0f172a]/95 text-[#818cf8] border-indigo-500/30'
          }`}
        >
          {toast.type === 'success' ? (
            <span className="text-emerald-400 text-sm">✓</span>
          ) : toast.type === 'alert' ? (
            <span className="text-rose-400 text-sm">⚠️</span>
          ) : (
            <span className="text-indigo-400 text-sm">ℹ</span>
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
