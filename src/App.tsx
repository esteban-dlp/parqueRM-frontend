/**
 * Punto de entrada de React.
 * Configura React Query, el RouterProvider, y recupera la sesión al cargar.
 */
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api/auth.api'
import { tokenStorage } from '@/api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,
    },
  },
})

// Componente interno que recupera sesión activa al recargar la página.
// Siempre llama a /auth/me si hay token para asegurar que los permisos estén frescos.
function AuthInit({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (token) {
      authApi
        .me()
        .then((user) => {
          if (user) setUser(user)
        })
        .catch(() => {
          logout()
        })
    }
  // Solo ejecutar una vez al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInit>
        <RouterProvider router={router} />
      </AuthInit>
    </QueryClientProvider>
  )
}
