import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '@/api/auth.api'
import { getApiErrorMessage } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { LocalAccessPanel } from '@/components/shared/LocalAccessPanel'
import styles from './LoginPage.module.css'

const schema = z.object({
  username: z.string().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState('')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  // Si ya está autenticado, redirigir directo
  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      const result = await authApi.login(values)
      login(result.user, result.accessToken, result.refreshToken)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, 'Error al iniciar sesión. Verifica tus credenciales.'))
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.logo}>🌿</div>
        <h1 className={styles.title}>Parque RM</h1>
        <p className={styles.subtitle}>Sistema de administración</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <div className={styles.errorBox}>{serverError}</div>}

        <Input
          label="Usuario"
          type="text"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>

      <div className={styles.localAccess}>
        <LocalAccessPanel triggerLabel="Ver URL de acceso" />
      </div>
    </div>
  )
}
