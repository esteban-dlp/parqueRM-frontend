import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type { AuditLog, AuditQueryParams } from '@/types/audit'

export const auditApi = {
  list: (params?: AuditQueryParams) =>
    apiClient
      .get<ApiResponse<AuditLog[]>>('/audit-logs', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<AuditLog>>(`/audit-logs/${id}`)
      .then(unwrap),

  byEntity: (entityName: string, params?: AuditQueryParams) =>
    apiClient
      .get<ApiResponse<AuditLog[]>>('/audit-logs/by-entity', {
        params: { ...params, entityName },
      })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  byUser: (userId: number, params?: AuditQueryParams) =>
    apiClient
      .get<ApiResponse<AuditLog[]>>(`/audit-logs/by-user/${userId}`, { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),
}
