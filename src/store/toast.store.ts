import { create } from 'zustand'

export type ToastVariant = 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, variant: ToastVariant) => void
  dismiss: (id: number) => void
}

let _nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push(message, variant) {
    const id = _nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
