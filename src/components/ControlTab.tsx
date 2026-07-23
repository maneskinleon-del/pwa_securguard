/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, Shield, Bell, LogIn, ExternalLink, Download, History } from 'lucide-react';
import { LogItem, ActiveCheckIn, GuardProfile, IncidentReport } from '../types';
import { getLocalDateISO } from '../utils/datetime';
import { openEntryIds, isEntryStillOpen, formatDurationFromMs } from '../utils/report';
import { csvRow, csvBlob } from '../utils/csv';

interface ControlTabProps {
  logs: LogItem[];
  activeInside: ActiveCheckIn[];
  profile: GuardProfile;
  incidents: IncidentReport[];
  onMarkExit: (id: string) => void;
  onOpenRegister: () => void;
  onResetDay?: () => void;
  clock: string;
}

export function ControlTab({ logs, activeInside, profile, incidents, onMarkExit, onOpenRegister, onResetDay, clock }: ControlTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingExits, setLoadingExits] = useState<{ [key: string]: boolean }>({});
  const [recordedExits, setRecordedExits] = useState<{ [key: string]: boolean }>({});
  const [viewMode, setViewMode] = useState<'inside' | 'all'>('all');

  // El reloj ahora viene desde App (un solo setInterval compartido, evita duplicados)

  const handleExitClick = (logId: string) => {
    setLoadingExits(prev => ({ ...prev, [logId]: true }));
    
    // Smooth 400ms delay for high-end professional spinner rendering
    setTimeout(() => {
      onMarkExit(logId);
      setLoadingExits(prev => {
        const updated = { ...prev };
        delete updated[logId];
        return updated;
      });
      // Stay on the current view (e.g. "En Recinto") after marking an exit so the
      // guard can register consecutive exits quickly. The person who just left is
      // removed from activeInside automatically, so the list updates on its own.
    }, 400);
  };

  // Build the list of items from activeInside (mapped as active status) OR deep history logs
  const displayLogs = viewMode === 'inside'
    ? activeInside.map(item => ({
        id: item.id,
        name: item.name || 'Desconocido',
        rut: item.rut || '',
        plate: item.plate,
        type: item.type || 'VISITANTE',
        unit: item.unit || 'N/A',
        action: 'Entrada' as const,
        time: item.entryTime,
        date: item.entryDate,
        avatar: item.avatar,
        status: 'active' as const,
        entryTimestamp: item.entryTimestamp
      }))
    : logs;

  const normalizeText = (text?: string | null) => {
    if (!text || typeof text !== 'string') return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Filter logs via search text (Name, RUT, or Plate)
  const filteredLogs = displayLogs.filter(log => {
    const query = normalizeText(searchQuery);
    const matchesName = normalizeText(log.name).includes(query);
    const matchesRut = normalizeText(log.rut).includes(query);
    const matchesPlate = log.plate ? normalizeText(log.plate).includes(query) : false;
    const matchesUnit = normalizeText(log.unit).includes(query);
    return matchesName || matchesRut || matchesPlate || matchesUnit;
  });

  const getLiveDurationString = (entryTimestamp?: number) => {
    if (!entryTimestamp) return '';
    const diffMs = Date.now() - entryTimestamp;
    if (diffMs <= 0) return 'Reciente';
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) {
      return 'Hace <1m';
    }
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    return h > 0 ? `${h}h ${m}m en recinto` : `${m}m en recinto`;
  };

  const handleExportLogsCSV = () => {
    try {
      // Consolidación de estados: activeInside contiene exactamente a quienes tienen
      // una Entrada sin Salida correspondiente (están físicamente en el recinto).
      const openIds = openEntryIds(activeInside);

      // 1. Set up the structural breakdown of the CSV Output
      const topMeta = [
        `Reporte de Control de Accesos y Seguridad`,
        `Guardia a Cargo:,${profile.name}`,
        `Punto de Control:,${profile.gate}`,
        `Fecha de Exportación:,${new Date().toLocaleString()}`,
        `Personas Actualmente en Recinto:,${activeInside.length}`,
        ``,
        `--- ESTADO ACTUAL DEL RECINTO (Solo personas presentes) ---`
      ].join('\r\n');

      // Sección consolidada: SOLO personas con Entrada sin Salida (físicamente presentes).
      // RFC 4180: csvRow escapa comas/comillas/saltos de línea automáticamente,
      // así que ya no necesitamos .replace(/,/g, '') sobre los nombres.
      const presentHeaders = ['Nombre', 'RUT', 'Tipo', 'Destino / Unidad', 'Patente', 'Hora Entrada', 'Permanencia'];
      const presentRows = activeInside.map(s => [
        s.name ?? '',
        s.rut,
        s.type,
        s.unit ?? '',
        s.plate || 'N/A',
        s.entryTime,
        s.entryTimestamp ? formatDurationFromMs(Date.now() - s.entryTimestamp) : 'N/A'
      ]);
      const presentContent = presentRows.length > 0
        ? [csvRow(presentHeaders), ...presentRows.map(csvRow)].join('\r\n')
        : 'Sin personas en el recinto en este momento.';

      const headers = ['Fecha', 'Hora', 'Nombre', 'RUT', 'Tipo', 'Destino / Unidad', 'Patente', 'Acción', 'Estado / Permanencia'];
      const rows = logs.map(l => [
        l.date,
        l.time,
        l.name ?? '',
        l.rut,
        l.type,
        l.unit ?? '',
        l.plate || 'N/A',
        l.action,
        // Estado fiel por sesión: una Entrada sólo figura "EN RECINTO" si su sesión
        // sigue abierta; si ya tuvo Salida, queda como "Fuera del recinto".
        l.action === 'Salida'
          ? `Permanencia: ${l.duration || 'N/A'}`
          : (isEntryStillOpen(l, openIds) ? 'EN RECINTO' : 'Fuera del recinto')
      ]);

      const accessContent = [
        `--- BITÁCORA COMPLETA DE MOVIMIENTOS ---`,
        csvRow(headers),
        ...rows.map(csvRow)
      ].join('\r\n');

      let incidentContent = '';
      if (incidents.length > 0) {
        const incidentHeaders = ['Fecha', 'Hora', 'Categoría', 'Reportero', 'Ubicación', 'Título', 'Descripción'];
        const incidentRows = incidents.map(i => [
          getLocalDateISO(), // approx date for incident
          i.time,
          i.category,
          i.reporter,
          i.gate,
          i.title,
          i.description
        ]);
        incidentContent = [
          '',
          '--- INFORME DE INCIDENCIAS ---',
          csvRow(incidentHeaders),
          ...incidentRows.map(csvRow)
        ].join('\r\n');
      }

      const csvContent = `${topMeta}\r\n${presentContent}\r\n\r\n${accessContent}${incidentContent}`;
      const blob = csvBlob(csvContent);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SecurGuard-AuditoriaAccesos-${getLocalDateISO()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Liberar memoria: revocar el object URL tras iniciar la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      alert('Error exportando registro de accesos CSV.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Bento Grid Header area */}
      <section className="grid grid-cols-1 gap-4">
        {/* Large Feature Card / Hero Bento Box */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2rem] p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden text-white min-h-[180px] border border-indigo-500/20">
          <div className="relative z-10">
            <span className="text-[9px] uppercase tracking-widest text-[#e0e7ff] font-extrabold bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
              Smart Gate Patrol
            </span>
            <div className="absolute top-0 right-0 font-mono text-xs font-bold tracking-wider px-2.5 py-1 bg-black/35 rounded-xl border border-white/10 flex items-center gap-1.5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              {clock || '19:08:43'}
            </div>
            <h2 className="text-3xl font-black text-white mt-4 tracking-tight leading-tight">SecurGuard AI Active</h2>
            <p className="text-indigo-100/75 text-xs mt-1.5 leading-relaxed max-w-[280px]">
              Portería Acceso Norte is fully logged and secure. All events streamed in real-time.
            </p>
          </div>
          <div className="relative z-10 flex items-center justify-between mt-5">
            <span className="text-[10px] uppercase tracking-widest text-indigo-200/85 font-extrabold flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse"></span>
              Secure & Online
            </span>
            <div className="text-[11px] font-mono text-indigo-100 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 font-bold">
              TOTAL EN SITIO: {activeInside.length}
            </div>
          </div>
          {/* Abstract background blobs like in the Design HTML */}
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -left-20 -bottom-20 w-56 h-56 bg-black/20 rounded-full blur-2xl"></div>
        </div>

        {/* Search Bento Tile */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Search Console</span>
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, RUT, o patente en el historial activo..."
              className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 text-xs focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                Borrar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Recientes Frame Bento box */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 space-y-4 shadow-lg">
        <div className="flex flex-col gap-3.5 border-b border-slate-800/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Actividad & Historial</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLogsCSV}
                className="flex items-center gap-1 bg-[#020617] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-[#818cf8] hover:text-white transition-colors cursor-pointer"
                title="Exportar bitácora en CSV"
              >
                <Download className="w-3 h-3" />
                CSV
              </button>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {filteredLogs.length} Registros
              </span>
            </div>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex bg-[#020617] p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setViewMode('inside')}
              className={`flex-1 text-center py-2 text-[11px] font-bold tracking-wide rounded-lg cursor-pointer transition-all ${
                viewMode === 'inside'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              En Recinto ({activeInside.length})
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 text-center py-2 text-[11px] font-bold tracking-wide rounded-lg cursor-pointer transition-all ${
                viewMode === 'all'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos los Movimientos ({logs.length})
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-[#020617] rounded-xl border border-slate-800 text-slate-500 space-y-2">
            <p className="text-xs font-medium">No hay reportes de accesos activos que coincidan.</p>
            <button
              onClick={onOpenRegister}
              className="text-xs text-primary underline hover:text-[#94a3b8] transition-colors cursor-pointer font-bold"
            >
              Registrar nueva entrada manual
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {filteredLogs.map((log, index) => {
              const isRecording = loadingExits[log.id];
              const isRecorded = recordedExits[log.id];
              const isActive = log.status === 'active';

              return (
                <div
                  key={log.id || `log-${index}`}
                  className={`flex items-center justify-between p-3.5 bg-[#020617] rounded-2xl hover:bg-[#03081e] transition-all border border-slate-800/40 shadow-sm ${
                    !isActive ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      {log.avatar ? (
                        <img
                          src={log.avatar}
                          alt={log.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0f172a] flex items-center justify-center text-slate-400 border border-slate-800 font-bold text-xs uppercase">
                          {(log.name ?? '').charAt(0) || '?'}
                        </div>
                      )}
                      {/* Pulsating state green dot for active inside, or grey check for exited */}
                      {isActive ? (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#020617] animate-pulse"></span>
                      ) : (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-650 rounded-full border-2 border-[#020617]"></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-xs text-white leading-none truncate">{log.name}</h3>
                        <button
                          onClick={() => setSearchQuery(log.rut)}
                          className="text-[#818cf8] hover:text-[#a5b4fc] text-[9px] font-mono tracking-wider bg-[#818cf8]/10 border border-[#818cf8]/20 rounded px-1.5 py-0.2 cursor-pointer transition-colors"
                          title="Filtrar historial completo de esta persona"
                        >
                          {log.rut}
                        </button>
                        {log.plate && (
                          <span className="bg-secondary-container/20 text-secondary text-[8px] font-bold px-1.5 py-0.2 rounded border border-secondary/20 font-mono tracking-wider flex-shrink-0">
                            {log.plate}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1.5 truncate flex-wrap">
                        <span className="font-extrabold uppercase text-slate-500 truncate">{log.unit}</span>
                        <span className="flex-shrink-0 text-slate-700">•</span>
                        <span className="text-[10px] font-mono flex items-center gap-0.5 flex-shrink-0">
                          {log.action === 'Entrada' ? (
                            <>
                              <LogIn className="w-3.5 h-3.5 text-emerald-400" /> Entrada {log.time}
                            </>
                          ) : (
                            <>
                              <LogIn className="w-3.5 h-3.5 text-rose-500/90 rotate-180" /> Salida {log.time}
                            </>
                          )}
                        </span>
                        {/* Display stay duration under condition */}
                        {log.action === 'Salida' && log.duration && (
                          <>
                            <span className="flex-shrink-0 text-slate-700">•</span>
                            <span className="text-[9px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.2 flex-shrink-0">
                              ⏱️ Permanencia: {log.duration}
                            </span>
                          </>
                        )}
                        {isActive && log.entryTimestamp && (
                          <>
                            <span className="flex-shrink-0 text-slate-700">•</span>
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.2 flex-shrink-0">
                              ⏱️ {getLiveDurationString(log.entryTimestamp)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline border border-slate-800/50">
                      {log.type}
                    </span>
                    
                    {isActive ? (
                      <button
                        disabled={isRecording || isRecorded}
                        onClick={() => handleExitClick(log.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none border transition-all flex items-center gap-1.5 ${
                          isRecorded
                            ? 'bg-secondary-container text-white border-secondary'
                            : isRecording
                            ? 'bg-tertiary-container/20 text-tertiary border-tertiary/40'
                            : 'bg-[#4f46e5]/10 hover:bg-[#4f46e5] text-indigo-400 border-[#4f46e5]/20 hover:text-white cursor-pointer active:scale-95'
                        }`}
                      >
                        {isRecorded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            Listo
                          </>
                        ) : isRecording ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Salida
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] text-slate-550 font-extrabold flex items-center gap-0.5 bg-[#0a0f24] rounded-lg border border-slate-850">
                        {log.action === 'Entrada' ? 'INGRESÓ' : 'SALIÓ'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
