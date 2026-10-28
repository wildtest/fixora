// Tipos de equipo (PRD §4.3, TD §7.1): lista cerrada de seis valores. Los valores técnicos son ASCII estables
// (coinciden con el enum de PostgreSQL); las etiquetas son las de la interfaz.

export const DEVICE_TYPES = ['CELULAR', 'TABLET', 'LAPTOP', 'PC', 'CONSOLA', 'OTRO'] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_TYPE_LABELS: Readonly<Record<DeviceType, string>> = {
  CELULAR: 'Celular',
  TABLET: 'Tablet',
  LAPTOP: 'Laptop',
  PC: 'PC',
  CONSOLA: 'Consola',
  OTRO: 'Otro',
};

export function isDeviceType(value: unknown): value is DeviceType {
  return typeof value === 'string' && (DEVICE_TYPES as readonly string[]).includes(value);
}
