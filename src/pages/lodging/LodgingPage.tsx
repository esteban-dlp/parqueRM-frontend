import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { lodgingApi } from '@/api/lodging.api'
import { catalogsApi } from '@/api/catalogs.api'
import { tariffsApi } from '@/api/tariffs.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Table, TableActions } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDate, formatDateTime, todayISO, toNum } from '@/utils/formatters'
import type { LodgingRecord } from '@/types/lodging'
import type { PaginatedMeta } from '@/types/api'
import styles from './LodgingPage.module.css'

const schema = z.object({
  lodgingTypeId: z.coerce.number().min(1, 'Selecciona tipo'),
  nights: z.coerce.number().min(1, 'Mínimo 1 noche'),
  guests: z.coerce.number().min(1, 'Mínimo 1 huésped'),
  appliedRate: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0),
  recordDate: z.string().optional(),
  observations: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function LodgingPage() {
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')
  const qc = useQueryClient()
  const toast = useToast()

  const navigate = useNavigate()
  const canCreate = usePermission(PERMISSIONS.HOSPEDAJE_CREATE)
  const canUpdate = usePermission(PERMISSIONS.HOSPEDAJE_UPDATE)
  const canCobrar = usePermission(PERMISSIONS.RECEIPTS_CREATE)
  const canOverrideTariff = usePermission(PERMISSIONS.TARIFF_OVERRIDE)

  const { data, isLoading } = useQuery({
    queryKey: ['lodging', page, filterFrom, filterTo, filterTypeId],
    queryFn: () => lodgingApi.list({
      page, limit: 20,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      lodgingTypeId: filterTypeId ? Number(filterTypeId) : undefined,
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['lodging/today-summary'],
    queryFn: lodgingApi.todaySummary,
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
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { nights: 1, guests: 1 },
  })

  const watchTypeId = watch('lodgingTypeId')
  const watchNights = watch('nights') ?? 1

  const { data: resolvedTariff } = useQuery({
    queryKey: ['tariffs/resolve-lodging', watchTypeId],
    queryFn: () =>
      tariffsApi.resolve({ appliesTo: 'HOSPEDAJE', lodgingTypeId: Number(watchTypeId), date: todayISO() }),
    enabled: !!watchTypeId,
  })

  useEffect(() => {
    if (resolvedTariff && !editId) {
      const nights = Number(watchNights) || 1
      setValue('appliedRate', resolvedTariff.amount)
      setValue('totalAmount', parseFloat((toNum(resolvedTariff.amount) * nights).toFixed(2)))
    }
  }, [resolvedTariff, watchNights, editId, setValue])

  const { data: editRecord } = useQuery({
    queryKey: ['lodging/edit', editId],
    queryFn: () => lodgingApi.getById(editId!),
    enabled: !!editId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!editRecord) return
    reset({
      lodgingTypeId: editRecord.lodgingTypeId,
      nights: editRecord.nights,
      guests: editRecord.guests,
      appliedRate: editRecord.appliedRate,
      totalAmount: editRecord.totalAmount,
      recordDate: editRecord.recordDate ?? '',
      observations: editRecord.observations ?? '',
    })
  }, [editRecord, reset])

  const createMutation = useMutation({
    mutationFn: lodgingApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lodging'] })
      qc.invalidateQueries({ queryKey: ['lodging/today-summary'] })
      toast.success('Hospedaje registrado correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al registrar hospedaje')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof lodgingApi.update>[1] }) =>
      lodgingApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lodging'] })
      qc.invalidateQueries({ queryKey: ['lodging/today-summary'] })
      toast.success('Hospedaje actualizado correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar hospedaje')),
  })

  function handleClose() {
    setShowForm(false)
    setEditId(null)
    reset({ nights: 1, guests: 1 })
  }

  function handleEdit(id: number) {
    setEditId(id)
    setShowForm(true)
  }

  async function onSubmit(values: FormValues) {
    const dto = {
      lodgingTypeId: Number(values.lodgingTypeId),
      nights: Number(values.nights),
      guests: Number(values.guests),
      appliedRate: Number(values.appliedRate),
      totalAmount: Number(values.totalAmount),
      recordDate: values.recordDate || undefined,
      observations: values.observations || undefined,
    }
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, dto })
    } else {
      await createMutation.mutateAsync(dto)
    }
  }

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    {
      key: 'lodgingType',
      header: 'Tipo',
      render: (r: LodgingRecord) => r.lodgingType?.name ?? '—',
    },
    {
      key: 'nights',
      header: 'Noches',
      width: '70px',
      render: (r: LodgingRecord) => String(r.nights),
    },
    {
      key: 'guests',
      header: 'Huéspedes',
      width: '90px',
      render: (r: LodgingRecord) => String(r.guests),
    },
    {
      key: 'appliedRate',
      header: 'Tarifa/noche',
      render: (r: LodgingRecord) => formatCurrency(r.appliedRate),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (r: LodgingRecord) => <span style={{ fontWeight: 500 }}>{formatCurrency(r.totalAmount)}</span>,
    },
    {
      key: 'recordDate',
      header: 'Fecha',
      render: (r: LodgingRecord) => formatDate(r.recordDate),
    },
    {
      key: 'createdAt',
      header: 'Registrado',
      render: (r: LodgingRecord) => formatDateTime(r.createdAt),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (_r: LodgingRecord) => <Badge variant="teal">Activo</Badge>,
      width: '80px',
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (r: LodgingRecord) => (
        <TableActions>
          {canUpdate && (
            <Button size="sm" variant="ghost" onClick={() => handleEdit(r.id)}>
              Editar
            </Button>
          )}
          {canCobrar && (
            <Button
              size="sm"
              variant="success"
              onClick={() => navigate(`/cobro/HOSPEDAJE/${r.id}`)}
            >
              Cobrar
            </Button>
          )}
        </TableActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Hospedaje"
        subtitle={`${summary?.total ?? 0} registros hoy`}
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              + Nuevo registro
            </Button>
          ) : undefined
        }
      />

      <div className={styles.summaryRow}>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Registros hoy</div>
          <div className={styles.sumValue}>{summary?.total ?? 0}</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Total recaudado</div>
          <div className={styles.sumValue}>{formatCurrency(summary?.totalAmount ?? 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div style={{ width: 150 }}><Input label="Desde" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 150 }}><Input label="Hasta" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 170 }}>
          <Select
            label="Tipo de hospedaje"
            placeholder="Todos"
            options={lodgingTypes.map(t => ({ value: t.id, label: t.name }))}
            value={filterTypeId}
            onChange={(e) => { setFilterTypeId(e.target.value); setPage(1) }}
          />
        </div>
        {(filterFrom || filterTo || filterTypeId) && (
          <Button variant="ghost" onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterTypeId(''); setPage(1) }}>✕ Limpiar</Button>
        )}
      </div>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="🏕️" title="Sin registros de hospedaje" description="Registra el primer huésped del día." />
        ) : (
          <>
            <Table columns={columns} data={rows} keyExtractor={(r) => r.id} />
            <div style={{ padding: '0 10px' }}>
              <PaginationBar meta={meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editId ? 'Editar hospedaje' : 'Nuevo registro de hospedaje'}
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? 'Guardando…'
                : editId ? 'Actualizar' : 'Registrar'}
            </Button>
          </>
        }
      >
        {(createMutation.isError || updateMutation.isError) && (
          <div className={styles.errorBox}>
            {getApiErrorMessage(createMutation.error ?? updateMutation.error, 'Error al guardar')}
          </div>
        )}
        <div className={styles.formGrid2}>
          <Select
            label="Tipo de hospedaje *"
            options={lodgingTypes.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="— Seleccionar —"
            error={errors.lodgingTypeId?.message}
            {...register('lodgingTypeId')}
          />
          <Input label="Fecha de registro" type="date" defaultValue={todayISO()} {...register('recordDate')} />
        </div>
        <div className={styles.formGrid3}>
          <Input
            label="Noches *"
            type="number"
            min="1"
            error={errors.nights?.message}
            {...register('nights')}
          />
          <Input
            label="Huéspedes *"
            type="number"
            min="1"
            error={errors.guests?.message}
            {...register('guests')}
          />
          <Input
            label="Tarifa/noche (Q)"
            type="number"
            step="0.01"
            min="0"
            hint={resolvedTariff ? `Tarifa vigente: ${resolvedTariff.name}` : undefined}
            readOnly={!canOverrideTariff}
            style={!canOverrideTariff ? { background: 'var(--surface-raised)', cursor: 'not-allowed' } : undefined}
            {...register('appliedRate')}
          />
        </div>
        <div className={styles.formGrid2}>
          <Input label="Total (Q)" type="number" step="0.01" min="0" {...register('totalAmount')} />
          <div />
        </div>
        <Textarea label="Observaciones" placeholder="Notas adicionales..." {...register('observations')} />
      </Modal>
    </div>
  )
}
