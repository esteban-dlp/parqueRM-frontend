import { useState } from 'react'
import { networkApi } from '@/api/network.api'
import { copyText } from '@/utils/clipboard'
import { useToast } from '@/hooks/useToast'
import type { LocalAccessInfo } from '@/types/network'

export function useLocalAccess() {
  const toast = useToast()
  const [localAccess, setLocalAccess] = useState<LocalAccessInfo | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const info = await networkApi.localAccess()
      setLocalAccess(info)

      if (info.loginUrl) {
        await copyText(info.loginUrl)
        toast.success('URL por IP generada y copiada')
      } else {
        toast.error('No se detectó una IP de red local')
      }
    } catch {
      toast.error('No se pudo generar la URL por IP')
    } finally {
      setLoading(false)
    }
  }

  async function copyUrl() {
    if (!localAccess?.loginUrl) return
    try {
      await copyText(localAccess.loginUrl)
      toast.success('URL copiada')
    } catch {
      toast.error('No se pudo copiar la URL')
    }
  }

  return { localAccess, loading, generate, copyUrl }
}
