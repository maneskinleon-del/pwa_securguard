/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Download, AlertTriangle, RefreshCw, Lock, Unlock, LogIn, LogOut, Truck, Sparkles, User, CheckCircle, Database, Users } from 'lucide-react';
import { LogItem, AccessType, Persona, ActiveCheckIn } from '../types';
import { getLocalDateISO } from '../utils/datetime';

interface LogsTabProps {
  logs: LogItem[];
  activeInside: ActiveCheckIn[];
  personas: Persona[];
  onQuickCheckIn: (persona: Persona) => void;
  onMarkExit: (id: string) => void;
  onOpenRegister: (presetType?: AccessType) => void;
  onOpenIncident: () => void;
  onOpenHandover: () => void;
  emergencyLock: boolean;
  onToggleLock: () => void;
}

export function LogsTab({
  logs,
  activeInside = [],
  personas,
  onQuickCheckIn,
  onMarkExit,
  onOpenRegister,
  onOpenIncident,
  onOpenHandover,
  emergencyLock,
  onToggleLock
}: LogsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'Todos' | 'Contratista' | 'Visita' | 'Camion'>('Todos');

  // Text normalizing helper to ignore accents
  const normalizeText = (text?: string | null) => {
    if (!text || typeof text !== 'string') return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Null-safe RUT normalizer for comparisons
  const normRut = (v?: string | null) => (v ?? '').trim().toUpperCase();

  // Filter personas based on search text and horizontal filters
  const filteredPersonas = personas.filter(p => {
    const query = normalizeText(searchQuery);
    const matchesSearch =
      normalizeText(p.name).includes(query) ||
      normalizeText(p.rut).includes(query) ||
      (p.plate && normalizeText(p.plate).includes(query)) ||
      normalizeText(p.unit).includes(query);

    if (!matchesSearch) return false;

    // Category pill check
    if (selectedFilter === 'Todos') return true;
    if (selectedFilter === 'Contratista') return p.type === 'CONTRATISTA';
    if (selectedFilter === 'Visita') return p.type === 'VISITANTE';
    if (selectedFilter === 'Camion') return p.type === 'CAMION' || p.type === 'ENTREGA';

    return true;
  });

  // Client-side CSV Exporter for pre-registered list showing status, date & time
  const handleExportCSV = () => {
    try {
      const headers = ['Fecha', 'Hora', 'Estado / Movimiento', 'Nombre', 'RUT', 'Tipo', 'Destino / Unidad', 'Patente'];
      const rows = personas
        .filter(p => logs.some(l => normRut(l.rut) !== '' && normRut(l.rut) === normRut(p.rut)))
        .map(p => {
        // Find latest log for this persona to show their movement status and date
        const matchedLogs = logs.filter(l => normRut(l.rut) !== '' && normRut(l.rut) === normRut(p.rut));
        const lastLog = matchedLogs.length > 0 ? matchedLogs[0] : null; // logs array is stored new-to-old
        const isCurrentlyInside = activeInside.some(s => normRut(s.rut) !== '' && normRut(s.rut) === normRut(p.rut));

        return [
          lastLog ? lastLog.date : 'N/A',
          lastLog ? lastLog.time : 'N/A',
          isCurrentlyInside ? 'EN RECINTO (Entrada)' : 'FUERA (Salida)',
          (p.name ?? '').replace(/,/g, ''),
          p.rut,
          p.type,
          (p.unit ?? '').replace(/,/g, ''),
          p.plate || 'N/A'
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SecurGuard-PreRegistrosYEstados-${getLocalDateISO()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Error exportando directorio pre-registro CSV.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bento Tile */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 space-y-4 shadow-lg">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pre-registros</span>
          <Users className="w-4 h-4 text-[#818cf8]" />
        </div>
        
        {/* Search Input Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 text-xs focus:outline-none"
            placeholder="Buscar pre-registrados por nombre, RUT, o patente..."
          />
        </div>

        {/* Horizontal pill filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedFilter('Todos')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-colors cursor-pointer ${
              selectedFilter === 'Todos'
                ? 'bg-primary text-white border border-primary/20 shadow-md shadow-indigo-500/10'
                : 'bg-[#020617] text-slate-400 border border-slate-800/80 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedFilter('Contratista')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-colors cursor-pointer ${
              selectedFilter === 'Contratista'
                ? 'bg-primary text-white border border-primary/20 shadow-md shadow-indigo-500/10'
                : 'bg-[#020617] text-slate-400 border border-slate-800/80 hover:text-white'
            }`}
          >
            Contratistas
          </button>
          <button
            onClick={() => setSelectedFilter('Visita')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-colors cursor-pointer ${
              selectedFilter === 'Visita'
                ? 'bg-primary text-white border border-primary/20 shadow-md shadow-indigo-500/10'
                : 'bg-[#020617] text-slate-400 border border-slate-800/80 hover:text-white'
            }`}
          >
            Visitas
          </button>
          <button
            onClick={() => setSelectedFilter('Camion')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-colors cursor-pointer ${
              selectedFilter === 'Camion'
                ? 'bg-primary text-white border border-primary/20 shadow-md shadow-indigo-500/10'
                : 'bg-[#020617] text-slate-400 border border-slate-800/80 hover:text-white'
            }`}
          >
            Camiones
          </button>
        </div>
      </section>

      {/* Directory Bento card - replacing older Activity Stream */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lista Pre-registro (.JSON)</h2>
          </div>
          <div className="flex gap-2">
            <span className="bg-[#4f46e5]/10 border border-[#4f46e5]/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-indigo-400 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
              DIRECTORIO activo
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-[#020617] border border-slate-800 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-[#818cf8] hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>
        </div>

        {/* Directory Persona list */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {filteredPersonas.length === 0 ? (
            <div className="p-8 text-center bg-[#020617] rounded-xl border border-slate-800 text-slate-500 text-xs">
              No hay personas pre-registradas que coincidan con la búsqueda.
            </div>
          ) : (
            filteredPersonas.map((persona, index) => {
              // Check if persona is currently on-site using the activeInside state
              const activeIn = activeInside.find(
                s => normRut(s.rut) !== '' && normRut(s.rut) === normRut(persona.rut)
              );
              const isInside = !!activeIn;

              return (
                <div
                  key={persona.id || `persona-${index}`}
                  className="flex items-center justify-between p-3 bg-[#020617] hover:bg-slate-900 transition-all rounded-xl border border-slate-800/40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      {persona.avatar ? (
                        <img
                          src={persona.avatar}
                          alt={persona.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0f172a] flex items-center justify-center border border-slate-800 text-slate-400">
                          {persona.type === 'CAMION' || persona.type === 'ENTREGA' ? (
                            <Truck className="w-4 h-4 text-slate-400" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                      {isInside && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#020617] animate-pulse"></span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-white leading-tight">
                        {persona.name}
                        {persona.plate && (
                          <span className="ml-1.5 px-1 py-0.2 rounded bg-secondary-container/20 text-secondary text-[8px] font-bold border border-secondary/20">
                            {persona.plate}
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-medium text-slate-500">{persona.rut}</span> • 
                        <span className="text-indigo-400/90">{persona.unit}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 text-[8px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline border border-slate-800/40">
                      {persona.type}
                    </span>
                    
                    {isInside ? (
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                          EN RECINTO
                        </span>
                        <button
                          onClick={() => activeIn && onMarkExit(activeIn.id)}
                          className="bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white px-2 py-1 flex items-center justify-center rounded-md text-[10px] font-semibold transition-all border border-rose-500/20 cursor-pointer text-center w-full"
                        >
                          Salida
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onQuickCheckIn(persona)}
                        className="bg-indigo-600/10 hover:bg-indigo-600 text-[#818cf8] hover:text-white px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border border-indigo-500/20 cursor-pointer flex items-center gap-1 active:scale-95"
                      >
                        <LogIn className="w-3 h-3" />
                        Entrada
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Quick Access Area Bento block */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-1.5 border-b border-slate-800/50 pb-3">
          <Database className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Access console</h2>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {/* Action 1: Registro Visita */}
          <button
            onClick={() => onOpenRegister('VISITANTE')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-violet-800 text-white rounded-2xl transition-all hover:scale-102 active:scale-95 shadow-md min-h-[96px] group text-center cursor-pointer border border-indigo-500/20"
          >
            <Truck className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-white/90" />
            <span className="font-extrabold text-[11px] tracking-wide uppercase text-white">Registro Visita</span>
          </button>

          {/* Action 2: Alerta Incidencia */}
          <button
            onClick={onOpenIncident}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#d97706] to-[#b45309] text-white rounded-2xl transition-all hover:scale-102 active:scale-95 shadow-md min-h-[96px] group text-center cursor-pointer border border-[#d97706]/30"
          >
            <AlertTriangle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-white" />
            <span className="font-extrabold text-[11px] tracking-wide uppercase text-white">Nueva Incidencia</span>
          </button>

          {/* Action 3: Cambio de Turno */}
          <button
            onClick={onOpenHandover}
            className="flex flex-col items-center justify-center p-4 bg-[#020617] text-white hover:bg-[#090f1e] rounded-2xl transition-all hover:scale-102 active:scale-95 shadow-md min-h-[96px] group text-center cursor-pointer border border-slate-800"
          >
            <RefreshCw className="w-5 h-5 mb-1 group-hover:rotate-180 transition-transform duration-550 text-slate-400" />
            <span className="font-extrabold text-[11px] tracking-wide uppercase text-slate-300">Cambio Turno</span>
          </button>

          {/* Action 4: Bloqueo de Emergencia */}
          <button
            onClick={onToggleLock}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all hover:scale-102 active:scale-95 shadow-md min-h-[96px] group text-center cursor-pointer border ${
              emergencyLock
                ? 'bg-error text-white border-error animate-pulse'
                : 'bg-error-container/20 text-[#f87171] hover:bg-error-container/30 border-error/20'
            }`}
          >
            {emergencyLock ? (
              <Lock className="w-5 h-5 mb-1 text-white" />
            ) : (
              <Unlock className="w-5 h-5 mb-1 text-[#f87171]" />
            )}
            <span className="font-extrabold text-[11px] tracking-wide uppercase">
              {emergencyLock ? 'Desbloquear' : 'Bloqueo Gral'}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
