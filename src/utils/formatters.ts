export const GUATEMALA_TIME_ZONE = 'America/Guatemala'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Convierte cualquier valor (string, number, null, undefined) a number seguro.
 * Los strings numericos del backend ("25.00") se convierten correctamente.
 */
export function toNum(value: unknown): number {
  if (value == null) return 0
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

/** Formatea un valor como moneda guatemalteca (Q). Acepta string|number|null|undefined. */
export function formatCurrency(amount: unknown): string {
  return `Q ${toNum(amount).toFixed(2)}`
}

function formatDateOnly(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function getGuatemalaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: GUATEMALA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

/** Formatea una fecha ISO a formato legible en espanol. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014'
  if (DATE_ONLY_RE.test(iso)) return formatDateOnly(iso)
  return new Date(iso).toLocaleDateString('es-GT', {
    timeZone: GUATEMALA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Formatea fecha + hora. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014'
  if (DATE_ONLY_RE.test(iso)) return formatDateOnly(iso)
  return new Date(iso).toLocaleString('es-GT', {
    timeZone: GUATEMALA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Formatea solo la hora desde un ISO string. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleTimeString('es-GT', {
    timeZone: GUATEMALA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD para inputs type="date". */
export function todayISO(): string {
  const parts = getGuatemalaParts()
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Devuelve la fecha y hora actual en formato ISO local de Guatemala. */
export function nowISO(): string {
  const parts = getGuatemalaParts()
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Trunca un texto largo con ellipsis. */
export function truncate(text: string | null | undefined, max = 40): string {
  if (!text) return '\u2014'
  return text.length > max ? `${text.slice(0, max)}\u2026` : text
}

/** Formatea un porcentaje (0-100). */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
