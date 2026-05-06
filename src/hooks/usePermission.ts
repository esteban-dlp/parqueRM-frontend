/**
 * Hook para verificar permisos de forma declarativa.
 *
 * IMPORTANTE: Los permisos en frontend solo sirven para mostrar/ocultar UI.
 * La seguridad real está en el backend mediante guards y RBAC.
 *
 * Uso:
 *   const canCreate = usePermission('VISITANTES_CREATE')
 *   const { canRead, canManage } = usePermissions(['VISITANTES_READ', 'VISITANTES_CREATE'])
 */
import { useAuthStore } from '@/store/auth.store'

/** Retorna true si el usuario tiene el permiso indicado. */
export function usePermission(code: string): boolean {
  return useAuthStore((s) => s.hasPermission(code))
}

/** Retorna un objeto con cada código mapeado a boolean. */
export function usePermissions<T extends string>(
  codes: T[],
): Record<T, boolean> {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return codes.reduce(
    (acc, code) => {
      acc[code] = hasPermission(code)
      return acc
    },
    {} as Record<T, boolean>,
  )
}
