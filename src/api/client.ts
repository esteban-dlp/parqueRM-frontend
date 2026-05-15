/**
 * Cliente HTTP centralizado de ParqueRM.
 *
 * Maneja automáticamente:
 * - Inyección del Bearer token en cada request
 * - Refresh automático del accessToken cuando el backend responde 401
 * - Logout y redirección a /login si el refresh también falla
 * - Desempaquetado de la respuesta estándar { success, data, message }
 *
 * Todas las llamadas al backend pasan por aquí — nunca usar axios directamente.
 */
import axios from 'axios'
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_URL as string

/**
 * Devuelve la URL base del servidor (sin el prefijo /api).
 * Úsala para construir rutas de archivos estáticos como logos:
 *   getServerBaseUrl() + '/uploads/logos/logo.png'
 */
export function getServerBaseUrl(): string {
  return BASE_URL.replace(/\/api\/?$/, '')
}

/**
 * Convierte un logoUrl relativo (/uploads/...) en URL absoluta del backend.
 * Si ya es URL absoluta o es null/undefined, lo devuelve sin modificar.
 */
export function buildLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl
  if (logoUrl.startsWith('/')) return getServerBaseUrl() + logoUrl
  return logoUrl
}

// ─── Claves de localStorage ───────────────────────────────────────────────────
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
    // También limpia el estado del usuario almacenado por Zustand
    localStorage.removeItem('prm_auth')
  },
}

// ─── Instancia axios ──────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Interceptor de request: inyecta el Bearer token ─────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess()
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Bandera para evitar múltiples intentos de refresh en vuelos paralelos
let isRefreshing = false
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else if (token) resolve(token)
  })
  failedQueue = []
}

// ─── Interceptor de response: manejo de 401 + refresh ────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Solo intentar refresh si es 401, no es el endpoint de refresh mismo,
    // y no hemos reintentado ya esta solicitud.
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      const refreshToken = tokenStorage.getRefresh()

      if (!refreshToken) {
        // Sin refresh token → logout inmediato
        doLogout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Si ya hay un refresh en vuelo, encolar y esperar
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
        if (!newToken) throw new Error('No token in refresh response')

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
  // Redirigir a login — se usa window.location para evitar dependencia circular con el router
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Extrae `data.data` de la respuesta estándar del backend.
 * Usar este helper en todos los API files para no repetir la extracción.
 */
export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const body = response.data
  if (!body.success && body.message) {
    throw new Error(body.message)
  }
  return body.data as T
}

/**
 * Extrae el mensaje de error de un error de Axios o de la API.
 * Intenta leer el mensaje del body del backend antes de usar el mensaje de Axios.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Error de servidor'): string {
  if (!error) return fallback
  if (typeof error === 'object' && error !== null) {
    const axiosErr = error as {
      response?: { data?: { message?: unknown; errors?: unknown } }
      message?: string
    }
    const backendMsg = axiosErr.response?.data?.message
    if (backendMsg) {
      if (Array.isArray(backendMsg)) return backendMsg.join('. ')
      if (typeof backendMsg === 'string') return backendMsg
    }
    if (axiosErr.message && axiosErr.message !== 'Network Error') return axiosErr.message
  }
  return fallback
}
