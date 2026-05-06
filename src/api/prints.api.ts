import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'

/** Los endpoints de prints devuelven datos estructurados para renderizar en pantalla antes de imprimir. */
export const printsApi = {
  visitorTicket: (id: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/prints/visitor-ticket/${id}`)
      .then(unwrap),

  receipt: (id: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/prints/receipt/${id}`)
      .then(unwrap),

  cashClosure: (id: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/prints/cash-closure/${id}`)
      .then(unwrap),
}
