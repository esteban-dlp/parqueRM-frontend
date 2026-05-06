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
      .get<ApiResponse<PermissionGroup[]>>('/permissions/grouped-by-module')
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<Permission>>(`/permissions/${id}`)
      .then(unwrap),
}
