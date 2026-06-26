import { useState } from 'react'
import { networkApi } from '@/api/network.api'
import { getApiErrorMessage } from '@/api/client'
import { copyText } from '@/utils/clipboard'
import { useToast } from '@/hooks/useToast'
import type { LocalAccessInfo } from '@/types/network'

export function useLocalAccess() {
  const toast = useToast()
  const [localAccess, setLocalAccess] = useState<LocalAccessInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setErrorMessage(null)
    try {
      const info = await networkApi.localAccess()
      setLocalAccess(info)

      if (info.loginUrl) {
        await copyText(info.loginUrl)
        toast.success('URL por IP generada y copiada')
      } else {
        const message = 'El backend respondio, pero no detecto una URL de red local util.'
        setErrorMessage(message)
        toast.error(message)
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'No se pudo consultar la URL por IP. Verifica que el backend responda.')
      setLocalAccess(null)
      setErrorMessage(message)
      toast.error(message)
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

  return { localAccess, loading, errorMessage, generate, copyUrl }
}
