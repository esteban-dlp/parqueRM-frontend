import type { PaginationParams } from './api'

export type ReceiptOriginType =
  | 'VISITANTE'
  | 'VEHICULO'
  | 'HOSPEDAJE'
  | 'SERVICIO_GENERAL'
  | 'MOVIMIENTO_MANUAL'

export interface ReceiptLine {
  id?: number
  conceptId?: number
  concept?: { id: number; name: string }
  description?: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Receipt {
  id: number
  receiptNumber: string
  receiptDate: string
  contributorName: string | null
  contributorDocument: string | null
  contributorAddress: string | null
  originType: string
  originId: number | null
  paymentMethodId: number
  paymentMethod?: { id: number; name: string }
  total: number
  amountReceived: number | null
  changeAmount: number | null
  paymentReference: string | null
  status: string
  sicoinReference: string | null
  cancelReason: string | null
  cancelledAt: string | null
  cancelledByUserId: number | null
  lines: ReceiptLine[]
  createdAt: string
  updatedAt: string | null
}

export interface CreateReceiptLineDto {
  conceptId?: number
  quantity?: number
  unitPrice: number
  amount?: number
  description?: string
}

export interface CreateReceiptDto {
  receiptNumber?: string
  contributorName?: string
  contributorDocument?: string
  contributorAddress?: string
  originType: string
  originId?: number
  paymentMethodId: number
  total: number
  amountReceived?: number
  changeAmount?: number
  paymentReference?: string
  lines: CreateReceiptLineDto[]
}

export interface CancelReceiptDto {
  reason: string
}

export interface ReceiptQueryParams extends PaginationParams {
  from?: string
  to?: string
  status?: string
  originType?: string
  paymentMethodId?: number
}
