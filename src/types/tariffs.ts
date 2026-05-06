import type { PaginationParams } from './api'

export type TariffAppliesTo = 'VISITANTE' | 'VEHICULO' | 'HOSPEDAJE'

export interface Tariff {
  id: number
  serviceId: number
  service?: { id: number; name: string }
  visitorCategoryId: number | null
  visitorCategory?: { id: number; name: string }
  vehicleTypeId: number | null
  vehicleType?: { id: number; name: string }
  lodgingTypeId: number | null
  lodgingType?: { id: number; name: string }
  name: string
  appliesTo: TariffAppliesTo
  amount: number
  isForeign: boolean
  validFrom: string
  validTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTariffDto {
  serviceId: number
  visitorCategoryId?: number
  vehicleTypeId?: number
  lodgingTypeId?: number
  name: string
  appliesTo: TariffAppliesTo
  amount: number
  isForeign?: boolean
  validFrom: string
  validTo?: string
}

export interface UpdateTariffDto extends Partial<CreateTariffDto> {}

export interface ResolveTariffParams {
  appliesTo: TariffAppliesTo
  visitorCategoryId?: number
  vehicleTypeId?: number
  lodgingTypeId?: number
  isForeign?: boolean
  date?: string
}

export interface TariffQueryParams extends PaginationParams {
  appliesTo?: TariffAppliesTo
  isActive?: boolean
  serviceId?: number
}
