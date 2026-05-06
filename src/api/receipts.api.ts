import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  Receipt,
  CreateReceiptDto,
  CancelReceiptDto,
  ReceiptQueryParams,
} from '@/types/receipts'

export const receiptsApi = {
  list: (params?: ReceiptQueryParams) =>
    apiClient
      .get<ApiResponse<Receipt[]>>('/receipts', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  nextNumber: () =>
    apiClient
      .get<ApiResponse<{ receiptNumber: string }>>('/receipts/next-number')
      .then(unwrap),

  getById: (id: number) =>
    apiClient
      .get<ApiResponse<Receipt>>(`/receipts/${id}`)
      .then(unwrap),

  getPrint: (id: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/receipts/${id}/print`)
      .then(unwrap),

  create: (dto: CreateReceiptDto) =>
    apiClient
      .post<ApiResponse<Receipt>>('/receipts', dto)
      .then(unwrap),

  update: (id: number, dto: Partial<CreateReceiptDto>) =>
    apiClient
      .patch<ApiResponse<Receipt>>(`/receipts/${id}`, dto)
      .then(unwrap),

  cancel: (id: number, dto: CancelReceiptDto) =>
    apiClient
      .patch<ApiResponse<Receipt>>(`/receipts/${id}/cancel`, dto)
      .then(unwrap),

  triggerPrint: (id: number) =>
    apiClient
      .post<ApiResponse<null>>(`/receipts/${id}/print`)
      .then(() => undefined),
}
