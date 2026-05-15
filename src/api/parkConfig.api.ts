import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type { ParkConfig, UpdateParkConfigDto } from '@/types/parkConfig'
import type { ParkService } from '@/types/catalogs'

export const parkConfigApi = {
  /** Retorna la configuración del parque, o null si todavía no se ha creado. */
  get: () =>
    apiClient
      .get<ApiResponse<ParkConfig | null>>('/park-config')
      .then(unwrap),

  /** Crea o actualiza la configuración (upsert en el backend). */
  update: (dto: UpdateParkConfigDto) =>
    apiClient
      .patch<ApiResponse<ParkConfig>>('/park-config', dto)
      .then(unwrap),

  uploadLogo: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient
      .post<ApiResponse<{ logoUrl: string }>>('/park-config/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(unwrap)
  },

  listServices: () =>
    apiClient
      .get<ApiResponse<ParkService[]>>('/park-config/services')
      .then(unwrap),

  toggleService: (id: number) =>
    apiClient
      .patch<ApiResponse<ParkService>>(`/park-config/services/${id}/toggle`)
      .then(unwrap),
}
