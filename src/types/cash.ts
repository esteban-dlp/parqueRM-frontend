import type { PaginationParams } from './api'

export type MovementType = 'INGRESO' | 'EGRESO'
export type MovementOriginType =
  | 'VISITANTE'
  | 'VEHICULO'
  | 'HOSPEDAJE'
  | 'SERVICIO_GENERAL'
  | 'MOVIMIENTO_MANUAL'

export interface FinancialMovement {
  id: number
  movementType: MovementType
  conceptId: number
  concept?: { id: number; name: string; type: string }
  paymentMethodId: number
  paymentMethod?: { id: number; name: string }
  originType: string
  originId: number | null
  receiptId: number | null
  movementDate: string
  amount: number
  description: string | null
  status: string
  cashClosureId: number | null
  cancelledByUserId: number | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CreateMovementDto {
  movementType: MovementType
  conceptId: number
  paymentMethodId: number
  originType: MovementOriginType
  originId?: number
  receiptId?: number
  amount: number
  description?: string
}

export interface CancelMovementDto {
  reason: string
}

export interface MovementQueryParams extends PaginationParams {
  from?: string
  to?: string
  movementType?: MovementType
  status?: string
  paymentMethodId?: number
  conceptId?: number
}

export interface CashSummary {
  totalIncome: number
  totalExpenses: number
  netTotal: number
  byPaymentMethod?: { methodName: string; income: number; expense: number }[]
  byService?: { serviceName: string; total: number }[]
}

export interface CashClosure {
  id: number
  observations: string | null
  totalIncome: number
  totalExpenses: number
  netTotal: number
  closedAt: string
  closedBy: number | null
  closedByUser?: { id: number; fullName: string }
  details?: CashClosureDetail[]
  createdAt: string
}

export interface CashClosureDetail {
  id: number
  cashClosureId: number
  paymentMethodId?: number
  paymentMethod?: { id: number; name: string }
  serviceId?: number
  service?: { id: number; name: string }
  conceptId?: number
  concept?: { id: number; name: string }
  totalIncome: number
  totalExpenses: number
}

export interface CreateClosureDto {
  observations?: string
}

export interface ClosureQueryParams extends PaginationParams {
  from?: string
  to?: string
}
