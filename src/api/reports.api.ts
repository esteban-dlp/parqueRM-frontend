import { apiClient, unwrap } from './client'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
import type { ReportQueryParams, ReportVisitorRow, GeneralReport } from '@/types/reports'

export const reportsApi = {
  general: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<GeneralReport>>('/reports/general', { params })
      .then(unwrap),

  visitors: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<ReportVisitorRow[]>>('/reports/visitors', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  visitorsByCategory: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/reports/visitors/by-category', { params })
      .then(unwrap),

  visitorsByOrigin: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/reports/visitors/by-origin', { params })
      .then(unwrap),

  visitorsByNationality: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/reports/visitors/by-nationality', { params })
      .then(unwrap),

  vehicles: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>('/reports/vehicles', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  lodging: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>('/reports/lodging', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  income: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>('/reports/income', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  expenses: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>('/reports/expenses', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  cashClosures: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>('/reports/cash-closures', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  receipts: (params?: ReportQueryParams) =>
    apiClient
      .get<ApiResponse<Record<string, unknown>[]>>('/reports/receipts', { params })
      .then((r) => ({ data: r.data.data ?? [], meta: r.data.meta as unknown as PaginatedMeta })),

  /** Exporta a Excel — el backend responde con un blob. */
  exportVisitorsExcel: (params?: ReportQueryParams) =>
    apiClient.get('/reports/visitors/export/excel', {
      params,
      responseType: 'blob',
    }),

  exportVisitorsPdf: (params?: ReportQueryParams) =>
    apiClient.get('/reports/visitors/export/pdf', {
      params,
      responseType: 'blob',
    }),

  exportIncomeExcel: (params?: ReportQueryParams) =>
    apiClient.get('/reports/income/export/excel', {
      params,
      responseType: 'blob',
    }),

  exportIncomePdf: (params?: ReportQueryParams) =>
    apiClient.get('/reports/income/export/pdf', {
      params,
      responseType: 'blob',
    }),

  exportClosuresExcel: (params?: ReportQueryParams) =>
    apiClient.get('/reports/cash-closures/export/excel', {
      params,
      responseType: 'blob',
    }),

  exportClosuresPdf: (params?: ReportQueryParams) =>
    apiClient.get('/reports/cash-closures/export/pdf', {
      params,
      responseType: 'blob',
    }),

  exportGeneralExcel: (params?: ReportQueryParams) =>
    apiClient.get('/reports/export/excel', {
      params,
      responseType: 'blob',
    }),

  exportGeneralPdf: (params?: ReportQueryParams) =>
    apiClient.get('/reports/export/pdf', {
      params,
      responseType: 'blob',
    }),
}
