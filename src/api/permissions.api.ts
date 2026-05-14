import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type { Permission, PermissionGroup } from '@/types/roles'

export const permissionsApi = {
  list: () =>
    apiClient
      .get<ApiResponse<Permission[]>>('/permissions')
      .then(unwrap),

  groupedByModule: () =>
    apiClient
      .get<ApiResponse<unknown>>('/permissions/grouped-by-module')
      .then((r) => {
        const raw = r.data.data
        if (Array.isArray(raw)) return raw as PermissionGroup[]
        // Backend returns { MODULE: Permission[] } — transform to array
        if (raw && typeof raw === 'object') {
          return Object.entries(raw as Record<string, Permission[]>).map(
            ([module, permissions]) => ({
              module,
              permissions: Array.isArray(permissions) ? permissions : [],
            }),
          ) as PermissionGroup[]
        }
        return [] as PermissionGroup[]
      }),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<Permission>>(`/permissions/${id}`)
      .then(unwrap),
}
