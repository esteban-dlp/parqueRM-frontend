import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { parkConfigApi } from '@/api/parkConfig.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { PERMISSIONS } from '@/utils/permissions'
import type { UpdateParkConfigDto } from '@/types/parkConfig'
import styles from './ConfigPage.module.css'

export default function ConfigPage() {
  const canEdit = usePermission(PERMISSIONS.CONFIG_UPDATE)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: config, isLoading } = useQuery({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['park-config/services'],
    queryFn: parkConfigApi.listServices,
  })

  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } =
    useForm<UpdateParkConfigDto>()

  useEffect(() => {
    if (config) {
      reset({
        name: config.name,
        subtitle: config.subtitle ?? '',
        sigapCode: config.sigapCode ?? '',
        department: config.department ?? '',
        municipality: config.municipality ?? '',
        address: config.address ?? '',
        phone: config.phone ?? '',
        email: config.email ?? '',
        logoUrl: config.logoUrl ?? '',
        maxCapacity: config.maxCapacity,
        lanUrl: config.lanUrl ?? '',
      })
    }
  }, [config, reset])

  const updateMutation = useMutation({
    mutationFn: parkConfigApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['park-config'] })
      toast.success('Configuración guardada correctamente')
    },
    onError: () => toast.error('Error al guardar configuración'),
  })

  const toggleServiceMutation = useMutation({
    mutationFn: (id: number) => parkConfigApi.toggleService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['park-config/services'] }),
  })

  async function onSubmit(values: UpdateParkConfigDto) {
    await updateMutation.mutateAsync(values)
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <PageHeader title="Configuración del parque" subtitle="Datos institucionales y servicios" />

      <div className={styles.grid2}>
        <Card>
          <div className={styles.sectionTitle}>Datos del parque</div>
          {updateMutation.isError && (
            <div className={styles.errorBox}>
              {updateMutation.error instanceof Error ? updateMutation.error.message : 'Error al guardar'}
            </div>
          )}
          {updateMutation.isSuccess && (
            <div className={styles.successBox}>Configuración guardada correctamente.</div>
          )}
          <div className={styles.formGrid2}>
            <Input label="Nombre del parque" {...register('name')} />
            <Input label="Subtítulo" {...register('subtitle')} />
          </div>
          <div className={styles.formGrid2}>
            <Input label="Código SIGAP" {...register('sigapCode')} />
            <Input label="Capacidad máxima" type="number" {...register('maxCapacity')} />
          </div>
          <div className={styles.formGrid2}>
            <Input label="Departamento" {...register('department')} />
            <Input label="Municipio" {...register('municipality')} />
          </div>
          <Input label="Dirección" {...register('address')} />
          <div className={styles.formGrid2} style={{ marginTop: 10 }}>
            <Input label="Teléfono" {...register('phone')} />
            <Input label="Correo electrónico" type="email" {...register('email')} />
          </div>
          <Input label="URL del logo" {...register('logoUrl')} />
          <Input label="URL de la red local (LAN)" {...register('lanUrl')} />

          {canEdit && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || updateMutation.isPending || !isDirty}
              >
                {isSubmitting || updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <div className={styles.sectionTitle}>Servicios habilitados</div>
          {services.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              No hay servicios configurados.
            </p>
          ) : (
            services.map((s) => (
              <div key={s.id} className={styles.serviceRow}>
                <span className={styles.serviceName}>{s.name}</span>
                <button
                  type="button"
                  className={[styles.toggle, s.isActive ? styles.toggleOn : styles.toggleOff].join(' ')}
                  onClick={() => canEdit && toggleServiceMutation.mutate(s.id)}
                  disabled={!canEdit || toggleServiceMutation.isPending}
                  aria-label={s.isActive ? 'Desactivar' : 'Activar'}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
