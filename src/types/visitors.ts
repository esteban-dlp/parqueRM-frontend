import type { PaginationParams } from './api'

export interface VisitorCompanionLine {
  id?: number
  visitorCategoryId: number
  visitorCategory?: { id: number; name: string }
  quantity: number
  appliedRate: number
  totalAmount: number
  isForeign: boolean
}

export interface VisitorRecord {
  id: number
  ticketNumber: string
  visitorCategoryId: number
  visitorCategory?: { id: number; name: string }
  quantity: number
  tariffId: number | null
  appliedRate: number
  totalAmount: number
  isForeign: boolean
  checkInAt: string
  checkOutAt: string | null
  recordDate: string
  countryId: number | null
  country?: { id: number; name: string }
  departmentId: number | null
  department?: { id: number; name: string }
  municipalityId: number | null
  municipality?: { id: number; name: string }
  infoSourceId: number | null
  travelTypeId: number | null
  nationality: string | null
  identificationType: string | null
  identificationNumber: string | null
  fullName: string | null
  email: string | null
  gender: string | null
  ageRange: string | null
  visitType: string | null
  observations: string | null
  source: string | null
  hasMedicationAllergy: boolean
  medicationAllergyDetail: string | null
  hasDiabetes: boolean
  hasHypertension: boolean
  hasRespiratoryDisease: boolean
  hasAnimalBiteAllergy: boolean
  animalBiteAllergyDetail: string | null
  reasons?: { id: number; name: string }[]
  activities?: { id: number; name: string }[]
  companions?: VisitorCompanionLine[]
  createdAt: string
  updatedAt: string
}

export interface CreateVisitorDto {
  visitorCategoryId: number
  quantity?: number
  tariffId?: number
  appliedRate: number
  totalAmount: number
  isForeign?: boolean
  checkInAt?: string
  recordDate?: string
  countryId?: number
  departmentId?: number
  municipalityId?: number
  infoSourceId?: number
  travelTypeId?: number
  nationality?: string
  identificationType?: string
  identificationNumber?: string
  fullName?: string
  email?: string
  gender?: string
  ageRange?: string
  visitType?: string
  observations?: string
  source?: string
  hasMedicationAllergy?: boolean
  medicationAllergyDetail?: string
  hasDiabetes?: boolean
  hasHypertension?: boolean
  hasRespiratoryDisease?: boolean
  hasAnimalBiteAllergy?: boolean
  animalBiteAllergyDetail?: string
  reasonIds?: number[]
  activityIds?: number[]
  companions?: {
    visitorCategoryId: number
    quantity: number
    isForeign?: boolean
    appliedRate: number
    totalAmount: number
  }[]
}

export interface UpdateVisitorDto extends Partial<CreateVisitorDto> {}

export interface VisitorTodaySummary {
  total: number
  byCategory?: { categoryName: string; count: number }[]
  checkouts?: number
  inside?: number
  totalAmount?: number
}

export interface VisitorOccupancy {
  current: number
  capacity: number
  percentage: number
}

export interface VisitorQueryParams extends PaginationParams {
  from?: string
  to?: string
  visitorCategoryId?: number
  source?: string
  search?: string
}

export interface BulkCheckOutDto {
  visitorIds: number[]
}
