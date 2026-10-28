// Fecha y hora para el cliente (DESIGN.md §7.4): `DD/MM/AAAA HH:mm`, 24 horas, hora de Perú. La persistencia
// sigue en UTC; solo la presentación convierte.

const LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatLimaDateTime(iso: string): string {
  const parts = Object.fromEntries(LIMA.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}
