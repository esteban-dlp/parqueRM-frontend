/** Usuario autenticado tal como lo devuelve el backend en login y /auth/me. */
export interface AuthUser {
  id: number
  username: string
  fullName: string
  email: string | null
  isActive?: boolean
  lastLoginAt?: string | null
  role: { id: number; name: string; description?: string } | null
  permissions: string[]
}

/** Respuesta del endpoint POST /auth/login. */
export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/** Respuesta del endpoint POST /auth/refresh. */
export interface RefreshResult {
  accessToken: string
}

/** DTO enviado a POST /auth/login. */
export interface LoginDto {
  username: string
  password: string
}

/** DTO enviado a PATCH /auth/change-password. */
export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}
