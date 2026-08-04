/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gestión de choferes (Variante B): listado con búsqueda, edición inline,
 * eliminación con confirmación, toggle activo/inactivo y alta de nuevos.
 * Vive en la pestaña de Personas (tercera hoja) para dar utilidad real.
 */

import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Plus, X, Check, Pencil, Trash2, ToggleLeft, ToggleRight, Truck, RotateCcw } from 'lucide-react';
import { Chofer } from '../types';
import { isValidRut, normalizeRut } from '../utils/rut';

interface ChoferesSectionProps {
  choferes: Chofer[];
  onAddChofer: (chofer: Omit<Chofer, 'id'>) => Chofer;
  onUpdateChofer: (id: string, changes: Partial<Chofer>) => void;
  onDeactivateChofer: (id: string) => void;
  onReactivateChofer: (id: string) => void;
  onRemoveChofer: (id: string) => void;
  onResetChoferes: () => void;
}

export function ChoferesSection({ choferes, onAddChofer, onUpdateChofer, onDeactivateChofer, onReactivateChofer, onRemoveChofer, onResetChoferes }: ChoferesSectionProps) {
  const [search, setSearch] = useState('');
  const [showInactivos, setShowInactivos] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // Nuevo chofer form
  const [newName, setNewName] = useState('');
  const [newRut, setNewRut] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newUnit, setNewUnit] = useState('');

  // Edición inline: id del chofer en edición + campos temporales
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRut, setEditRut] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // Confirmación de eliminación
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const normalizeText = (text?: string | null) => {
    if (!text || typeof text !== 'string') return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const activeCount = choferes.filter(c => c.active).length;
  const inactiveCount = choferes.length - activeCount;

  const filtered = useMemo(() => {
    // Si hay búsqueda, buscar sobre TODOS los choferes (incluidos inactivos)
    if (search.trim()) {
      const q = normalizeText(search);
      return choferes.filter(c =>
        normalizeText(c.name).includes(q) ||
        normalizeText(c.rut).includes(q) ||
        normalizeText(c.plate).includes(q) ||
        normalizeText(c.unit).includes(q)
      );
    }
    return showInactivos ? choferes : choferes.filter(c => c.active);
  }, [choferes, search, showInactivos]);

  const resetNewForm = () => {
    setNewName('');
    setNewRut('');
    setNewPlate('');
    setNewUnit('');
    setShowNewForm(false);
  };

  const handleAdd = () => {
    if (!newName.trim() || !newRut.trim()) {
      alert('Debe ingresar al menos Nombre y RUT.');
      return;
    }
    if (!isValidRut(newRut.trim())) {
      alert('El RUT no es válido. Verifica el dígito verificador (ej. 19.453.120-K).');
      return;
    }
    onAddChofer({
      name: newName.trim(),
      rut: normalizeRut(newRut.trim()),
      plate: newPlate.trim().toUpperCase(),
      unit: newUnit.trim() || 'Aparcadero',
      active: true,
    });
    resetNewForm();
  };

  const startEdit = (chofer: Chofer) => {
    setEditingId(chofer.id);
    setEditName(chofer.name);
    setEditRut(chofer.rut);
    setEditPlate(chofer.plate || '');
    setEditUnit(chofer.unit || 'Aparcadero');
    setDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim() || !editRut.trim()) {
      alert('Nombre y RUT son obligatorios.');
      return;
    }
    if (!isValidRut(editRut.trim())) {
      alert('El RUT no es válido. Verifica el dígito verificador (ej. 19.453.120-K).');
      return;
    }
    onUpdateChofer(id, {
      name: editName.trim(),
      rut: normalizeRut(editRut.trim()),
      plate: editPlate.trim().toUpperCase(),
      unit: editUnit.trim() || 'Aparcadero',
    });
    setEditingId(null);
  };

  return (
    <section className="bg-[#0f172a] border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1e293b]/30 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#818cf8]" />
          <h3 className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
            Gestión de Choferes
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
            {activeCount} activos
          </span>
          {inactiveCount > 0 && (
            <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full">
              {inactiveCount} inactivos
            </span>
          )}
        </div>
      </div>

      {/* Buscador + toggle inactivos + nuevo */}
      <div className="p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT, patente o unidad..."
            className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowInactivos(!showInactivos)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
              showInactivos
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-900'
            }`}
          >
            {showInactivos ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {showInactivos ? 'Ocultar inactivos' : `Mostrar inactivos (${inactiveCount})`}
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Agregar chofer
          </button>
        </div>

        {/* Restablecer lista inicial (si los datos quedaron viejos o incompletos) */}
        {confirmReset ? (
          <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/25 rounded-lg">
            <span className="text-[10px] text-amber-300 font-bold">¿Restablecer lista inicial? Se reemplazarán los datos actuales.</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => { onResetChoferes(); setConfirmReset(false); }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Sí, restablecer
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[9px] font-bold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-[9px] text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-amber-500/70" />
            Restablecer lista inicial de choferes
          </button>
        )}
      </div>

      {/* Formulario nuevo chofer */}
      {showNewForm && (
        <div className="mx-3 mb-3 p-3 bg-[#020617] border border-indigo-500/20 rounded-xl space-y-2">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Nuevo Chofer</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nombre completo *"
              className="col-span-2 w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <input
              type="text"
              value={newRut}
              onChange={e => setNewRut(e.target.value)}
              placeholder="RUT (ej. 12.345.678-9) *"
              className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <input
              type="text"
              value={newPlate}
              onChange={e => setNewPlate(e.target.value)}
              placeholder="Patente (ej. HL-90-88)"
              className="w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 uppercase"
            />
            <input
              type="text"
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              placeholder="Unidad / Destino"
              className="col-span-2 w-full bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Guardar Chofer
            </button>
            <button
              onClick={resetNewForm}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="divide-y divide-slate-800/60 max-h-[380px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {search ? 'Sin resultados para la búsqueda.' : showInactivos ? 'No hay choferes registrados.' : 'No hay choferes activos.'}
          </div>
        ) : (
          filtered.map(chofer => {
            const isEditing = editingId === chofer.id;
            const isDeleting = deleteId === chofer.id;

            if (isEditing) {
              return (
                <div key={chofer.id} className="p-3 bg-indigo-500/5 space-y-2">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Editando chofer</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Nombre completo *"
                      className="col-span-2 w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                    <input
                      type="text"
                      value={editRut}
                      onChange={e => setEditRut(e.target.value)}
                      placeholder="RUT *"
                      className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                    <input
                      type="text"
                      value={editPlate}
                      onChange={e => setEditPlate(e.target.value)}
                      placeholder="Patente"
                      className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 uppercase"
                    />
                    <input
                      type="text"
                      value={editUnit}
                      onChange={e => setEditUnit(e.target.value)}
                      placeholder="Unidad / Destino"
                      className="col-span-2 w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(chofer.id)}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={chofer.id} className={`px-3 py-2.5 flex items-center gap-2 ${isDeleting ? 'bg-rose-500/5' : 'hover:bg-slate-900/40'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-200 truncate">{chofer.name}</p>
                  <p className="text-[9px] text-slate-500 font-mono truncate">
                    {chofer.rut} {chofer.plate ? `• ${chofer.plate}` : ''} {chofer.unit ? `• ${chofer.unit}` : ''}
                  </p>
                </div>

                {isDeleting ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] text-rose-400 font-bold mr-0.5">¿Eliminar?</span>
                    <button
                      onClick={() => { onRemoveChofer(chofer.id); setDeleteId(null); }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="px-2 py-1 bg-slate-800 text-slate-300 text-[9px] font-bold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {!chofer.active && (
                      <span className="text-[7px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">INACTIVO</span>
                    )}
                    <button
                      onClick={() => startEdit(chofer)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Editar chofer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setDeleteId(chofer.id); setEditingId(null); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar chofer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => chofer.active ? onDeactivateChofer(chofer.id) : onReactivateChofer(chofer.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${chofer.active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                      title={chofer.active ? 'Desactivar chofer (ya no trabaja)' : 'Reactivar chofer'}
                    >
                      {chofer.active ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
