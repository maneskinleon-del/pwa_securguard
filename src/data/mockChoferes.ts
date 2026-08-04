/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Datos mock iniciales de choferes para SecurGuard.
 * Basados en los registros reales de los CSV de PreRegistros.
 * Algunos choferes tienen patentes distintas (simulan cambio de camión)
 * y algunos están marcados como inactivos (ya no trabajan).
 */

import { Chofer } from '../types';

export const INITIAL_CHOFERES: Chofer[] = [
  { id: 'ch-1',  name: 'Alexis Arevalos Ahumada',   rut: '16.432.819-7', plate: 'YE 58 90',  unit: 'Aparcadero', active: true },
  { id: 'ch-2',  name: 'Alfredo Vera Vasquez',       rut: '14.891.234-6', plate: 'CS FG 71', unit: 'Aparcadero', active: true },
  { id: 'ch-3',  name: 'Juan Carlos Pavez',          rut: '13.412.567-8', plate: 'ZP 21 00',  unit: 'Aparcadero', active: true },
  { id: 'ch-4',  name: 'Juan Martinez',              rut: '15.678.912-3', plate: 'YF 95 60',  unit: 'Aparcadero', active: true },
  { id: 'ch-5',  name: 'Pedro Gonzalez',             rut: '17.891.234-5', plate: 'TL 77 33',  unit: 'Aparcadero', active: true },
  { id: 'ch-6',  name: 'Mario Contreras',            rut: '18.123.456-7', plate: 'RS 44 22',  unit: 'Aparcadero', active: true },
  { id: 'ch-7',  name: 'Luis Hernandez',             rut: '19.234.567-8', plate: 'QP 11 88',  unit: 'Aparcadero', active: true },
  { id: 'ch-8',  name: 'Carlos Mendoza',             rut: '18.441.902-3', plate: 'TR 45 90',  unit: 'Materiales Construcción', active: true },
  { id: 'ch-9',  name: 'Jorge Castillo',             rut: '16.544.321-0', plate: 'NM 66 14',  unit: 'Aparcadero', active: false }, // inactivo
  { id: 'ch-10', name: 'Miguel Soto',                rut: '15.321.654-9', plate: 'JK 88 55',  unit: 'Aparcadero', active: false }, // inactivo
  { id: 'ch-11', name: 'Distribuidor Alimentos S.A.', rut: '76.211.530-5', plate: 'HL 90 88',  unit: 'Logística / Cocinas', active: true },
  { id: 'ch-12', name: 'Logistica Express',           rut: '76.843.190-5', plate: 'KH 82 91',  unit: 'Delivering Supplies', active: true },
];