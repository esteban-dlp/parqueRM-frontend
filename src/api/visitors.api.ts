import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  VisitorRecord,
  CreateVisitorDto,
  UpdateVisitorDto,
  VisitorTodaySummary,
  VisitorOccupancy,
  VisitorQueryParams,
  BulkCheckOutDto,
} from '@/types/visitors'

export const visitorsApi = {
  list: (params?: VisitorQueryParams) =>
    apiClient
      .get<ApiResponse<VisitorRecord[]>>('/visitors', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  today: () =>
    apiClient
      .get<ApiResponse<VisitorRecord[]>>('/visitors/today')
      .then(unwrap),

  todaySummary: () =>
    apiClient
      .get<ApiResponse<VisitorTodaySummary>>('/visitors/today-summary')
      .then(unwrap),

  currentlyInside: () =>
    apiClient
      .get<ApiResponse<VisitorRecord[]>>('/visitors/currently-inside')
      .then(unwrap),

  occupancy: () =>
    apiClient
      .get<ApiResponse<VisitorOccupancy>>('/visitors/occupancy')
      .then(unwrap),

  search: (q: string) =>
    apiClient
      .get<ApiResponse<VisitorRecord[]>>('/visitors/search', { params: { q } })
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<VisitorRecord>>(`/visitors/${id}`)
      .then(unwrap),

  create: (dto: CreateVisitorDto) =>
    apiClient
      .post<ApiResponse<VisitorRecord>>('/visitors', dto)
      .then(unwrap),

  update: (id: number, dto: UpdateVisitorDto) =>
    apiClient
      .patch<ApiResponse<VisitorRecord>>(`/visitors/${id}`, dto)
      .then(unwrap),

  remove: (id: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/visitors/${id}`)
      .then(() => undefined),

  checkOut: (id: number) =>
    apiClient
      .post<ApiResponse<VisitorRecord>>(`/visitors/${id}/check-out`)
      .then(unwrap),

  bulkCheckOut: (dto: BulkCheckOutDto) =>
    apiClient
      .post<ApiResponse<null>>('/visitors/bulk-check-out', dto)
      .then(() => undefined),

  ticket: (id: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/visitors/${id}/ticket`)
      .then(unwrap),
}
