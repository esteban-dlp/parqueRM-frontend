/**
 * Hook de autenticación. Expone las acciones y estado de auth del store.
 * Usar este hook en componentes en lugar de importar useAuthStore directamente.
 */
import { useAuthStore } from '@/store/auth.store'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return { user, isAuthenticated, login, logout, setUser, hasPermission }
}
