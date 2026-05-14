/**
 * Hook para acceder a la configuración del parque.
 * El nombre del parque, código SIGAP, etc. se cargan desde el backend una vez
 * y se cachean con React Query. Se usa en Sidebar y Topbar.
 */
import { useQuery } from '@tanstack/react-query'
import { parkConfigApi } from '@/api/parkConfig.api'
import type { ParkConfig } from '@/types/parkConfig'

const FALLBACK_NAME = 'Parque RM'

export function useParkConfig() {
  const { data, isLoading } = useQuery<ParkConfig>({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
  })

  return {
    config: data,
    parkName: data?.parkName ?? FALLBACK_NAME,
    isLoading,
  }
}
