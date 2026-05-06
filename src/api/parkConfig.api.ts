import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type { ParkConfig, UpdateParkConfigDto } from '@/types/parkConfig'
import type { ParkService } from '@/types/catalogs'

export const parkConfigApi = {
  get: () =>
    apiClient
      .get<ApiResponse<ParkConfig>>('/park-config')
      .then(unwrap),

  update: (dto: UpdateParkConfigDto) =>
    apiClient
      .patch<ApiResponse<ParkConfig>>('/park-config', dto)
      .then(unwrap),

  listServices: () =>
    apiClient
      .get<ApiResponse<ParkService[]>>('/park-config/services')
      .then(unwrap),

  toggleService: (id: number) =>
    apiClient
      .patch<ApiResponse<ParkService>>(`/park-config/services/${id}/toggle`)
      .then(unwrap),
}
