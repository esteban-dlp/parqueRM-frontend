/** Respuesta estándar del backend ParqueRM. Todos los endpoints retornan esta forma. */
export interface ApiResponse<T = unknown> {
  success: boolean
  code: string
  message: string
  data: T | null
  meta?: Record<string, unknown>
  errors?: Record<string, unknown> | string[] | null
}

/** Meta de paginación presente en listados paginados. */
export interface PaginatedMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/** Parámetros comunes de paginación para queries. */
export interface PaginationParams {
  page?: number
  limit?: number
}

/** Parámetros de rango de fechas para reportes y filtros. */
export interface DateRangeParams {
  from?: string
  to?: string
}
