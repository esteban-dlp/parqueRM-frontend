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
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import type { UpdateParkConfigDto } from '@/types/parkConfig'
import styles from './ConfigPage.module.css'

export default function ConfigPage() {
  const canEdit = usePermission(PERMISSIONS.CONFIG_UPDATE)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
    retry: false,
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
        parkName: config.parkName ?? '',
        parkSubtitle: config.parkSubtitle ?? '',
        sigapCode: config.sigapCode ?? '',
        department: config.department ?? '',
        municipality: config.municipality ?? '',
        address: config.address ?? '',
        phone: config.phone ?? '',
        email: config.email ?? '',
        logoUrl: config.logoUrl ?? '',
        maxCapacity: config.maxCapacity,
        systemLanUrl: config.systemLanUrl ?? '',
      })
    }
  }, [config, reset])

  const updateMutation = useMutation({
    mutationFn: parkConfigApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['park-config'] })
      toast.success('Configuración guardada correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al guardar configuración')),
  })

  const toggleServiceMutation = useMutation({
    mutationFn: (id: number) => parkConfigApi.toggleService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['park-config/services'] }),
  })

  async function onSubmit(values: UpdateParkConfigDto) {
    const dto: UpdateParkConfigDto = {
      parkName: values.parkName || undefined,
      parkSubtitle: values.parkSubtitle || undefined,
      sigapCode: values.sigapCode || undefined,
      department: values.department || undefined,
      municipality: values.municipality || undefined,
      address: values.address || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      logoUrl: values.logoUrl || undefined,
      maxCapacity: values.maxCapacity != null && String(values.maxCapacity).trim() !== ''
        ? Number(values.maxCapacity)
        : undefined,
      systemLanUrl: values.systemLanUrl || undefined,
    }
    await updateMutation.mutateAsync(dto)
  }

  if (isLoading) return <Loading />

  if (isError) {
    return (
      <div>
        <PageHeader title="Configuración del parque" subtitle="Datos institucionales y servicios" />
        <div className={styles.errorBox} style={{ margin: '24px 0' }}>
          No existe una configuración inicial del parque en la base de datos. Un administrador
          debe insertar el registro inicial en la tabla <strong>park_config</strong> antes de
          poder editar esta sección.
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Configuración del parque" subtitle="Datos institucionales y servicios" />

      <div className={styles.grid2}>
        <Card>
          <div className={styles.sectionTitle}>Datos del parque</div>
          {updateMutation.isError && (
            <div className={styles.errorBox}>
              {getApiErrorMessage(updateMutation.error, 'Error al guardar configuración')}
            </div>
          )}
          {updateMutation.isSuccess && (
            <div className={styles.successBox}>Configuración guardada correctamente.</div>
          )}
          <div className={styles.formGrid2}>
            <Input label="Nombre del parque" {...register('parkName')} />
            <Input label="Subtítulo" {...register('parkSubtitle')} />
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
          <Input label="URL de la red local (LAN)" {...register('systemLanUrl')} />

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
                  className={[styles.toggle, s.isEnabled ? styles.toggleOn : styles.toggleOff].join(' ')}
                  onClick={() => canEdit && toggleServiceMutation.mutate(s.id)}
                  disabled={!canEdit || toggleServiceMutation.isPending}
                  aria-label={s.isEnabled ? 'Desactivar' : 'Activar'}
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
