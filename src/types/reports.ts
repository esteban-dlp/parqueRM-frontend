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

export interface GeneralReport {
  visitors?: ReportSummaryByCategory[]
  vehicles?: { typeName: string; count: number; total: number }[]
  income?: { conceptName: string; total: number }[]
  total?: number
}
