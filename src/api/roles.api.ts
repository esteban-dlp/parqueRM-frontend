import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type { Role, CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from '@/types/roles'

export const rolesApi = {
  list: () =>
    apiClient
      .get<ApiResponse<Role[]>>('/roles')
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<Role>>(`/roles/${id}`)
      .then(unwrap),

  getPermissions: (id: number) =>
    apiClient
      .get<ApiResponse<Role>>(`/roles/${id}/permissions`)
      .then(unwrap),

  create: (dto: CreateRoleDto) =>
    apiClient
      .post<ApiResponse<Role>>('/roles', dto)
      .then(unwrap),

  update: (id: number, dto: UpdateRoleDto) =>
    apiClient
      .patch<ApiResponse<Role>>(`/roles/${id}`, dto)
      .then(unwrap),

  assignPermissions: (id: number, dto: AssignPermissionsDto) =>
    apiClient
      .patch<ApiResponse<Role>>(`/roles/${id}/permissions`, dto)
      .then(unwrap),

  remove: (id: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/roles/${id}`)
      .then(() => undefined),
}
