import { useQuery } from '@tanstack/react-query'
import { parkConfigApi } from '@/api/parkConfig.api'
import type { ParkConfig } from '@/types/parkConfig'

const FALLBACK_NAME = 'Parque RM'

export function useParkConfig() {
  const { data, isLoading } = useQuery<ParkConfig | null>({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
  })

  return {
    config: data ?? null,
    parkName: data?.parkName ?? FALLBACK_NAME,
    isLoading,
  }
}
