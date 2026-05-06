import type { PaginationParams } from './api'

export interface AuditLog {
  id: number
  userId: number | null
  user?: { id: number; username: string; fullName: string }
  action: string
  entityName: string
  entityId: number | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export interface AuditQueryParams extends PaginationParams {
  from?: string
  to?: string
  userId?: number
  entityName?: string
  action?: string
}
