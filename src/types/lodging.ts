import type { PaginationParams } from './api'

export interface LodgingRecord {
  id: number
  lodgingTypeId: number
  lodgingType?: { id: number; name: string }
  recordDate: string
  nights: number
  guests: number
  tariffId: number | null
  appliedRate: number
  totalAmount: number
  isForeign: boolean
  observations: string | null
  createdByUserId: number
  createdAt: string
  updatedAt: string | null
}

export interface CreateLodgingDto {
  lodgingTypeId: number
  recordDate?: string
  nights: number
  guests: number
  tariffId?: number
  appliedRate: number
  totalAmount: number
  isForeign?: boolean
  observations?: string
}

export interface UpdateLodgingDto extends Partial<CreateLodgingDto> {}

export interface LodgingSummary {
  total: number
  totalAmount?: number
  byType?: { typeName: string; count: number }[]
}

export interface LodgingQueryParams extends PaginationParams {
  search?: string
  from?: string
  to?: string
  lodgingTypeId?: number
}
