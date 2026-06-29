/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogItem, IncidentReport, GuardProfile } from '../types';

export const INITIAL_LOGS: LogItem[] = [
  {
    id: 'log-1',
    name: 'Sarah Jenkins',
    rut: '19.453.120-K',
    type: 'VISITANTE',
    action: 'Entrada',
    time: '18:14',
    date: '2026-06-02',
    unit: 'Unit 115',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    status: 'active'
  },
  {
    id: 'log-2',
    name: 'James Wilson',
    rut: '15.823.149-6',
    plate: 'ABC-123',
    type: 'CONTRATISTA',
    action: 'Entrada',
    time: '18:45',
    date: '2026-06-02',
    unit: 'Service/Cleaning',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    status: 'active'
  },
  {
    id: 'log-3',
    name: 'Jonathan Wick',
    rut: '12.443.512-4',
    type: 'CONTRATISTA',
    action: 'Entrada',
    time: '06:30 AM',
    date: '2026-06-02',
    unit: 'Security Contractor',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    status: 'active'
  },
  {
    id: 'log-4',
    name: 'Elena Vance',
    rut: '20.198.543-2',
    type: 'VISITANTE',
    action: 'Salida',
    time: '05:45 AM',
    date: '2026-06-02',
    unit: 'Unit 204',
    avatar: '', // Fallback fallback person icon
    status: 'exited'
  },
  {
    id: 'log-5',
    name: 'Logistica Express',
    rut: '76.843.190-5',
    plate: 'KH-82-91',
    type: 'ENTREGA',
    action: 'Entrada',
    time: '05:15 AM',
    date: '2026-06-02',
    unit: 'Delivering Supplies',
    status: 'active'
  },
  {
    id: 'log-6',
    name: 'Carlos Mendoza',
    rut: '18.441.902-3',
    plate: 'TR-45-90',
    type: 'CAMION',
    action: 'Entrada',
    time: '04:10 AM',
    date: '2026-06-02',
    unit: 'Construction Material',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    status: 'active'
  },
  {
    id: 'log-7',
    name: 'Beatriz Ovalle',
    rut: '17.391.201-1',
    type: 'VISITANTE',
    action: 'Entrada',
    time: '09:25 AM',
    date: '2026-06-01',
    unit: 'Unit 102',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
    status: 'exited'
  }
];

export const INITIAL_INCIDENTS: IncidentReport[] = [
  {
    id: 'inc-1',
    title: 'Vehículo bloqueando portón',
    description: 'Camioneta blanca estacionada frente a la salida norte obstruyendo el paso.',
    category: 'MODERADO',
    time: '14:20',
    reporter: 'Guard Juan Pérez',
    gate: 'Gate A/B'
  },
  {
    id: 'inc-2',
    title: 'Fallo de lector electromagnético',
    description: 'Lector de tarjetas RFID de portería principal no responde, se reinició el control de acceso manual.',
    category: 'PREVENTIVO',
    time: '10:15',
    reporter: 'System Dispatch',
    gate: 'Main North Gate'
  }
];

export const DEFAULT_GUARD: GuardProfile = {
  name: 'Guard Juan Pérez',
  gate: 'Portería Acceso Norte (Gate A/B)',
  shift: 'Shift A - Diurno',
  notifications: true,
  soundAlerts: true,
  biometricValidation: false
};
