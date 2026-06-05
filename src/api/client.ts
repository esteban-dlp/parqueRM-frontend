import axios from 'axios'
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api'

const BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api'

type BackendErrorBody = Partial<ApiResponse<unknown>> & {
  error?: string
  statusCode?: number
}

export class ApiClientError extends Error {
  code?: string
  errors?: ApiResponse['errors']
  meta?: Record<string, unknown>
  status?: number

  constructor(message: string, options: { code?: string; errors?: ApiResponse['errors']; meta?: Record<string, unknown>; status?: number } = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.code = options.code
    this.errors = options.errors
    this.meta = options.meta
    this.status = options.status
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

export function getServerBaseUrl(): string {
  const apiBaseUrl = String(apiClient.defaults.baseURL ?? BASE_URL)
  return apiBaseUrl.replace(/\/api\/?$/, '')
}

export function buildLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl
  if (logoUrl.startsWith('/')) return getServerBaseUrl() + logoUrl
  return logoUrl
}

const ACCESS_TOKEN_KEY = 'prm_access'
const REFRESH_TOKEN_KEY = 'prm_refresh'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  setAccess: (t: string) => localStorage.setItem(ACCESS_TOKEN_KEY, t),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('prm_auth')
  },
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess()
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else if (token) resolve(token)
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      const refreshToken = tokenStorage.getRefresh()

      if (!refreshToken) {
        doLogout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((newToken) => {
          if (original.headers) original.headers['Authorization'] = `Bearer ${newToken}`
          return apiClient(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const resp = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        )
        const newToken = resp.data.data?.accessToken
        if (!newToken) throw new ApiClientError('No se pudo renovar la sesión.', { code: 'AUTH_INVALID_REFRESH' })

        tokenStorage.setAccess(newToken)
        processQueue(null, newToken)

        if (original.headers) original.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        doLogout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

function doLogout() {
  tokenStorage.clear()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const body = response.data
  if (!body.success) {
    throw new ApiClientError(body.message || 'La operación no se pudo completar.', {
      code: body.code,
      errors: body.errors,
      meta: body.meta,
      status: response.status,
    })
  }
  return body.data as T
}

export function getApiErrorMessage(error: unknown, fallback = 'Error de servidor'): string {
  if (!error) return fallback

  if (error instanceof ApiClientError) {
    return buildHumanErrorMessage({
      code: error.code,
      message: error.message,
      errors: error.errors,
      status: error.status,
      fallback,
    })
  }

  if (axios.isAxiosError(error)) {
    if (isTimeoutError(error)) {
      return 'El servidor tardó demasiado en responder. Intenta de nuevo o revisa la conexión de red.'
    }

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que la red esté disponible.'
    }

    const body = error.response.data as BackendErrorBody | undefined
    return buildHumanErrorMessage({
      code: typeof body?.code === 'string' ? body.code : undefined,
      message: normalizeMessage(body?.message),
      errors: body?.errors,
      status: error.response.status,
      fallback,
    })
  }

  if (error instanceof Error) {
    return buildHumanErrorMessage({ message: error.message, fallback })
  }

  return fallback
}

function buildHumanErrorMessage(input: {
  code?: string
  message?: string
  errors?: ApiResponse['errors']
  status?: number
  fallback: string
}): string {
  if (input.code === 'VALIDATION_ERROR') {
    const validation = formatValidationErrors(input.errors)
    if (validation) return validation
  }

  const byCode = input.code ? messageForCode(input.code) : null
  if (byCode) return byCode

  const translated = input.message ? translateKnownMessage(input.message) : null
  if (translated) return translated

  if (input.message && !isTechnicalMessage(input.message)) return input.message

  const byStatus = input.status ? messageForStatus(input.status) : null
  return byStatus ?? input.fallback
}

function normalizeMessage(message: unknown): string | undefined {
  if (Array.isArray(message)) return message.map(String).join('. ')
  if (typeof message === 'string') return message
  return undefined
}

function formatValidationErrors(errors: ApiResponse['errors'] | undefined): string | null {
  if (!errors) return null

  if (Array.isArray(errors)) {
    const clean = errors.map(String).filter(Boolean)
    if (clean.length === 0) return null
    return `Revisa estos campos: ${clean.slice(0, 4).join('. ')}${clean.length > 4 ? '.' : ''}`
  }

  const values = Object.entries(errors)
    .flatMap(([field, value]) => {
      if (Array.isArray(value)) return value.map((v) => `${field}: ${String(v)}`)
      if (typeof value === 'string') return [`${field}: ${value}`]
      return []
    })
    .filter(Boolean)

  if (values.length === 0) return null
  return `Revisa estos campos: ${values.slice(0, 4).join('. ')}${values.length > 4 ? '.' : ''}`
}

function messageForCode(code: string): string | null {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Revisa los campos marcados. Hay datos inválidos o incompletos.'
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Usuario o contraseña incorrectos.'
    case 'AUTH_USER_INACTIVE':
      return 'Este usuario está desactivado. Solicita apoyo a un administrador.'
    case 'AUTH_ROLE_INACTIVE':
      return 'El rol asignado a este usuario está inactivo. Solicita apoyo a un administrador.'
    case 'AUTH_INVALID_TOKEN':
      return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.'
    case 'AUTH_INVALID_REFRESH':
      return 'Tu sesión expiró. Inicia sesión nuevamente.'
    case 'AUTH_PASSWORD_MISMATCH':
      return 'La contraseña actual no es correcta.'
    case 'AUTH_INSUFFICIENT_PERMISSIONS':
      return 'No tienes permiso para realizar esta acción.'
    case 'DB_CONNECTION_ERROR':
      return 'No se pudo conectar con la base de datos. Verifica el servidor e intenta de nuevo.'
    case 'DB_QUERY_ERROR':
      return 'No se pudo completar la operación en la base de datos. Revisa los datos e intenta de nuevo.'
    case 'PAYLOAD_TOO_LARGE':
      return 'El archivo o la solicitud excede el tamaño permitido.'
    case 'REQUEST_TIMEOUT':
      return 'La operación tardó demasiado. Intenta de nuevo.'
    case 'CONFLICT':
      return 'Ya existe un registro con esos datos o hay un conflicto con la información actual.'
    case 'FORBIDDEN':
      return 'No tienes permiso para realizar esta acción.'
    case 'UNAUTHORIZED':
      return 'Debes iniciar sesión para continuar.'
    case 'NOT_FOUND':
      return 'No se encontró el recurso solicitado.'
    default:
      return null
  }
}

function translateKnownMessage(message: string): string | null {
  const normalized = message.trim()
  if (!normalized) return null
  if (/^Request failed with status code \d{3}$/i.test(normalized)) return null
  if (/^.+ #\d+ not found$/i.test(normalized)) return 'No se encontró el registro solicitado.'
  if (/^.+ not found$/i.test(normalized)) return 'No se encontró el registro solicitado.'
  if (/^.+ already taken$/i.test(normalized)) return 'Ese valor ya está en uso.'
  if (normalized === 'Network Error') return 'No se pudo conectar con el servidor. Verifica la red o el backend.'
  if (normalized === 'Invalid credentials') return 'Usuario o contraseña incorrectos.'
  if (normalized === 'Invalid or missing token') return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.'
  if (normalized === 'Invalid or expired refresh token') return 'Tu sesión expiró. Inicia sesión nuevamente.'
  if (normalized === 'Insufficient permissions') return 'No tienes permiso para realizar esta acción.'
  if (normalized === 'Current password is incorrect') return 'La contraseña actual no es correcta.'
  return null
}

function messageForStatus(status: number): string | null {
  switch (status) {
    case 0:
      return 'No se pudo conectar con el servidor. Verifica la red o el backend.'
    case 400:
      return 'La solicitud tiene datos inválidos. Revisa el formulario e intenta de nuevo.'
    case 401:
      return 'Debes iniciar sesión para continuar.'
    case 403:
      return 'No tienes permiso para realizar esta acción.'
    case 404:
      return 'No se encontró el recurso solicitado.'
    case 409:
      return 'Ya existe un registro con esos datos o hay un conflicto con la información actual.'
    case 413:
      return 'El archivo o la solicitud excede el tamaño permitido.'
    case 422:
      return 'No se pudo procesar la información enviada. Revisa los datos e intenta de nuevo.'
    case 500:
      return 'El servidor encontró un error interno. Contacta al administrador si continúa.'
    case 502:
    case 503:
    case 504:
      return 'El servidor no está disponible. Verifica que el backend y la base de datos estén encendidos.'
    default:
      if (status >= 500) return 'El servidor encontró un error. Contacta al administrador si continúa.'
      if (status >= 400) return 'No se pudo completar la solicitud. Revisa los datos e intenta de nuevo.'
      return null
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const msg = String(error.message ?? '').toLowerCase()
  return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || msg.includes('timeout')
}

function isTechnicalMessage(message: string): boolean {
  const normalized = message.trim()
  if (!normalized) return true
  if (/^Request failed with status code \d{3}$/i.test(normalized)) return true
  if (/^\d{3}$/.test(normalized)) return true
  if (/^[A-Z_]+$/.test(normalized)) return true
  if (['Bad Request', 'Unauthorized', 'Forbidden', 'Not Found', 'Conflict', 'Internal Server Error'].includes(normalized)) return true
  return false
}
