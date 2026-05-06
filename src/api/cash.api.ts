import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type {
  FinancialMovement,
  CreateMovementDto,
  CancelMovementDto,
  MovementQueryParams,
  CashSummary,
  CashClosure,
  CreateClosureDto,
  ClosureQueryParams,
} from '@/types/cash'

export const cashApi = {
  // ─── Movimientos ─────────────────────────────────────────────────────────
  listMovements: (params?: MovementQueryParams) =>
    apiClient
      .get<ApiResponse<FinancialMovement[]>>('/cash/movements', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  getMovement: (id: number) =>
    apiClient
      .get<ApiResponse<FinancialMovement>>(`/cash/movements/${id}`)
      .then(unwrap),

  createMovement: (dto: CreateMovementDto) =>
    apiClient
      .post<ApiResponse<FinancialMovement>>('/cash/movements', dto)
      .then(unwrap),

  updateMovement: (id: number, dto: Partial<CreateMovementDto>) =>
    apiClient
      .patch<ApiResponse<FinancialMovement>>(`/cash/movements/${id}`, dto)
      .then(unwrap),

  cancelMovement: (id: number, dto: CancelMovementDto) =>
    apiClient
      .patch<ApiResponse<FinancialMovement>>(`/cash/movements/${id}/cancel`, dto)
      .then(unwrap),

  // ─── Resúmenes ────────────────────────────────────────────────────────────
  summary: (params?: { from?: string; to?: string }) =>
    apiClient
      .get<ApiResponse<CashSummary>>('/cash/summary', { params })
      .then(unwrap),

  todaySummary: () =>
    apiClient
      .get<ApiResponse<CashSummary>>('/cash/today-summary')
      .then(unwrap),

  incomeSummary: (params?: { from?: string; to?: string }) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/cash/income-summary', { params })
      .then(unwrap),

  expenseSummary: (params?: { from?: string; to?: string }) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/cash/expense-summary', { params })
      .then(unwrap),

  byPaymentMethod: (params?: { from?: string; to?: string }) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/cash/by-payment-method', { params })
      .then(unwrap),

  byService: (params?: { from?: string; to?: string }) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/cash/by-service', { params })
      .then(unwrap),

  // ─── Cierres de caja ─────────────────────────────────────────────────────
  listClosures: (params?: ClosureQueryParams) =>
    apiClient
      .get<ApiResponse<CashClosure[]>>('/cash/closures', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  getClosure: (id: number) =>
    apiClient
      .get<ApiResponse<CashClosure>>(`/cash/closures/${id}`)
      .then(unwrap),

  getClosureDetails: (id: number) =>
    apiClient
      .get<ApiResponse<CashClosure>>(`/cash/closures/${id}/details`)
      .then(unwrap),

  getClosurePrint: (id: number) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>(`/cash/closures/${id}/print`)
      .then(unwrap),

  previewClosure: () =>
    apiClient
      .get<ApiResponse<CashSummary>>('/cash/closures/preview')
      .then(unwrap),

  createClosure: (dto: CreateClosureDto) =>
    apiClient
      .post<ApiResponse<CashClosure>>('/cash/closures', dto)
      .then(unwrap),
}
