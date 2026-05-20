import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form'
import type { Resolver, Control, UseFormSetValue } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { visitorsApi } from '@/api/visitors.api'
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
import { SearchBar } from '@/components/shared/SearchBar'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDateTime, todayISO, toNum } from '@/utils/formatters'
import type { VisitorRecord } from '@/types/visitors'
import type { PaginatedMeta } from '@/types/api'
import styles from './VisitorsPage.module.css'

// Helper: select vacío ("") → undefined; valor numérico válido → number
const optionalId = z.preprocess(
  (v) => (v === '' || v === '0' || v === 0 || v === null ? undefined : v),
  z.coerce.number().positive().optional(),
)

const companionSchema = z.object({
  visitorCategoryId: z.coerce.number().min(1, 'Categoría requerida'),
  quantity: z.coerce.number().min(1).default(1),
  isForeign: z.boolean().default(false),
  appliedRate: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0),
})

const schema = z.object({
  visitorCategoryId: z.coerce.number().min(1, 'Selecciona categoría'),
  quantity: z.coerce.number().min(1).default(1),
  isForeign: z.boolean().default(false),
  appliedRate: z.coerce.number().min(0, 'Tarifa requerida'),
  totalAmount: z.coerce.number().min(0),
  countryId: optionalId,
  departmentId: optionalId,
  municipalityId: optionalId,
  infoSourceId: optionalId,
  travelTypeId: optionalId,
  nationality: z.string().optional(),
  identificationType: z.string().optional(),
  identificationNumber: z.string().optional(),
  fullName: z.string().optional(),
  gender: z.string().optional(),
  ageRange: z.string().optional(),
  visitType: z.string().optional(),
  observations: z.string().optional(),
  reasonIds: z.array(z.number()).optional(),
  activityIds: z.array(z.number()).optional(),
  companions: z.array(companionSchema).optional().default([]),
})
type FormValues = z.infer<typeof schema>

export default function VisitorsPage() {
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const qc = useQueryClient()
  const toast = useToast()

  const navigate = useNavigate()
  const canCreate = usePermission(PERMISSIONS.VISITANTES_CREATE)
  const canUpdate = usePermission(PERMISSIONS.VISITANTES_UPDATE)
  const canCheckout = usePermission(PERMISSIONS.VISITANTES_CHECKOUT)
  const canCobrar = usePermission(PERMISSIONS.RECEIPTS_CREATE)
  const canOverrideTariff = usePermission(PERMISSIONS.TARIFF_OVERRIDE)

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', page, filterSearch, filterFrom, filterTo, filterCategoryId],
    queryFn: () => visitorsApi.list({
      page, limit: 20,
      search: filterSearch || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      visitorCategoryId: filterCategoryId ? Number(filterCategoryId) : undefined,
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['visitors/today-summary'],
    queryFn: visitorsApi.todaySummary,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['catalogs/visitor-categories'],
    queryFn: () => catalogsApi.visitorCategories.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: countries = [] } = useQuery({
    queryKey: ['catalogs/countries'],
    queryFn: () => catalogsApi.countries.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['catalogs/departments'],
    queryFn: () => catalogsApi.departments.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: reasons = [] } = useQuery({
    queryKey: ['catalogs/visit-reasons'],
    queryFn: () => catalogsApi.visitReasons.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['catalogs/visit-activities'],
    queryFn: () => catalogsApi.visitActivities.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: infoSources = [] } = useQuery({
    queryKey: ['catalogs/info-sources'],
    queryFn: () => catalogsApi.infoSources.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: travelTypes = [] } = useQuery({
    queryKey: ['catalogs/travel-types'],
    queryFn: () => catalogsApi.travelTypes.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as unknown as Resolver<FormValues> })

  const { fields: companionFields, append: appendCompanion, remove: removeCompanion } = useFieldArray({
    control,
    name: 'companions',
  })

  const watchDept = watch('departmentId')
  const watchCategoryId = watch('visitorCategoryId')
  const watchIsForeign = watch('isForeign') ?? false
  const watchQty = watch('quantity') ?? 1

  // Municipios dependientes del departamento seleccionado
  const { data: municipalities = [] } = useQuery({
    queryKey: ['catalogs/municipalities', watchDept],
    queryFn: () =>
      watchDept
        ? catalogsApi.municipalities.byDepartment(Number(watchDept))
        : Promise.resolve([]),
    enabled: !!watchDept,
  })

  // Resolución automática de tarifa al cambiar categoría o bandera extranjero
  const { data: resolvedTariff } = useQuery({
    queryKey: ['tariffs/resolve', watchCategoryId],
    queryFn: () =>
      tariffsApi.resolve({
        appliesTo: 'VISITANTE',
        visitorCategoryId: Number(watchCategoryId),
        date: todayISO(),
      }),
    enabled: !!watchCategoryId,
  })

  useEffect(() => {
    if (resolvedTariff && !editId) {
      const rate = watchIsForeign ? resolvedTariff.amountForeign : resolvedTariff.amountLocal
      setValue('appliedRate', rate)
      setValue('totalAmount', rate * (watchQty || 1))
    }
  }, [resolvedTariff, watchQty, watchIsForeign, editId, setValue])

  const { data: editRecord } = useQuery({
    queryKey: ['visitors/edit', editId],
    queryFn: () => visitorsApi.getById(editId!),
    enabled: !!editId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!editRecord) return
    reset({
      visitorCategoryId: editRecord.visitorCategoryId,
      quantity: editRecord.quantity,
      isForeign: editRecord.isForeign ?? false,
      appliedRate: editRecord.appliedRate,
      totalAmount: editRecord.totalAmount,
      countryId: editRecord.countryId ?? undefined,
      departmentId: editRecord.departmentId ?? undefined,
      municipalityId: editRecord.municipalityId ?? undefined,
      infoSourceId: editRecord.infoSourceId ?? undefined,
      travelTypeId: editRecord.travelTypeId ?? undefined,
      nationality: editRecord.nationality ?? '',
      identificationType: editRecord.identificationType ?? '',
      identificationNumber: editRecord.identificationNumber ?? '',
      fullName: editRecord.fullName ?? '',
      gender: editRecord.gender ?? '',
      ageRange: editRecord.ageRange ?? '',
      visitType: editRecord.visitType ?? '',
      observations: editRecord.observations ?? '',
      reasonIds: editRecord.reasons?.map(r => r.id) ?? [],
      activityIds: editRecord.activities?.map(a => a.id) ?? [],
    })
  }, [editRecord, reset])

  // Re-calcular total cuando cambia cantidad o tarifa
  const watchRate = watch('appliedRate') ?? 0
  const handleQtyOrRateChange = () => {
    const qty = Number(watch('quantity') ?? 1)
    const rate = Number(watch('appliedRate') ?? 0)
    setValue('totalAmount', parseFloat((toNum(qty) * toNum(rate)).toFixed(2)))
  }

  const createMutation = useMutation({
    mutationFn: visitorsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      qc.invalidateQueries({ queryKey: ['visitors/today-summary'] })
      toast.success('Visitante registrado correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al registrar visitante')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof visitorsApi.update>[1] }) =>
      visitorsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      qc.invalidateQueries({ queryKey: ['visitors/today-summary'] })
      toast.success('Visitante actualizado correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar visitante')),
  })

  const checkoutMutation = useMutation({
    mutationFn: (id: number) => visitorsApi.checkOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      toast.success('Salida registrada')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al registrar salida')),
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
    setFilterCategoryId('')
    setPage(1)
  }

  const hasFilters = !!(filterSearch || filterFrom || filterTo || filterCategoryId)

  async function onSubmit(values: FormValues) {
    const companions = (values.companions ?? []).filter(c => c.visitorCategoryId > 0)
    const dto = {
      ...values,
      visitorCategoryId: Number(values.visitorCategoryId),
      quantity: Number(values.quantity) || 1,
      isForeign: values.isForeign ?? false,
      appliedRate: Number(values.appliedRate),
      totalAmount: Number(values.totalAmount),
      countryId: values.countryId || undefined,
      departmentId: values.departmentId || undefined,
      municipalityId: values.municipalityId || undefined,
      infoSourceId: values.infoSourceId || undefined,
      travelTypeId: values.travelTypeId || undefined,
      gender: values.gender || undefined,
      ageRange: values.ageRange || undefined,
      visitType: values.visitType || undefined,
      nationality: values.nationality || undefined,
      identificationType: values.identificationType || undefined,
      identificationNumber: values.identificationNumber || undefined,
      fullName: values.fullName || undefined,
      companions: companions.length > 0 ? companions.map(c => ({
        visitorCategoryId: Number(c.visitorCategoryId),
        quantity: Number(c.quantity) || 1,
        isForeign: c.isForeign ?? false,
        appliedRate: Number(c.appliedRate),
        totalAmount: Number(c.totalAmount),
      })) : undefined,
    }
    if (editId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { companions: _c, ...updateDto } = dto
      await updateMutation.mutateAsync({ id: editId, dto: updateDto })
    } else {
      await createMutation.mutateAsync(dto)
    }
  }

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    { key: 'ticketNumber', header: 'Ticket', width: '100px' },
    {
      key: 'category',
      header: 'Categoría',
      render: (r: VisitorRecord) => r.visitorCategory?.name ?? '—',
    },
    { key: 'quantity', header: 'Cant.', width: '60px' },
    {
      key: 'fullName',
      header: 'Nombre',
      render: (r: VisitorRecord) => r.fullName ?? '—',
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (r: VisitorRecord) => formatCurrency(r.totalAmount),
    },
    {
      key: 'checkInAt',
      header: 'Ingreso',
      render: (r: VisitorRecord) => formatDateTime(r.checkInAt),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: VisitorRecord) =>
        r.checkOutAt ? (
          <Badge variant="gray">Salió</Badge>
        ) : (
          <Badge variant="green">Adentro</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (r: VisitorRecord) => (
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
              onClick={() => navigate(`/cobro/VISITANTE/${r.id}`)}
            >
              Cobrar
            </Button>
          )}
          {canCheckout && !r.checkOutAt && (
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
        title="Registro de visitantes"
        subtitle={`${summary?.total ?? 0} visitantes hoy`}
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              + Nuevo visitante
            </Button>
          ) : undefined
        }
      />

      {/* Resumen del día */}
      <div className={styles.summaryRow}>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Visitantes hoy</div>
          <div className={styles.sumValue}>{summary?.total ?? 0}</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Dentro ahora</div>
          <div className={styles.sumValue}>{summary?.inside ?? 0}</div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Total recaudado</div>
          <div className={styles.sumValue}>{formatCurrency(summary?.totalAmount ?? 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <SearchBar key={searchKey} placeholder="Nombre, ticket, identificación…" onSearch={(q) => { setFilterSearch(q); setPage(1) }} />
        <div style={{ width: 150 }}><Input label="Desde" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 150 }}><Input label="Hasta" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 170 }}>
          <Select
            label="Categoría"
            placeholder="Todas"
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            value={filterCategoryId}
            onChange={(e) => { setFilterCategoryId(e.target.value); setPage(1) }}
          />
        </div>
        {hasFilters && <Button variant="ghost" onClick={clearFilters}>✕ Limpiar</Button>}
      </div>

      {/* Tabla */}
      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Sin visitantes registrados"
            description="Registra el primer visitante del día."
          />
        ) : (
          <>
            <Table columns={columns} data={rows} keyExtractor={(r) => r.id} />
            <div style={{ padding: '0 10px' }}>
              <PaginationBar meta={meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Modal formulario SIGAP */}
      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editId ? 'Editar visitante' : 'Nuevo visitante — SIGAP'}
        size="wide"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? 'Guardando…'
                : editId ? 'Actualizar' : 'Registrar visitante'}
            </Button>
          </>
        }
      >
        {(createMutation.isError || updateMutation.isError) && (
          <div
            style={{
              background: 'var(--danger-light)',
              border: '0.5px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: 'var(--text-sm)',
              color: 'var(--danger-text)',
              marginBottom: 12,
            }}
          >
            {getApiErrorMessage(createMutation.error ?? updateMutation.error, 'Error al guardar')}
          </div>
        )}

        {/* Categoría + cantidad + extranjero */}
        <div className={styles.formGrid2}>
          <Select
            label="Categoría de visitante *"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="— Seleccionar —"
            error={errors.visitorCategoryId?.message}
            {...register('visitorCategoryId')}
            onChange={(e) => {
              register('visitorCategoryId').onChange(e)
              setTimeout(handleQtyOrRateChange, 50)
            }}
          />
          <Input
            label="Cantidad"
            type="number"
            min="1"
            defaultValue="1"
            error={errors.quantity?.message}
            {...register('quantity', {
              onChange: handleQtyOrRateChange,
            })}
          />
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
                onChange={(e) => {
                  field.onChange(e.target.checked)
                  setTimeout(handleQtyOrRateChange, 50)
                }}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span>
                Visitante extranjero
                {resolvedTariff && (
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                    (nacional: {resolvedTariff ? `Q${resolvedTariff.amountLocal}` : '—'} / extranjero: {resolvedTariff ? `Q${resolvedTariff.amountForeign}` : '—'})
                  </span>
                )}
              </span>
            </label>
          )}
        />

        {/* Tarifa */}
        <div className={styles.formGrid2}>
          <Input
            label="Tarifa aplicada (Q)"
            type="number"
            step="0.01"
            min="0"
            hint={resolvedTariff ? `Tarifa: ${resolvedTariff.name} — ${watchIsForeign ? 'extranjero' : 'nacional'}` : undefined}
            error={errors.appliedRate?.message}
            readOnly={!canOverrideTariff}
            style={!canOverrideTariff ? { background: 'var(--surface-raised)', cursor: 'not-allowed' } : undefined}
            {...register('appliedRate', { onChange: canOverrideTariff ? handleQtyOrRateChange : undefined })}
          />
          <div className={styles.ticketBox} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className={styles.ticketRow}>
              <span>Tarifa × cantidad</span>
              <span>
                {formatCurrency(watchRate)} × {watchQty}
              </span>
            </div>
            <div className={styles.ticketTotal}>
              <span>Total</span>
              <span>{formatCurrency(Number(watch('totalAmount') ?? 0))}</span>
            </div>
          </div>
        </div>

        {/* Acompañantes */}
        {!editId && (
          <>
            <div className={styles.divider} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className={styles.sectionLabel} style={{ marginBottom: 0 }}>Acompañantes</div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => appendCompanion({ visitorCategoryId: 0, quantity: 1, isForeign: false, appliedRate: 0, totalAmount: 0 })}
              >
                + Agregar acompañante
              </Button>
            </div>
            {companionFields.map((field, idx) => (
              <CompanionRow
                key={field.id}
                index={idx}
                control={control}
                setValue={setValue}
                categories={categories}
                remove={() => removeCompanion(idx)}
              />
            ))}
            {companionFields.length > 0 && (
              <CompanionGrandTotal control={control} watchRate={watchRate} watchQty={watchQty} />
            )}
          </>
        )}

        <div className={styles.divider} />

        {/* Procedencia */}
        <div className={styles.sectionLabel}>Procedencia</div>
        <div className={styles.formGrid3}>
          <Select
            label="País"
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="— País —"
            {...register('countryId')}
          />
          <Select
            label="Departamento"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="— Departamento —"
            {...register('departmentId')}
          />
          <Select
            label="Municipio"
            options={municipalities.map((m) => ({ value: m.id, label: m.name }))}
            placeholder={watchDept ? '— Municipio —' : '(selecciona depto.)'}
            disabled={!watchDept}
            {...register('municipalityId')}
          />
        </div>

        <div className={styles.formGrid3}>
          <Input label="Nacionalidad" placeholder="Guatemalteco..." {...register('nationality')} />
          <Select
            label="Tipo identificación"
            options={[
              { value: 'DPI', label: 'DPI' },
              { value: 'PASAPORTE', label: 'Pasaporte' },
              { value: 'OTRO', label: 'Otro' },
            ]}
            placeholder="— Tipo —"
            {...register('identificationType')}
          />
          <Input
            label="Número identificación"
            placeholder="0000 00000 0000"
            {...register('identificationNumber')}
          />
        </div>

        <div className={styles.formGrid3}>
          <Input label="Nombre completo (opcional)" placeholder="Juan García..." {...register('fullName')} />
          <Select
            label="Fuente de información"
            options={infoSources.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="— Cómo nos conoció —"
            {...register('infoSourceId')}
          />
          <Select
            label="Tipo de viaje"
            options={travelTypes.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="— Tipo de viaje —"
            {...register('travelTypeId')}
          />
        </div>

        <div className={styles.formGrid3}>
          <Select
            label="Género"
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'NE', label: 'No especifica' },
            ]}
            placeholder="— Género —"
            {...register('gender')}
          />
          <Select
            label="Rango de edad"
            options={[
              { value: '0-12', label: '0–12 años' },
              { value: '13-17', label: '13–17 años' },
              { value: '18-29', label: '18–29 años' },
              { value: '30-59', label: '30–59 años' },
              { value: '60+', label: '60+ años' },
            ]}
            placeholder="— Rango —"
            {...register('ageRange')}
          />
          <Select
            label="Tipo de visita"
            options={[
              { value: 'INDIVIDUAL', label: 'Individual' },
              { value: 'GRUPO', label: 'Grupo' },
              { value: 'FAMILIA', label: 'Familia' },
            ]}
            placeholder="— Tipo —"
            {...register('visitType')}
          />
        </div>

        <div className={styles.divider} />

        {/* Motivos de visita */}
        {reasons.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Motivos de visita</div>
            <Controller
              control={control}
              name="reasonIds"
              defaultValue={[]}
              render={({ field }) => (
                <div className={styles.chipGrid} style={{ marginBottom: 12 }}>
                  {reasons.map((r) => {
                    const selected = (field.value ?? []).includes(r.id)
                    return (
                      <button
                        type="button"
                        key={r.id}
                        className={[styles.chip, selected ? styles.selected : ''].filter(Boolean).join(' ')}
                        onClick={() => {
                          const cur = field.value ?? []
                          field.onChange(
                            selected ? cur.filter((x) => x !== r.id) : [...cur, r.id],
                          )
                        }}
                      >
                        <span
                          style={{
                            width: 13,
                            height: 13,
                            border: '0.5px solid',
                            borderRadius: 3,
                            background: selected ? 'var(--primary)' : 'var(--bg)',
                            borderColor: selected ? 'var(--primary)' : 'var(--border-medium)',
                            flexShrink: 0,
                          }}
                        />
                        {r.name}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </>
        )}

        {/* Actividades */}
        {activities.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Actividades</div>
            <Controller
              control={control}
              name="activityIds"
              defaultValue={[]}
              render={({ field }) => (
                <div className={styles.chipGrid} style={{ marginBottom: 12 }}>
                  {activities.map((a) => {
                    const selected = (field.value ?? []).includes(a.id)
                    return (
                      <button
                        type="button"
                        key={a.id}
                        className={[styles.chip, selected ? styles.selected : ''].filter(Boolean).join(' ')}
                        onClick={() => {
                          const cur = field.value ?? []
                          field.onChange(
                            selected ? cur.filter((x) => x !== a.id) : [...cur, a.id],
                          )
                        }}
                      >
                        <span
                          style={{
                            width: 13,
                            height: 13,
                            border: '0.5px solid',
                            borderRadius: 3,
                            background: selected ? 'var(--primary)' : 'var(--bg)',
                            borderColor: selected ? 'var(--primary)' : 'var(--border-medium)',
                            flexShrink: 0,
                          }}
                        />
                        {a.name}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </>
        )}

        <Textarea
          label="Observaciones"
          placeholder="Notas adicionales..."
          {...register('observations')}
        />
      </Modal>
    </div>
  )
}

// ─── Companion sub-components ────────────────────────────────────────────────

interface CompanionRowProps {
  index: number
  control: Control<FormValues>
  setValue: UseFormSetValue<FormValues>
  categories: { id: number; name: string }[]
  remove: () => void
}

function CompanionRow({ index, control, setValue, categories, remove }: CompanionRowProps) {
  const categoryId = useWatch({ control, name: `companions.${index}.visitorCategoryId` })
  const isForeign = useWatch({ control, name: `companions.${index}.isForeign` }) ?? false
  const qty = useWatch({ control, name: `companions.${index}.quantity` }) ?? 1

  const { data: tariff } = useQuery({
    queryKey: ['tariffs/resolve/companion', categoryId, index],
    queryFn: () =>
      tariffsApi.resolve({
        appliesTo: 'VISITANTE',
        visitorCategoryId: Number(categoryId),
        date: todayISO(),
      }),
    enabled: !!categoryId && Number(categoryId) > 0,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!tariff) return
    const rate = isForeign ? tariff.amountForeign : tariff.amountLocal
    setValue(`companions.${index}.appliedRate`, rate)
    setValue(`companions.${index}.totalAmount`, parseFloat((rate * (Number(qty) || 1)).toFixed(2)))
  }, [tariff, isForeign, qty, index, setValue])

  const rate = useWatch({ control, name: `companions.${index}.appliedRate` }) ?? 0
  const subtotal = parseFloat((Number(rate) * (Number(qty) || 1)).toFixed(2))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px auto 100px auto',
        gap: 8,
        alignItems: 'flex-end',
        marginBottom: 8,
        padding: '8px 10px',
        background: 'var(--surface-raised)',
        borderRadius: 'var(--radius-md)',
        border: '0.5px solid var(--border-light)',
      }}
    >
      <Controller
        control={control}
        name={`companions.${index}.visitorCategoryId`}
        render={({ field }) => (
          <Select
            label={index === 0 ? 'Categoría' : undefined}
            placeholder="— Categoría —"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={String(field.value ?? '')}
            onChange={(e) => field.onChange(Number(e.target.value))}
          />
        )}
      />
      <Controller
        control={control}
        name={`companions.${index}.quantity`}
        render={({ field }) => (
          <Input
            label={index === 0 ? 'Cant.' : undefined}
            type="number"
            min="1"
            value={String(field.value ?? 1)}
            onChange={(e) => field.onChange(Number(e.target.value))}
          />
        )}
      />
      <Controller
        control={control}
        name={`companions.${index}.isForeign`}
        render={({ field }) => (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              paddingBottom: 4,
            }}
          >
            {index === 0 && <span style={{ color: 'var(--text-secondary)' }}>Extranj.</span>}
            <input
              type="checkbox"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
              style={{ width: 15, height: 15 }}
            />
          </label>
        )}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: 4,
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          textAlign: 'right',
        }}
      >
        {index === 0 && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>
            Subtotal
          </span>
        )}
        {tariff ? formatCurrency(subtotal) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
        <Button type="button" size="sm" variant="danger" onClick={remove}>✕</Button>
      </div>
    </div>
  )
}

interface CompanionGrandTotalProps {
  control: Control<FormValues>
  watchRate: number
  watchQty: number
}

function CompanionGrandTotal({ control, watchRate, watchQty }: CompanionGrandTotalProps) {
  const companions = useWatch({ control, name: 'companions' }) ?? []
  const companionTotal = companions.reduce((sum, c) => sum + (Number(c?.totalAmount) || 0), 0)
  const primarySubtotal = parseFloat((Number(watchRate) * (Number(watchQty) || 1)).toFixed(2))
  const grandTotal = parseFloat((primarySubtotal + companionTotal).toFixed(2))

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 16,
        padding: '8px 10px',
        borderTop: '1px solid var(--border-light)',
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        Principal: {formatCurrency(primarySubtotal)}
        {' + '}
        Acompañantes: {formatCurrency(companionTotal)}
      </span>
      <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>
        Total: {formatCurrency(grandTotal)}
      </span>
    </div>
  )
}
