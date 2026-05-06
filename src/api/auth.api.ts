import { apiClient, unwrap } from './client'
import type { LoginDto, LoginResult, RefreshResult, ChangePasswordDto } from '@/types/auth'
import type { AuthUser } from '@/types/auth'
import type { ApiResponse } from '@/types/api'

export const authApi = {
  login: (dto: LoginDto) =>
    apiClient
      .post<ApiResponse<LoginResult>>('/auth/login', dto)
      .then(unwrap),

  me: () =>
    apiClient
      .get<ApiResponse<AuthUser>>('/auth/me')
      .then(unwrap),

  logout: () =>
    apiClient
      .post<ApiResponse<null>>('/auth/logout')
      .then(() => undefined),

  refresh: (refreshToken: string) =>
    apiClient
      .post<ApiResponse<RefreshResult>>('/auth/refresh', { refreshToken })
      .then(unwrap),

  changePassword: (dto: ChangePasswordDto) =>
    apiClient
      .patch<ApiResponse<null>>('/auth/change-password', dto)
      .then(() => undefined),
}
