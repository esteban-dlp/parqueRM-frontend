import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  VehicleRecord,
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleTodaySummary,
  VehicleQueryParams,
} from '@/types/vehicles'

export const vehiclesApi = {
  list: (params?: VehicleQueryParams) =>
    apiClient
      .get<ApiResponse<VehicleRecord[]>>('/vehicles', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  today: () =>
    apiClient
      .get<ApiResponse<VehicleRecord[]>>('/vehicles/today')
      .then(unwrap),

  todaySummary: () =>
    apiClient
      .get<ApiResponse<VehicleTodaySummary>>('/vehicles/today-summary')
      .then(unwrap),

  currentlyParked: () =>
    apiClient
      .get<ApiResponse<VehicleRecord[]>>('/vehicles/currently-parked')
      .then(unwrap),

  search: (q: string) =>
    apiClient
      .get<ApiResponse<VehicleRecord[]>>('/vehicles/search', { params: { q } })
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<VehicleRecord>>(`/vehicles/${id}`)
      .then(unwrap),

  create: (dto: CreateVehicleDto) =>
    apiClient
      .post<ApiResponse<VehicleRecord>>('/vehicles', dto)
      .then(unwrap),

  update: (id: number, dto: UpdateVehicleDto) =>
    apiClient
      .patch<ApiResponse<VehicleRecord>>(`/vehicles/${id}`, dto)
      .then(unwrap),

  remove: (id: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/vehicles/${id}`)
      .then(() => undefined),

  checkOut: (id: number) =>
    apiClient
      .post<ApiResponse<VehicleRecord>>(`/vehicles/${id}/check-out`)
      .then(unwrap),

  enableExit: (id: number) =>
    apiClient
      .patch<ApiResponse<VehicleRecord>>(`/vehicles/${id}/enable-exit`)
      .then(unwrap),

  disableExit: (id: number) =>
    apiClient
      .patch<ApiResponse<VehicleRecord>>(`/vehicles/${id}/disable-exit`)
      .then(unwrap),
}
