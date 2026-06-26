import { apiClient, unwrap } from './client'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, PaginatedMeta } from '@/types/api'
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

type CatalogListResult<T> = { data: T[]; meta: PaginatedMeta }

const CATALOG_PAGE_SIZE = 100

function readPaginatedResponse<T>(
  response: AxiosResponse<ApiResponse<T[]>>,
  fallbackPage: number,
  fallbackLimit: number,
): CatalogListResult<T> {
  const data = unwrap(response) ?? []
  const meta = response.data.meta as Partial<PaginatedMeta> | undefined
  const total = Number(meta?.total ?? data.length)
  const page = Number(meta?.page ?? fallbackPage)
  const limit = Number(meta?.limit ?? fallbackLimit)
  const totalPages = Number(meta?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))))

  return { data, meta: { total, page, limit, totalPages } }
}

async function fetchCatalogPage<T extends { id: number; name: string; isActive: boolean }>(
  base: string,
  params?: CatalogQueryParams,
): Promise<CatalogListResult<T>> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const response = await apiClient.get<ApiResponse<T[]>>(base, { params })
  return readPaginatedResponse(response, page, limit)
}

async function fetchAllCatalogItems<T extends { id: number; name: string; isActive: boolean }>(
  base: string,
  params?: CatalogQueryParams,
): Promise<T[]> {
  const first = await fetchCatalogPage<T>(base, { ...params, page: 1, limit: CATALOG_PAGE_SIZE })
  const rows = [...first.data]

  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    const next = await fetchCatalogPage<T>(base, { ...params, page, limit: CATALOG_PAGE_SIZE })
    rows.push(...next.data)
  }

  return rows
}

/** Función genérica para crear los endpoints CRUD de cada catálogo. */
function makeCatalog<T extends { id: number; name: string; isActive: boolean }>(
  base: string,
) {
  return {
    list: (params?: CatalogQueryParams) =>
      fetchAllCatalogItems<T>(base, params),

    listPaged: (params?: CatalogQueryParams) =>
      fetchCatalogPage<T>(base, params),

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
      fetchAllCatalogItems<Municipality>(`/catalogs/departments/${departmentId}/municipalities`),
    byDepartmentPaged: (departmentId: number, params?: CatalogQueryParams) =>
      fetchCatalogPage<Municipality>(`/catalogs/departments/${departmentId}/municipalities`, params),
  },
}
