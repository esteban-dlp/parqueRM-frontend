export interface Permission {
  id: number
  code: string
  name: string
  module: string
  description?: string
}

export interface PermissionGroup {
  module: string
  permissions: Permission[]
}

export interface Role {
  id: number
  name: string
  description: string | null
  isActive: boolean
  permissions?: Permission[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoleDto {
  name: string
  description?: string
}

export interface UpdateRoleDto {
  name?: string
  description?: string
}

export interface AssignPermissionsDto {
  permissionIds: number[]
}
