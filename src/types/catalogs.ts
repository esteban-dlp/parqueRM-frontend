import type { PaginationParams } from './api'

/** Ítem base compartido por todos los catálogos. */
export interface CatalogItem {
  id: number
  name: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

/** País con código de nacionalidad. */
export interface Country extends CatalogItem {
  nationality?: string
}

/** Departamento geográfico. */
export interface Department extends CatalogItem {}

/** Municipio vinculado a un departamento. */
export interface Municipality extends CatalogItem {
  departmentId: number
  department?: Department
}

/** Categoría de visitante (Adulto nacional, Niño, Extranjero, etc.). */
export interface VisitorCategory extends CatalogItem {}

/** Tipo de vehículo (Automóvil, Moto, Bus, etc.). */
export interface VehicleType extends CatalogItem {}

/** Tipo de alojamiento (Cabaña, Camping, etc.). */
export interface LodgingType extends CatalogItem {}

/** Método de pago (Efectivo, Tarjeta, Transferencia, Otro). */
export interface PaymentMethod extends CatalogItem {}

/** Concepto financiero (INGRESO / EGRESO). */
export interface FinancialConcept extends CatalogItem {
  type: 'INGRESO' | 'EGRESO'
}

/** Motivo de visita. */
export interface VisitReason extends CatalogItem {}

/** Actividad realizada durante la visita. */
export interface VisitActivity extends CatalogItem {}

/** Fuente de información (cómo se enteró del parque). */
export interface InfoSource extends CatalogItem {}

/** Tipo de viaje (Individual, Grupo, Familiar, etc.). */
export interface TravelType extends CatalogItem {}

/** Servicio del parque (Visitantes, Vehículos, Hospedaje, etc.). */
export interface ParkService {
  id: number
  code: string
  name: string
  isEnabled: boolean
}

/** DTO para crear o actualizar cualquier catálogo genérico. */
export interface CreateCatalogItemDto {
  name: string
  nationality?: string          // solo países
  type?: 'INGRESO' | 'EGRESO'  // solo conceptos financieros
  departmentId?: number         // solo municipios
}

/** Parámetros de query para catálogos paginados. */
export interface CatalogQueryParams extends PaginationParams {
  isActive?: boolean
  type?: 'INGRESO' | 'EGRESO'
  departmentId?: number
}
