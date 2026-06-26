import type { PaginationParams } from './api'

export interface VehicleRecord {
  id: number
  vehicleTypeId: number
  vehicleType?: { id: number; name: string }
  visitorRecordId: number | null
  plateNumber: string | null
  checkInAt: string
  checkOutAt: string | null
  tariffId: number | null
  appliedRate: number
  totalAmount: number
  isForeign: boolean
  exitEnabled: boolean
  source: string
  observations: string | null
  isPaid?: boolean
  receiptId?: number | null
  createdByUserId: number
  createdAt: string
  updatedAt: string | null
}

export interface CreateVehicleDto {
  vehicleTypeId: number
  visitorRecordId?: number
  plateNumber?: string
  tariffId?: number
  appliedRate: number
  totalAmount: number
  isForeign?: boolean
  observations?: string
  source?: string
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}

export interface VehicleTodaySummary {
  total: number
  parked?: number
  departed?: number
  totalAmount?: number
}

export interface VehicleQueryParams extends PaginationParams {
  from?: string
  to?: string
  vehicleTypeId?: number
  visitorRecordId?: number
  search?: string
}
