import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type {
  Country,
  Department,
  Municipality,
  VisitorCategory,
  VehicleType,
  LodgingType,
  PaymentMethod,
  FinancialConcept,
  VisitReason,
  VisitActivity,
  InfoSource,
  TravelType,
  CreateCatalogItemDto,
  CatalogQueryParams,
} from '@/types/catalogs'

/** Función genérica para crear los endpoints CRUD de cada catálogo. */
function makeCatalog<T extends { id: number; name: string; isActive: boolean }>(
  base: string,
) {
  return {
    list: (params?: CatalogQueryParams) =>
      apiClient
        .get<ApiResponse<T[]>>(base, { params })
        .then(unwrap),

    getById: (id: number) =>
      apiClient
        .get<ApiResponse<T>>(`${base}/${id}`)
        .then(unwrap),

    create: (dto: CreateCatalogItemDto) =>
      apiClient
        .post<ApiResponse<T>>(base, dto)
        .then(unwrap),

    update: (id: number, dto: Partial<CreateCatalogItemDto>) =>
      apiClient
        .patch<ApiResponse<T>>(`${base}/${id}`, dto)
        .then(unwrap),

    toggleStatus: (id: number) =>
      apiClient
        .patch<ApiResponse<T>>(`${base}/${id}/status`)
        .then(unwrap),

    remove: (id: number) =>
      apiClient
        .delete<ApiResponse<null>>(`${base}/${id}`)
        .then(() => undefined),
  }
}

export const catalogsApi = {
  countries: makeCatalog<Country>('/catalogs/countries'),
  departments: makeCatalog<Department>('/catalogs/departments'),
  visitorCategories: makeCatalog<VisitorCategory>('/catalogs/visitor-categories'),
  vehicleTypes: makeCatalog<VehicleType>('/catalogs/vehicle-types'),
  lodgingTypes: makeCatalog<LodgingType>('/catalogs/lodging-types'),
  paymentMethods: makeCatalog<PaymentMethod>('/catalogs/payment-methods'),
  financialConcepts: makeCatalog<FinancialConcept>('/catalogs/financial-concepts'),
  visitReasons: makeCatalog<VisitReason>('/catalogs/visit-reasons'),
  visitActivities: makeCatalog<VisitActivity>('/catalogs/visit-activities'),
  infoSources: makeCatalog<InfoSource>('/catalogs/info-sources'),
  travelTypes: makeCatalog<TravelType>('/catalogs/travel-types'),

  // Municipios tienen endpoint especial por departamento
  municipalities: {
    ...makeCatalog<Municipality>('/catalogs/municipalities'),
    byDepartment: (departmentId: number) =>
      apiClient
        .get<ApiResponse<Municipality[]>>(
          `/catalogs/departments/${departmentId}/municipalities`,
        )
        .then(unwrap),
  },
}
