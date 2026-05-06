import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  AdminChangePasswordDto,
  UserQueryParams,
} from '@/types/users'

export const usersApi = {
  list: (params?: UserQueryParams) =>
    apiClient
      .get<ApiResponse<User[]>>('/users', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<User>>(`/users/${id}`)
      .then(unwrap),

  create: (dto: CreateUserDto) =>
    apiClient
      .post<ApiResponse<User>>('/users', dto)
      .then(unwrap),

  update: (id: number, dto: UpdateUserDto) =>
    apiClient
      .patch<ApiResponse<User>>(`/users/${id}`, dto)
      .then(unwrap),

  toggleStatus: (id: number) =>
    apiClient
      .patch<ApiResponse<User>>(`/users/${id}/status`)
      .then(unwrap),

  adminChangePassword: (id: number, dto: AdminChangePasswordDto) =>
    apiClient
      .patch<ApiResponse<null>>(`/users/${id}/password`, dto)
      .then(() => undefined),

  remove: (id: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/users/${id}`)
      .then(() => undefined),
}
