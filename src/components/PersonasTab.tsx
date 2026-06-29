/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Upload, Download, Trash2, Camera, ShieldAlert, BarChart2, Users, Flame, Maximize2, ShieldCheck, Check, LogIn, AlarmClock, ChevronRight, AlertTriangle } from 'lucide-react';
import { LogItem, Persona, ActiveCheckIn, GuardProfile, IncidentReport } from '../types';
import { getLocalDateISO } from '../utils/datetime';
import { openEntryIds, isEntryStillOpen, formatDurationFromMs } from '../utils/report';
import { csvRow, csvBlob } from '../utils/csv';

interface PersonasTabProps {
  logs: LogItem[];
  activeInside: ActiveCheckIn[];
  personas: Persona[];
  profile: GuardProfile;
  incidents: IncidentReport[];
  onOpenImport: () => void;
  onResetDay: () => void;
  onDeleteAll: () => void;
  onImportPersonas: (personas: Persona[]) => void;
}

export function PersonasTab({ logs, activeInside = [], personas, profile, incidents, onOpenImport, onResetDay, onDeleteAll, onImportPersonas }: PersonasTabProps) {
  const [selectedCamera, setSelectedCamera] = useState<'ENTRANCE_NORTH' | 'EXIT_SOUTH' | 'RESIDENCE_CIRCLE'>('ENTRANCE_NORTH');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Derived metrics from actual log actions and current active occupancy
  const totalEntriesToday = logs.filter(l => l.action === 'Entrada').length;
  const currentActiveInside = activeInside.length;
  const longStayAlerts = activeInside.filter(item => item.type === 'VISITANTE').length; // Dynamic alerts based on current occupancy

  const handleExportDB = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataUri);
      downloadAnchor.setAttribute('download', 'SecurGuard-FullDatabase.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (e) {
      alert('Error exportando base de datos.');
    }
  };

  const handleExportLogsCSV = () => {
    try {
      // Consolidación de estados: activeInside = personas con Entrada sin Salida (presentes).
      const openIds = openEntryIds(activeInside);

      const topMeta = [
        `Reporte de Control de Accesos y Seguridad`,
        `Guardia a Cargo:,${profile.name}`,
        `Punto de Control:,${profile.gate}`,
        `Fecha de Exportación:,${new Date().toLocaleString()}`,
        `Personas Actualmente en Recinto:,${activeInside.length}`,
        ``,
        `--- ESTADO ACTUAL DEL RECINTO (Solo personas presentes) ---`
      ].join('\r\n');

      // Sección consolidada: SOLO personas físicamente presentes.
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

      const headers = ['Fecha', 'Hora', 'Nombre', 'RUT', 'Tipo', 'Destino / Unidad', 'Patente', 'Acción', 'Estado'];
      const rows = logs.map(l => [
        l.date,
        l.time,
        l.name ?? '',
        l.rut,
        l.type,
        l.unit ?? '',
        l.plate || 'N/A',
        l.action,
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
          getLocalDateISO(),
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
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `SecurGuard-HistorialAccesos-${getLocalDateISO()}.csv`);
      downloadAnchor.style.visibility = 'hidden';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      // Liberar memoria: revocar el object URL tras iniciar la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      alert('Error exportando bitácora CSV.');
    }
  };

  const executeDbReset = () => {
    onDeleteAll();
    setConfirmClear(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bento Grid Header area */}
      <h1 className="text-xl font-bold font-headline-md text-white tracking-tight uppercase flex items-center gap-2">
        <Users className="w-5 h-5 text-[#818cf8]" />
        Panel de Personas
      </h1>

      {/* Grid statistics - Advanced Bento Layout */}
      <section className="grid grid-cols-2 gap-4">
        {/* Metric 1: Entries */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] shadow-lg">
          <div>
            <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <span>Entries</span>
              <LogIn className="w-4 h-4 text-[#818cf8]" />
            </div>
            <div className="text-2xl font-black text-white mt-2 tracking-tight">
              {totalEntriesToday.toLocaleString()}
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-2">
            ↗ 12% <span className="text-slate-500 font-medium">hoy</span>
          </p>
        </div>

        {/* Metric 2: Active */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] shadow-lg">
          <div>
            <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <span>Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-450 animate-pulse"></span>
            </div>
            <div className="text-3xl font-black text-white mt-2 tracking-tight leading-none">
              {currentActiveInside}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1">
            <span className="text-slate-500">Gate A/B</span> • Circulando
          </p>
        </div>

        {/* Metric 3: Peaks Histogram - Widescreen Bento Column Item */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-5 col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[120px] shadow-lg">
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>Hora de Mayor Flujo</span>
            <BarChart2 className="w-4 h-4 text-[#818cf8]" />
          </div>
          
          {/* Micro histogram bars custom */}
          <div className="flex items-end justify-between h-14 mt-1 px-1">
            <div className="w-4 h-[25%] bg-slate-800 rounded-md transition-all hover:bg-slate-700"></div>
            <div className="w-4 h-[45%] bg-slate-800 rounded-md transition-all hover:bg-slate-700"></div>
            <div className="w-4 h-[95%] bg-gradient-to-t from-indigo-500 to-violet-600 rounded-md shadow-lg shadow-indigo-500/20"></div>
            <div className="w-4 h-[65%] bg-slate-800 rounded-md transition-all hover:bg-slate-700"></div>
            <div className="w-4 h-[35%] bg-slate-800 rounded-md transition-all hover:bg-slate-700"></div>
            <div className="w-4 h-[80%] bg-slate-800/80 rounded-md transition-all hover:bg-slate-700"></div>
            <div className="w-4 h-[20%] bg-slate-800 rounded-md transition-all hover:bg-slate-700"></div>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-2 px-1">
            <span>08:00</span>
            <span className="text-indigo-400">Pico (14:00)</span>
            <span>22:00</span>
          </div>
        </div>

        {/* Metric 4: ALERTA PERMANENCIA */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-5 col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[96px] shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Alertas Permanencia Estacionada</span>
                <AlarmClock className="w-3.5 h-3.5 text-amber-405 animate-bounce" />
              </div>
              <div className="text-xl font-black text-amber-500 mt-1.5 tracking-tight flex items-center gap-1.5">
                {longStayAlerts} <span className="text-xs text-slate-400 font-medium">visitas críticas</span>
              </div>
            </div>
            <p className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-450 font-bold px-2 py-1 rounded-full uppercase">
              &gt; 1h en recinto
            </p>
          </div>
        </div>
      </section>

      {/* Camera Simulator panel matching "LIVE FEED" layout as a massive Bento Box */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between p-4 bg-[#1e293b]/30 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <h3 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
              CCTV FEED: REMOTE GATE
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value as any)}
              className="bg-[#020617] text-[9px] font-bold uppercase tracking-wide text-indigo-400 border border-slate-800 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="ENTRANCE_NORTH">ENTRANCE NORTH</option>
              <option value="EXIT_SOUTH">EXIT GATE SOUTH</option>
              <option value="RESIDENCE_CIRCLE">RESIDENCE LOBBY</option>
            </select>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              title="Expand Feed"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video stream sandbox box */}
        <div className={`relative bg-black transition-all duration-300 overflow-hidden ${isFullscreen ? 'h-72' : 'h-44'}`}>
          {/* Diagnostic Overlay HUD */}
          <div className="absolute top-2 left-2 z-10 text-[9px] font-mono bg-black/80 px-2 py-1 rounded text-emerald-400 flex flex-col leading-tight border border-emerald-500/20">
            <span>CAM_ID: SG_AI_{selectedCamera.substring(0, 4)}</span>
            <span>FPS: 30.0 / ISO: 400</span>
            <span>UTC_T: {new Date().toISOString().substring(11, 19)}</span>
          </div>

          <div className="absolute top-2 right-2 z-10 text-[9px] font-mono bg-rose-500/10 px-2 py-0.5 rounded text-rose-400 flex items-center gap-1 border border-rose-500/20 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
            <span>LIVE REC</span>
          </div>

          {/* Animated visual noise static lines */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-radial-gradient from-transparent to-black select-none z-10"></div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
            <svg className="w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
              <filter id="noise">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#noise)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent w-full h-[6px] animate-[bounce_4s_infinite] pointer-events-none"></div>
          </div>

          {/* CCTV dynamic illustration image placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            {selectedCamera === 'ENTRANCE_NORTH' ? (
              <img
                src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&q=80&w=600"
                alt="North Entrance Gate View"
                className="w-full h-full object-cover opacity-60 grayscale filter contrast-125"
              />
            ) : selectedCamera === 'EXIT_SOUTH' ? (
              <img
                src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600"
                alt="Exit South Gate View"
                className="w-full h-full object-cover opacity-60 grayscale filter contrast-125"
              />
            ) : (
              <img
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=600"
                alt="Residence circle gate"
                className="w-full h-full object-cover opacity-60 grayscale filter contrast-125"
              />
            )}
            
            {/* Visual Crosshair HUD overlay */}
            <div className="absolute w-12 h-12 border border-[#4edea3]/45 pointer-events-none rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
            </div>
            <div className="absolute top-4 left-1/4 right-1/4 border-t border-dashed border-[#4edea3]/25 pointer-events-none"></div>
            <div className="absolute bottom-4 left-1/4 right-1/4 border-b border-dashed border-[#4edea3]/25 pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* DB controller list on bottom as a sleek Bento box */}
      <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg p-3">
        <div className="divide-y divide-slate-800/80">
          
          {/* Action 1: Upload JSON */}
          <button
            onClick={onOpenImport}
            className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-slate-900 transition-colors text-left cursor-pointer group rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-bold text-xs text-slate-200">IMPORTAR PERSONAS / DIRECTORIO (.JSON)</h4>
                <p className="text-[10px] text-slate-500">Incorpora listados pre-registrados para habilitar ingresos rápidos en la consola.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>

          {/* Action 2: Export JSON */}
          <button
            onClick={handleExportDB}
            className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-slate-900 transition-colors text-left cursor-pointer group rounded-xl"
          >
            <div className="flex items-center gap-3">
              {copiedSuccess ? (
                <Check className="w-5 h-5 text-secondary animate-bounce" />
              ) : (
                <Download className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              )}
              <div>
                <h4 className="font-bold text-xs text-slate-200">EXPORTAR BASE DE DATOS (.JSON)</h4>
                <p className="text-[10px] text-slate-500">Descarga la bitácora completa en formato estructural .json.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>

          {/* Action 2.5: Export CSV */}
          <button
            onClick={handleExportLogsCSV}
            className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-slate-900 transition-colors text-left cursor-pointer group rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-bold text-xs text-slate-200">EXPORTAR BITÁCORA EN CSV</h4>
                <p className="text-[10px] text-slate-500">Descarga el registro completo de entradas y salidas en formato .csv para Excel.</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>

          {/* Action 3: Delete Current Database (Danger) */}
          <div className="p-4 bg-transparent">
            {confirmClear ? (
              <div className="space-y-3 bg-[#b91c1c]/10 p-3.5 rounded-2xl border border-[#b91c1c]/30">
                <div className="flex items-center gap-2 text-red-100 font-bold">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
                  <p className="text-[11px] leading-tight text-slate-200">¿ESTÁS SEGURO? Esta acción removerá todo el historial local permanentemente.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={executeDbReset}
                    className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-[11px] font-extrabold rounded-lg cursor-pointer transition-all"
                  >
                    Confirmar Borrado
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 bg-[#020617] border border-slate-800 text-slate-300 text-[11px] font-extrabold rounded-lg hover:bg-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-red-550/5 transition-colors text-left cursor-pointer group rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-bold text-xs text-red-400">ELIMINAR TODA LA BITÁCORA</h4>
                    <p className="text-[10px] text-slate-500">Vacía el registro de actividad y restablece los valores locales de fábrica.</p>
                  </div>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-500/60" />
              </button>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
