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
  originType?: string
  originId?: number
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
  subtotal: number | null
  discountType: 'PERCENTAGE' | 'AMOUNT' | null
  discountPercentage: number | null
  discountAmount: number | null
  discountReason: string | null
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
  originType?: string
  originId?: number
  description: string
  quantity?: number
  unitPrice: number
  total: number
}

export interface CreateReceiptDto {
  receiptNumber?: string
  contributorName?: string
  contributorDocument?: string
  contributorAddress?: string
  originType: string
  originId?: number
  paymentMethodId: number
  subtotal?: number
  discountType?: 'PERCENTAGE' | 'AMOUNT'
  discountValue?: number
  discountAmount?: number
  discountReason?: string
  total: number
  amountReceived?: number
  changeAmount?: number
  paymentReference?: string
  lines: CreateReceiptLineDto[]
}

export interface CancelReceiptDto {
  cancelReason: string
}

export interface ReceiptQueryParams extends PaginationParams {
  from?: string
  to?: string
  status?: string
  originType?: string
  paymentMethodId?: number
}
