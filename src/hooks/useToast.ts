import { useToastStore } from '@/store/toast.store'

export function useToast() {
  const { push } = useToastStore()
  return {
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
  }
}
