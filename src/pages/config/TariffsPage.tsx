import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { tariffsApi } from '@/api/tariffs.api'
import { catalogsApi } from '@/api/catalogs.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableActions } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Tariff } from '@/types/tariffs'
import styles from './TariffsPage.module.css'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  appliesTo: z.enum(['VISITANTE', 'VEHICULO', 'HOSPEDAJE']),
  serviceId: z.coerce.number().min(1, 'Servicio requerido'),
  amount: z.coerce.number().min(0, 'Monto requerido'),
  visitorCategoryId: z.coerce.number().optional(),
  vehicleTypeId: z.coerce.number().optional(),
  lodgingTypeId: z.coerce.number().optional(),
  isForeign: z.boolean().default(false),
  validFrom: z.string().min(1, 'Fecha requerida'),
  validTo: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function TariffsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editTariff, setEditTariff] = useState<Tariff | null>(null)
  const canManage = usePermission(PERMISSIONS.CATALOGS_MANAGE)
  const qc = useQueryClient()

  const { data: tariffsData, isLoading } = useQuery({
    queryKey: ['tariffs'],
    queryFn: () => tariffsApi.list({ limit: 100 }),
  })

  const { data: services = [] } = useQuery({
    queryKey: ['park-config/services'],
    queryFn: () => import('@/api/parkConfig.api').then((m) => m.parkConfigApi.listServices()),
    staleTime: 10 * 60 * 1000,
  })

  const { data: visitorCategories = [] } = useQuery({
    queryKey: ['catalogs/visitor-categories'],
    queryFn: () => catalogsApi.visitorCategories.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['catalogs/vehicle-types'],
    queryFn: () => catalogsApi.vehicleTypes.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: lodgingTypes = [] } = useQuery({
    queryKey: ['catalogs/lodging-types'],
    queryFn: () => catalogsApi.lodgingTypes.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues> })

  const watchAppliesTo = watch('appliesTo')

  const createMutation = useMutation({
    mutationFn: tariffsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffs'] })
      handleClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof tariffsApi.update>[1] }) =>
      tariffsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffs'] })
      handleClose()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => tariffsApi.toggleStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tariffs'] }),
  })

  function handleClose() {
    setShowForm(false)
    setEditTariff(null)
    reset()
  }

  function handleEdit(t: Tariff) {
    setEditTariff(t)
    reset({
      name: t.name,
      appliesTo: t.appliesTo,
      serviceId: t.serviceId,
      amount: t.amount,
      visitorCategoryId: t.visitorCategoryId ?? undefined,
      vehicleTypeId: t.vehicleTypeId ?? undefined,
      lodgingTypeId: t.lodgingTypeId ?? undefined,
      isForeign: t.isForeign,
      validFrom: t.validFrom?.split('T')[0] ?? '',
      validTo: t.validTo?.split('T')[0] ?? '',
    })
    setShowForm(true)
  }

  async function onSubmit(values: FormValues) {
    const dto = {
      name: values.name,
      appliesTo: values.appliesTo,
      serviceId: Number(values.serviceId),
      amount: Number(values.amount),
      visitorCategoryId: values.visitorCategoryId ? Number(values.visitorCategoryId) : undefined,
      vehicleTypeId: values.vehicleTypeId ? Number(values.vehicleTypeId) : undefined,
      lodgingTypeId: values.lodgingTypeId ? Number(values.lodgingTypeId) : undefined,
      isForeign: values.isForeign ?? false,
      validFrom: values.validFrom,
      validTo: values.validTo || undefined,
    }
    if (editTariff) {
      await updateMutation.mutateAsync({ id: editTariff.id, dto })
    } else {
      await createMutation.mutateAsync(dto)
    }
  }

  const tariffs = tariffsData?.data ?? []

  const columns = [
    { key: 'name', header: 'Nombre' },
    {
      key: 'appliesTo',
      header: 'Aplica a',
      render: (r: Tariff) => <Badge variant="blue">{r.appliesTo}</Badge>,
    },
    {
      key: 'category',
      header: 'Categoría / Tipo',
      render: (r: Tariff) =>
        r.visitorCategory?.name ?? r.vehicleType?.name ?? r.lodgingType?.name ?? '—',
    },
    {
      key: 'amount',
      header: 'Tarifa',
      render: (r: Tariff) => <span style={{ fontWeight: 500 }}>{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'isForeign',
      header: 'Extranjero',
      render: (r: Tariff) => r.isForeign ? <Badge variant="purple">Sí</Badge> : null,
      width: '90px',
    },
    {
      key: 'validFrom',
      header: 'Vigencia',
      render: (r: Tariff) =>
        `${formatDate(r.validFrom)}${r.validTo ? ` – ${formatDate(r.validTo)}` : ' en adelante'}`,
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (r: Tariff) =>
        r.isActive ? <Badge variant="green">Activa</Badge> : <Badge variant="gray">Inactiva</Badge>,
      width: '80px',
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: Tariff) => (
        <TableActions>
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}>Editar</Button>
              <Button
                size="sm"
                variant={r.isActive ? 'secondary' : 'ghost'}
                onClick={() => toggleMutation.mutate(r.id)}
                disabled={toggleMutation.isPending}
              >
                {r.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            </>
          )}
        </TableActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Tarifas"
        subtitle="Gestión de tarifas por servicio"
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>+ Nueva tarifa</Button>
          ) : undefined
        }
      />

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : tariffs.length === 0 ? (
          <EmptyState icon="💲" title="Sin tarifas" description="Configura las tarifas del parque." />
        ) : (
          <Table columns={columns} data={tariffs} keyExtractor={(r) => r.id} />
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editTariff ? 'Editar tarifa' : 'Nueva tarifa'}
        size="wide"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid2}>
          <Input label="Nombre *" error={errors.name?.message} {...register('name')} />
          <Select
            label="Aplica a *"
            options={[
              { value: 'VISITANTE', label: 'Visitante' },
              { value: 'VEHICULO', label: 'Vehículo' },
              { value: 'HOSPEDAJE', label: 'Hospedaje' },
            ]}
            placeholder="— Tipo —"
            error={errors.appliesTo?.message}
            {...register('appliesTo')}
          />
        </div>
        <div className={styles.formGrid2}>
          <Select
            label="Servicio *"
            options={services.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="— Servicio —"
            error={errors.serviceId?.message}
            {...register('serviceId')}
          />
          <Input
            label="Monto (Q) *"
            type="number"
            step="0.01"
            min="0"
            error={errors.amount?.message}
            {...register('amount')}
          />
        </div>
        {watchAppliesTo === 'VISITANTE' && (
          <Select
            label="Categoría de visitante"
            options={visitorCategories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="— Todas las categorías —"
            {...register('visitorCategoryId')}
          />
        )}
        {watchAppliesTo === 'VEHICULO' && (
          <Select
            label="Tipo de vehículo"
            options={vehicleTypes.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="— Todos los tipos —"
            {...register('vehicleTypeId')}
          />
        )}
        {watchAppliesTo === 'HOSPEDAJE' && (
          <Select
            label="Tipo de hospedaje"
            options={lodgingTypes.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="— Todos los tipos —"
            {...register('lodgingTypeId')}
          />
        )}
        <div className={styles.formGrid2} style={{ marginTop: 10 }}>
          <Input label="Válida desde *" type="date" error={errors.validFrom?.message} {...register('validFrom')} />
          <Input label="Válida hasta (vacío = indefinido)" type="date" {...register('validTo')} />
        </div>
        <label className={styles.checkboxRow}>
          <input type="checkbox" {...register('isForeign')} />
          <span>Tarifa para extranjeros</span>
        </label>
      </Modal>
    </div>
  )
}
