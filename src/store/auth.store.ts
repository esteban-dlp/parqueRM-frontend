/**
 * Store de autenticación con Zustand.
 *
 * Por qué Zustand y no React Query:
 * - El estado de auth es global y síncrono (no es fetch de servidor)
 * - Necesitamos leerlo en el API client (interceptor), que está fuera del árbol React
 * - Zustand permite leer el estado fuera de componentes con getState()
 *
 * Por qué NO guardamos tokens aquí directamente para el interceptor:
 * - El API client lee tokens desde localStorage directamente (tokenStorage)
 *   para evitar dependencia circular con este store
 * - Este store sincroniza el estado UI con lo que hay en localStorage
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'
import { tokenStorage } from '@/api/client'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean

  /** Guarda sesión tras login exitoso. */
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void

  /** Limpia toda la sesión. */
  logout: () => void

  /** Actualiza solo el accessToken (tras refresh). */
  updateAccessToken: (token: string) => void

  /** Actualiza los datos del usuario (tras /auth/me). */
  setUser: (user: AuthUser) => void

  /** Verifica si el usuario actual tiene un permiso específico. */
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        tokenStorage.setAccess(accessToken)
        tokenStorage.setRefresh(refreshToken)
        set({ user, isAuthenticated: true })
      },

      logout: () => {
        tokenStorage.clear()
        set({ user: null, isAuthenticated: false })
      },

      updateAccessToken: (token) => {
        tokenStorage.setAccess(token)
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true })
      },

      hasPermission: (code: string) => {
        const { user } = get()
        if (!user) return false
        return user.permissions.includes(code)
      },
    }),
    {
      name: 'prm_auth',
      // Solo persistir el user y isAuthenticated — los tokens van en tokenStorage
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
