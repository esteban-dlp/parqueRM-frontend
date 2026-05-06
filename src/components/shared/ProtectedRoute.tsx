/**
 * Protege rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige a /login.
 * Si se requiere un permiso específico y el usuario no lo tiene, muestra un aviso.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Permiso opcional requerido para acceder a esta ruta. */
  permission?: string
}

export function ProtectedRoute({ children, permission }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si hay accessToken en localStorage pero el store dice no autenticado (recarga)
  // el App-level initAuth manejará la recuperación antes de llegar aquí.

  if (permission && !hasPermission(permission)) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Acceso restringido</h2>
        <p style={{ fontSize: 13 }}>
          No tienes permiso para ver esta sección. Contacta al administrador.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
