/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccessType = 'CONTRATISTA' | 'VISITANTE' | 'ENTREGA' | 'CAMION';

export interface LogItem {
  id: string;
  name: string;
  rut: string;
  plate?: string;
  type: AccessType;
  action: 'Entrada' | 'Salida';
  time: string; // e.g. "18:14" or "06:30 AM"
  date: string; // "2026-06-02"
  unit: string;  // e.g. "Unit 115", "Service/Cleaning"
  avatar?: string;
  status: 'active' | 'exited';
  duration?: string; // e.g. "1h 15m" (calculated at exit)
  entryId?: string; // optional reference to the original entry log id
  entryTimestamp?: number; // optional timestamp for live on-site duration calculation
}

export interface ActiveCheckIn {
  id: string; // original entry log id
  name: string;
  rut: string;
  plate?: string;
  type: AccessType;
  unit: string;
  entryTime: string;
  entryDate: string;
  entryTimestamp: number; // millisecond timestamp
  avatar?: string;
}

export interface IncidentReport {
  id: string;
  title: string;
  description: string;
  category: 'URGENTE' | 'MODERADO' | 'PREVENTIVO';
  time: string;
  reporter: string;
  gate: string;
}

export interface GuardProfile {
  name: string;
  gate: string;
  shift: string;
  notifications: boolean;
  soundAlerts: boolean;
  biometricValidation: boolean;
}

export interface Persona {
  id: string;
  name: string;
  rut: string;
  plate?: string;
  type: AccessType;
  unit: string;
  avatar?: string;
}
