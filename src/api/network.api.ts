import { apiClient } from './client'
import type { LocalAccessInfo } from '@/types/network'

export const networkApi = {
  localAccess: () =>
    apiClient
      .get<LocalAccessInfo>('/health/local-access')
      .then((response) => response.data),
}
