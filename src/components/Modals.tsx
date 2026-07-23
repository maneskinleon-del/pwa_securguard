/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Save, FileSpreadsheet, Upload, Key, User, Flame } from 'lucide-react';
import { LogItem, IncidentReport, AccessType, Persona } from '../types';
import { isValidRut, normalizeRut } from '../utils/rut';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<LogItem, 'id' | 'time' | 'date' | 'status'>) => void;
  initialType?: AccessType;
}

export function RegisterModal({ isOpen, onClose, onSave, initialType = 'VISITANTE' }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<AccessType>(initialType);
  const [unit, setUnit] = useState('');
  const [avatarPreset, setAvatarPreset] = useState('1');

  if (!isOpen) return null;

  // Preset avatar URLs to simulate guard scanning photo from identification ID
  const avatarPresets = [
    { id: '1', name: 'Scanner 1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120' },
    { id: '2', name: 'Scanner 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120' },
    { id: '3', name: 'Scanner 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120' },
    { id: '4', name: 'Ninguno', url: '' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rut || !unit) {
      alert('Por favor complete todos los datos obligatorios (Nombre, RUT, Unidad)');
      return;
    }
    if (!isValidRut(rut)) {
      alert('El RUT ingresado no es válido. Verifica el dígito verificador (ej. 19.453.120-K).');
      return;
    }
    const chosenUrl = avatarPresets.find(p => p.id === avatarPreset)?.url || '';
    onSave({
      name,
      rut: normalizeRut(rut),
      plate: plate.trim() || undefined,
      type,
      action: 'Entrada',
      unit,
      avatar: chosenUrl
    });
    // Reset form
    setName('');
    setRut('');
    setPlate('');
    setUnit('');
    onClose();
  };

  const fillMockData = () => {
    const isTruck = type === 'CAMION' || type === 'ENTREGA';
    if (isTruck) {
      setName('Distribuidor Alimentos S.A.');
      setRut('76.211.530-5');
      setPlate('HL-90-88');
      setUnit('Logística / Cocinas');
      setAvatarPreset('4');
    } else {
      const firstNames = ['Sarah', 'David', 'Andrea', 'Christian', 'Monica', 'Robert'];
      const lastNames = ['Soto', 'Gomez', 'Muñoz', 'Valenzuela', 'Perez', 'Henriquez'];
      const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      setName(randomName);
      
      const randNum = Math.floor(10000000 + Math.random() * 12000000);
      const randVerifier = Math.random() > 0.15 ? String(Math.floor(Math.random() * 10)) : 'K';
      setRut(`${randNum.toLocaleString('de-CH')}-${randVerifier}`);
      setPlate(Math.random() > 0.5 ? `GP-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}` : '');
      setUnit(`Unit ${Math.floor(101 + Math.random() * 250)}`);
      setAvatarPreset(String(Math.floor(1 + Math.random() * 3)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl glass-card bg-[#111a2e] border border-[#2d3449] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2d3449] bg-[#171f33]">
          <div className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-[#dae2fd]">Nuevo Registro de Acceso</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-outline hover:bg-surface-bright transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/20">
            <span className="text-xs text-on-surface-variant font-medium">¿Usar simulador de datos rápidos?</span>
            <button
              type="button"
              onClick={fillMockData}
              className="text-xs px-2.5 py-1 bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/35 transition-colors font-medium cursor-pointer"
            >
              Autocompletar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Nombre Completo *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Sarah Jenkins"
                className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">RUT / Identificación *</label>
              <input
                type="text"
                value={rut}
                onChange={e => setRut(e.target.value)}
                placeholder="Ej. 19.453.120-K"
                className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Clase / Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as AccessType)}
                className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="VISITANTE">VISITANTE</option>
                <option value="CONTRATISTA">CONTRATISTA</option>
                <option value="ENTREGA">ENTREGA</option>
                <option value="CAMION">CAMION</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Patente (Opcional)</label>
              <input
                type="text"
                value={plate}
                onChange={e => setPlate(e.target.value)}
                placeholder="Ej. ABCD-12 o ABC-123"
                className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Destino / Unidad *</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Ej. Unit 115, Dep. de Limpieza"
                className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">Foto de Identificación Electrónica</label>
            <div className="grid grid-cols-4 gap-2">
              {avatarPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatarPreset(preset.id)}
                  className={`relative p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all text-center ${
                    avatarPreset === preset.id
                      ? 'border-primary bg-primary/10 text-[#dae2fd]'
                      : 'border-[#2d3449] bg-[#131b2e] text-outline hover:bg-surface-bright'
                  }`}
                >
                  {preset.url ? (
                    <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-full object-cover border border-[#2d3449]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs">
                      <User className="w-4 h-4 text-outline" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold truncate w-full">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#2d3449]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar Acceso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: Omit<IncidentReport, 'id' | 'time' | 'reporter' | 'gate'>) => void;
}

export function IncidentModal({ isOpen, onClose, onSave }: IncidentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'URGENTE' | 'MODERADO' | 'PREVENTIVO'>('MODERADO');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Por favor complete todos los datos.');
      return;
    }
    onSave({ title, description, category });
    // Reset
    setTitle('');
    setDescription('');
    setCategory('MODERADO');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-2xl glass-card bg-[#111a2e] border border-[#2d3449] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2d3449] bg-[#171f33]">
          <div className="flex items-center gap-2 text-tertiary">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-[#dae2fd]">Reportar Nueva Incidencia</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-outline hover:bg-surface-bright transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Gravedad / Severidad</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PREVENTIVO', 'MODERADO', 'URGENTE'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 text-xs font-bold rounded-lg border uppercase transition-all ${
                    category === cat
                      ? cat === 'URGENTE'
                        ? 'bg-error-container text-error border-error'
                        : cat === 'MODERADO'
                        ? 'bg-tertiary/10 text-tertiary border-tertiary'
                        : 'bg-primary/10 text-primary border-primary'
                      : 'bg-surface-container border-outline-variant/30 text-outline'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Título de Incidencia</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Luminaria acceso peatonal dañada"
              className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Descripción Breve</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle la situación ocurrida, personas involucradas y solución momentánea o estado."
              rows={4}
              className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40 resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#2d3449]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-surface-container-high hover:bg-surface-bright text-on-surface-variant text-sm font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-error hover:bg-[#ffb4ab]/85 text-[#690005] text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              Enviar Reporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (personas: Persona[]) => void;
}

export function JsonImportModal({ isOpen, onClose, onImport }: JsonImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePasteImport = () => {
    try {
      setErrorMsg('');
      const parsed = JSON.parse(jsonText);
      const listToImport = Array.isArray(parsed) ? parsed : [parsed];
      
      // Basic validation
      const verified = listToImport.map((item, index) => {
        if (!item.name || !item.rut) {
          throw new Error(`El elemento en el índice ${index} no tiene datos de Nombre o RUT válidos.`);
        }
        const rut = isValidRut(item.rut) ? normalizeRut(item.rut) : item.rut;
        return {
          id: item.id || `persona-${Date.now()}-${index}`,
          name: item.name,
          rut,
          plate: item.plate,
          type: item.type || 'VISITANTE',
          unit: item.unit || 'Lote Importado',
          avatar: item.avatar || ''
        } as Persona;
      });

      onImport(verified);
      setJsonText('');
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'JSON inválido. Por favor comprueba el formato.');
    }
  };

  const loadSampleJson = () => {
    const sample = [
      {
        name: "Clara Ocampo",
        rut: "16.892.110-3",
        type: "CONTRATISTA",
        action: "Entrada",
        unit: "Mantenimiento Ascensores",
        plate: "GH-89-12"
      },
      {
        name: "Mario Rossi",
        rut: "21.332.901-K",
        type: "VISITANTE",
        action: "Entrada",
        unit: "Depto 1102"
      }
    ];
    setJsonText(JSON.stringify(sample, null, 2));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setErrorMsg('');
        const content = event.target?.result as string;
        setJsonText(content);
      } catch (err) {
        setErrorMsg('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in mr-0">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl glass-card bg-[#111a2e] border border-[#2d3449] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2d3449] bg-[#171f33]">
          <div className="flex items-center gap-2 text-primary">
            <Upload className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-[#dae2fd]">Importar Base de Datos (.JSON)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-outline hover:bg-surface-bright transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Puedes cargar un archivo de datos formateado en JSON o bien pegar el código estructural directamente en el área de texto a continuación.
          </p>

          <div className="flex gap-2">
            <label className="flex-1 border-2 border-dashed border-[#2d3449] hover:border-primary/50 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-[#0e1728] transition-colors">
              <Upload className="w-5 h-5 text-outline" />
              <span className="text-xs font-semibold text-[#dae2fd]">Subir archivo .json</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              type="button"
              onClick={loadSampleJson}
              className="px-3 bg-surface-container hover:bg-surface-container bg-surface-container-high hover:bg-surface-bright text-xs text-primary font-semibold rounded-xl border border-outline-variant/20"
            >
              Cargar Ejemplo
            </button>
          </div>

          <div>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='[{"name": "Ejemplo Oso", "rut": "18.344.200-5", "type": "VISITANTE", "unit": "Unit 201"}]'
              rows={8}
              className="w-full bg-[#0a101f] border border-[#2d3449] rounded-xl p-3 text-xs font-mono text-primary placeholder:text-outline/20 focus:ring-2 focus:ring-primary h-48 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-[#2d3449]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface-variant"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePasteImport}
              className="flex-1 py-2 text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-[#c0c1ff]/85 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Procesar e Importar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShiftHandoverProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (nextGuard: string) => void;
  currentGuard: string;
}

export function ShiftHandoverModal({ isOpen, onClose, onComplete, currentGuard }: ShiftHandoverProps) {
  const [nextGuard, setNextGuard] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextGuard.trim()) {
      alert('Debe definir el nombre del guardia entrante.');
      return;
    }
    onComplete(nextGuard.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-[#111a2e] border border-[#2d3449] p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 text-primary mb-4">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="text-md font-semibold text-[#dae2fd]">Cambio de Turno (Handover)</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-on-surface-variant space-y-1 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10">
            <p><strong>Guardia Saliente:</strong> {currentGuard}</p>
            <p><strong>Hora Handover:</strong> {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Nombre del Guardia Entrante *</label>
            <input
              type="text"
              value={nextGuard}
              onChange={e => setNextGuard(e.target.value)}
              placeholder="Ej. Guard Carlos Fuentes"
              className="w-full bg-[#171f33] border border-[#2d3449] rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline/40"
              required
            />
          </div>

          <p className="text-[11px] text-outline text-center">
            Esta acción dejará registro de cambio en los sucesos e imputará la firma electrónica de entrega.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container transition-colors cursor-pointer"
            >
              Confirmar Handover
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
