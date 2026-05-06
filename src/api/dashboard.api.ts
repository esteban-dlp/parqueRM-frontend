import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type { DashboardSummary, DashboardTodayTotals, LatestMovement } from '@/types/dashboard'
import type { VisitorOccupancy } from '@/types/visitors'

export const dashboardApi = {
  summary: () =>
    apiClient
      .get<ApiResponse<DashboardSummary>>('/dashboard/summary')
      .then(unwrap),

  today: () =>
    apiClient
      .get<ApiResponse<DashboardTodayTotals>>('/dashboard/today')
      .then(unwrap),

  visitorsSummary: () =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/dashboard/visitors-summary')
      .then(unwrap),

  vehiclesSummary: () =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/dashboard/vehicles-summary')
      .then(unwrap),

  incomeSummary: () =>
    apiClient
      .get<ApiResponse<Record<string, unknown>>>('/dashboard/income-summary')
      .then(unwrap),

  latestMovements: () =>
    apiClient
      .get<ApiResponse<LatestMovement[]>>('/dashboard/latest-movements')
      .then(unwrap),

  occupancy: () =>
    apiClient
      .get<ApiResponse<VisitorOccupancy>>('/dashboard/occupancy')
      .then(unwrap),
}
