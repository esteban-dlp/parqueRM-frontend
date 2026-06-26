import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehiclesApi } from '@/api/vehicles.api'
import { catalogsApi } from '@/api/catalogs.api'
import { tariffsApi } from '@/api/tariffs.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableActions } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchBar } from '@/components/shared/SearchBar'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDateTime, todayISO } from '@/utils/formatters'
import type { VehicleRecord } from '@/types/vehicles'
import type { PaginatedMeta } from '@/types/api'
import styles from './VehiclesPage.module.css'

const schema = z.object({
  vehicleTypeId: z.coerce.number().min(1, 'Selecciona tipo'),
  plateNumber: z.string().optional(),
  isForeign: z.boolean().default(false),
  appliedRate: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0),
  observations: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function VehiclesPage() {
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const qc = useQueryClient()
  const toast = useToast()

  const navigate = useNavigate()
  const canCreate = usePermission(PERMISSIONS.VEHICULOS_CREATE)
  const canUpdate = usePermission(PERMISSIONS.VEHICULOS_UPDATE)
  const canEnableExit = usePermission(PERMISSIONS.VEHICULOS_ENABLE_EXIT)
  const canCobrar = usePermission(PERMISSIONS.RECEIPTS_CREATE)
  const canOverrideTariff = usePermission(PERMISSIONS.TARIFF_OVERRIDE)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, filterSearch, filterFrom, filterTo, filterTypeId],
    queryFn: () => vehiclesApi.list({
      page, limit: 20,
      search: filterSearch || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      vehicleTypeId: filterTypeId ? Number(filterTypeId) : undefined,
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['vehicles/today-summary'],
    queryFn: vehiclesApi.todaySummary,
  })

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['catalogs/vehicle-types'],
    queryFn: () => catalogsApi.vehicleTypes.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues> })

  const watchTypeId = watch('vehicleTypeId')
  const watchIsForeign = watch('isForeign') ?? false

  const { data: resolvedTariff } = useQuery({
    queryKey: ['tariffs/resolve-vehicle', watchTypeId],
    queryFn: () =>
      tariffsApi.resolve({ appliesTo: 'VEHICULO', vehicleTypeId: Number(watchTypeId), date: todayISO() }),
    enabled: !!watchTypeId,
  })

  useEffect(() => {
    if (resolvedTariff && !editId) {
      const rate = watchIsForeign ? resolvedTariff.amountForeign : resolvedTariff.amountLocal
      setValue('appliedRate', rate)
      setValue('totalAmount', rate)
    }
  }, [resolvedTariff, watchIsForeign, editId, setValue])

  const { data: editRecord } = useQuery({
    queryKey: ['vehicles/edit', editId],
    queryFn: () => vehiclesApi.getById(editId!),
    enabled: !!editId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!editRecord) return
    reset({
      vehicleTypeId: editRecord.vehicleTypeId,
      plateNumber: editRecord.plateNumber ?? '',
      isForeign: editRecord.isForeign ?? false,
      appliedRate: editRecord.appliedRate,
      totalAmount: editRecord.totalAmount,
      observations: editRecord.observations ?? '',
    })
  }, [editRecord, reset])

  const createMutation = useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['vehicles/today-summary'] })
      toast.success('Vehículo registrado correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al registrar vehículo')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof vehiclesApi.update>[1] }) =>
      vehiclesApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Vehículo actualizado correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar vehículo')),
  })

  const checkoutMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.checkOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Salida registrada')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al registrar salida')),
  })

  const enableExitMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.enableExit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Salida habilitada')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al habilitar salida')),
  })

  function handleClose() {
    setShowForm(false)
    setEditId(null)
    reset()
  }

  function handleEdit(id: number) {
    setEditId(id)
    setShowForm(true)
  }

  function clearFilters() {
    setSearchKey(k => k + 1)
    setFilterSearch('')
    setFilterFrom('')
    setFilterTo('')
    setFilterTypeId('')
    setPage(1)
  }

  const hasFilters = !!(filterSearch || filterFrom || filterTo || filterTypeId)

  async function onSubmit(values: FormValues) {
    const dto = {
      vehicleTypeId: Number(values.vehicleTypeId),
      plateNumber: values.plateNumber || undefined,
      isForeign: values.isForeign ?? false,
      appliedRate: Number(values.appliedRate),
      totalAmount: Number(values.totalAmount),
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
      key: 'vehicleType',
      header: 'Tipo',
      render: (r: VehicleRecord) => r.vehicleType?.name ?? '—',
    },
    { key: 'plateNumber', header: 'Placa', render: (r: VehicleRecord) => r.plateNumber ?? '—' },
    {
      key: 'totalAmount',
      header: 'Tarifa',
      render: (r: VehicleRecord) => formatCurrency(r.totalAmount),
    },
    {
      key: 'checkInAt',
      header: 'Ingreso',
      render: (r: VehicleRecord) => formatDateTime(r.checkInAt),
    },
    {
      key: 'checkOutAt',
      header: 'Salida',
      render: (r: VehicleRecord) => formatDateTime(r.checkOutAt),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: VehicleRecord) =>
        r.checkOutAt ? (
          <Badge variant="gray">Salió</Badge>
        ) : r.exitEnabled ? (
          <Badge variant="blue">Habilitado</Badge>
        ) : (
          <Badge variant="green">En parqueo</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '240px',
      render: (r: VehicleRecord) => (
        <TableActions>
          {canUpdate && (
            <Button size="sm" variant="ghost" onClick={() => handleEdit(r.id)}>
              Editar
            </Button>
          )}
          {r.isPaid ? (
            <Badge variant="green">Cobrado</Badge>
          ) : canCobrar && !r.checkOutAt && (
            <Button
              size="sm"
              variant="success"
              onClick={() => navigate(`/cobro/VEHICULO/${r.id}`)}
            >
              Cobrar
            </Button>
          )}
          {!r.checkOutAt && canEnableExit && !r.exitEnabled && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => enableExitMutation.mutate(r.id)}
              disabled={enableExitMutation.isPending}
            >
              Habilitar salida
            </Button>
          )}
          {!r.checkOutAt && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => checkoutMutation.mutate(r.id)}
              disabled={checkoutMutation.isPending}
            >
              Salida
            </Button>
          )}
        </TableActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Registro de vehículos"
        subtitle={`${summary?.total ?? 0} vehículos hoy`}
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              + Nuevo vehículo
            </Button>
          ) : undefined
        }
      />

      <div className={styles.summaryRow}>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Vehículos hoy</div>
          <div className={styles.sumValue}>{summary?.total ?? 0}</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>En parqueo</div>
          <div className={styles.sumValue}>{summary?.parked ?? 0}</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Total recaudado</div>
          <div className={styles.sumValue}>{formatCurrency(summary?.totalAmount ?? 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <SearchBar key={searchKey} placeholder="Placa, tipo…" onSearch={(q) => { setFilterSearch(q); setPage(1) }} />
        <div style={{ width: 150 }}><Input label="Desde" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 150 }}><Input label="Hasta" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 170 }}>
          <Select
            label="Tipo de vehículo"
            placeholder="Todos"
            options={vehicleTypes.map(t => ({ value: t.id, label: t.name }))}
            value={filterTypeId}
            onChange={(e) => { setFilterTypeId(e.target.value); setPage(1) }}
          />
        </div>
        {hasFilters && <Button variant="ghost" onClick={clearFilters}>✕ Limpiar</Button>}
      </div>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="🚗" title="Sin vehículos registrados" description="Registra el primer vehículo del día." />
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
        title={editId ? 'Editar vehículo' : 'Registrar vehículo'}
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
            label="Tipo de vehículo *"
            options={vehicleTypes.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="— Seleccionar —"
            error={errors.vehicleTypeId?.message}
            {...register('vehicleTypeId')}
          />
          <Input label="Placa" placeholder="P-123ABC" {...register('plateNumber')} />
        </div>

        {/* Toggle extranjero */}
        <Controller
          control={control}
          name="isForeign"
          defaultValue={false}
          render={({ field }) => (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                marginBottom: 12,
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={field.value ?? false}
                onChange={(e) => field.onChange(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span>
                Vehículo extranjero
                {resolvedTariff && (
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                    (nacional: Q{resolvedTariff.amountLocal} / extranjero: Q{resolvedTariff.amountForeign})
                  </span>
                )}
              </span>
            </label>
          )}
        />

        <div className={styles.formGrid2}>
          <Input
            label="Tarifa aplicada (Q)"
            type="number"
            step="0.01"
            min="0"
            hint={resolvedTariff ? `Tarifa: ${resolvedTariff.name} — ${watchIsForeign ? 'extranjero' : 'nacional'}` : undefined}
            readOnly={!canOverrideTariff}
            style={!canOverrideTariff ? { background: 'var(--surface-raised)', cursor: 'not-allowed' } : undefined}
            {...register('appliedRate')}
          />
          <Input label="Total (Q)" type="number" step="0.01" min="0" {...register('totalAmount')} />
        </div>
        <Input label="Observaciones" placeholder="Notas adicionales..." {...register('observations')} />
      </Modal>
    </div>
  )
}
