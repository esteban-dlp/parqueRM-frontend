/** Formatea un número como moneda guatemalteca (Q). */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'Q 0.00'
  return `Q ${amount.toFixed(2)}`
}

/** Formatea una fecha ISO a formato legible en español. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Formatea fecha + hora. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Formatea solo la hora desde un ISO string. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD para inputs type="date". */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/** Devuelve la fecha y hora actual en formato ISO local. */
export function nowISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

/** Trunca un texto largo con ellipsis. */
export function truncate(text: string | null | undefined, max = 40): string {
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Formatea un porcentaje (0-100). */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
