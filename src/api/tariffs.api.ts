import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  Tariff,
  CreateTariffDto,
  UpdateTariffDto,
  ResolveTariffParams,
  TariffQueryParams,
} from '@/types/tariffs'

export const tariffsApi = {
  list: (params?: TariffQueryParams) =>
    apiClient
      .get<ApiResponse<Tariff[]>>('/tariffs', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  forVisitors: () =>
    apiClient
      .get<ApiResponse<Tariff[]>>('/tariffs/visitors')
      .then(unwrap),

  forVehicles: () =>
    apiClient
      .get<ApiResponse<Tariff[]>>('/tariffs/vehicles')
      .then(unwrap),

  forLodging: () =>
    apiClient
      .get<ApiResponse<Tariff[]>>('/tariffs/lodging')
      .then(unwrap),

  /** Resuelve la tarifa que aplica según categoría, tipo y fecha. */
  resolve: (params: ResolveTariffParams) =>
    apiClient
      .get<ApiResponse<Tariff>>('/tariffs/resolve', { params })
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<Tariff>>(`/tariffs/${id}`)
      .then(unwrap),

  create: (dto: CreateTariffDto) =>
    apiClient
      .post<ApiResponse<Tariff>>('/tariffs', dto)
      .then(unwrap),

  update: (id: number, dto: UpdateTariffDto) =>
    apiClient
      .patch<ApiResponse<Tariff>>(`/tariffs/${id}`, dto)
      .then(unwrap),

  toggleStatus: (id: number) =>
    apiClient
      .patch<ApiResponse<Tariff>>(`/tariffs/${id}/status`)
      .then(unwrap),

  remove: (id: number) =>
    apiClient
      .delete<ApiResponse<null>>(`/tariffs/${id}`)
      .then(() => undefined),
}
