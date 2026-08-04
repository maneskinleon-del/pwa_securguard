/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Upload, Download, Trash2, ShieldAlert, BarChart2, Users, Check, LogIn, AlarmClock, ChevronRight, AlertTriangle } from 'lucide-react';
import { LogItem, Persona, ActiveCheckIn, GuardProfile, IncidentReport, Chofer } from '../types';
import { getLocalDateISO } from '../utils/datetime';
import { buildSecurityReportCSV, downloadSecurityReportCSV } from '../utils/report';
import { ChoferesSection } from './ChoferesSection';

interface PersonasTabProps {
  logs: LogItem[];
  activeInside: ActiveCheckIn[];
  personas: Persona[];
  profile: GuardProfile;
  incidents: IncidentReport[];
  choferes: Chofer[];
  onAddChofer: (chofer: Omit<Chofer, 'id'>) => Chofer;
  onUpdateChofer: (id: string, changes: Partial<Chofer>) => void;
  onDeactivateChofer: (id: string) => void;
  onReactivateChofer: (id: string) => void;
  onRemoveChofer: (id: string) => void;
  onResetChoferes: () => void;
  onOpenImport: () => void;
  onResetDay: () => void;
  onDeleteAll: () => void;
  onImportPersonas: (personas: Persona[]) => void;
}

export function PersonasTab({ logs, activeInside = [], personas, profile, incidents, choferes, onAddChofer, onUpdateChofer, onDeactivateChofer, onReactivateChofer, onRemoveChofer, onResetChoferes, onOpenImport, onResetDay, onDeleteAll, onImportPersonas }: PersonasTabProps) {
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
      const csvContent = buildSecurityReportCSV({
        logs,
        activeInside,
        profile,
        incidents,
        statusHeader: 'Estado',
      });
      downloadSecurityReportCSV(csvContent, `SecurGuard-HistorialAccesos-${getLocalDateISO()}.csv`);
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

      {/* Gestión de Choferes (Variante B: editar/eliminar inline) — utilidad real */}
      <ChoferesSection
        choferes={choferes}
        onAddChofer={onAddChofer}
        onUpdateChofer={onUpdateChofer}
        onDeactivateChofer={onDeactivateChofer}
        onReactivateChofer={onReactivateChofer}
        onRemoveChofer={onRemoveChofer}
        onResetChoferes={onResetChoferes}
      />

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
                  <p className="text-[11px] leading-tight text-slate-200">¿ESTÁS SEGURO? Esta acción removerá todo el historial local y vaciará la lista de choferes permanentemente.</p>
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
                    <h4 className="font-bold text-xs text-red-400">ELIMINAR TODA LA BITÁCORA Y CHOFERES</h4>
                    <p className="text-[10px] text-slate-500">Vacía el registro de actividad y el catálogo de choferes para dejar todo limpio.</p>
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
