import type { PaginationParams, DateRangeParams } from './api'

export interface ReportQueryParams extends PaginationParams, DateRangeParams {
  visitorCategoryId?: number
  vehicleTypeId?: number
  lodgingTypeId?: number
  paymentMethodId?: number
  userId?: number
  status?: string
  serviceId?: number
  originTypes?: string[]
  conceptIds?: number[]
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

/** Estructura real del endpoint GET /reports/cash-by-payment-method */
export interface CashByPaymentMethodRow {
  date: string
  amounts: Record<string, number>
  total: number
}

export interface CashByPaymentMethodReport {
  data: CashByPaymentMethodRow[]
  paymentMethods: string[]
  grandTotal: number
}

/** Estructura real del endpoint GET /reports/income-by-origin */
export interface IncomeByOriginRow {
  originType: string
  conceptId?: number
  conceptName?: string | null
  count: number
  total: number
}

export interface IncomeByOriginReport {
  data: IncomeByOriginRow[]
  grandTotal: number
  grandCount: number
}

/** Estructura real del endpoint GET /reports/surveys */
export interface SurveyReportRow {
  questionId: number
  question: string
  answerType: 'SCALE_1_5' | 'SCALE_1_10' | 'EMOJI' | null
  occurrences: number
  dominantValue: number
  dominantCount: number
  percentage: number
}

export interface SurveyReport {
  data: SurveyReportRow[]
  details?: SurveyReportDetail[]
}

export interface SurveyReportAnswer {
  questionId: number
  question: string
  answerType: 'SCALE_1_5' | 'SCALE_1_10' | 'EMOJI' | null
  value: number
}

export interface SurveyReportDetail {
  responseId: number
  submittedAt: string
  generalComment: string | null
  answers: SurveyReportAnswer[]
}
