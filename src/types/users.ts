import type { PaginationParams } from './api'

export interface User {
  id: number
  username: string
  fullName: string
  email: string | null
  isActive: boolean
  lastLoginAt: string | null
  roleId: number
  role?: { id: number; name: string }
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  username: string
  password: string
  fullName: string
  email?: string
  roleId: number
}

export interface UpdateUserDto {
  username?: string
  fullName?: string
  email?: string
  roleId?: number
}

export interface AdminChangePasswordDto {
  newPassword: string
}

export interface UserQueryParams extends PaginationParams {
  isActive?: boolean
  roleId?: number
  search?: string
}
