import type { PaginationParams, DateRangeParams } from './api'

export interface ReportQueryParams extends PaginationParams, DateRangeParams {
  visitorCategoryId?: number
  vehicleTypeId?: number
  lodgingTypeId?: number
  paymentMethodId?: number
  userId?: number
  status?: string
  serviceId?: number
}

export interface ReportVisitorRow {
  id: number
  ticketNumber: string
  fullName: string | null
  categoryName: string
  quantity: number
  totalAmount: number
  checkInAt: string
  checkOutAt: string | null
  nationality: string | null
}

export interface ReportSummaryByCategory {
  categoryName: string
  count: number
  total: number
}

/** Estructura real del endpoint GET /reports/general */
export interface GeneralReport {
  totalVisitors: number
  totalVehicles: number
  totalLodging: number
  totalIncome: number
  totalExpense: number
  net: number
}
