import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  LodgingRecord,
  CreateLodgingDto,
  UpdateLodgingDto,
  LodgingSummary,
  LodgingQueryParams,
} from '@/types/lodging'

export const lodgingApi = {
  list: (params?: LodgingQueryParams) =>
    apiClient
      .get<ApiResponse<LodgingRecord[]>>('/lodging', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  today: () =>
    apiClient
      .get<ApiResponse<LodgingRecord[]>>('/lodging/today')
      .then(unwrap),

  todaySummary: () =>
    apiClient
      .get<ApiResponse<LodgingSummary>>('/lodging/today-summary')
      .then(unwrap),

  monthSummary: () =>
    apiClient
      .get<ApiResponse<LodgingSummary>>('/lodging/month-summary')
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<LodgingRecord>>(`/lodging/${id}`)
      .then(unwrap),

  create: (dto: CreateLodgingDto) =>
    apiClient
      .post<ApiResponse<LodgingRecord>>('/lodging', dto)
      .then(unwrap),

  update: (id: number, dto: UpdateLodgingDto) =>
    apiClient
      .patch<ApiResponse<LodgingRecord>>(`/lodging/${id}`, dto)
      .then(unwrap),

  remove: (id: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/lodging/${id}`)
      .then(() => undefined),
}
