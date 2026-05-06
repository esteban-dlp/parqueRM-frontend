import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { cashApi } from '@/api/cash.api'
import { catalogsApi } from '@/api/catalogs.api'
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
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import type { FinancialMovement } from '@/types/cash'
import type { PaginatedMeta } from '@/types/api'
import styles from './CashPage.module.css'

const createSchema = z.object({
  movementType: z.enum(['INGRESO', 'EGRESO']),
  conceptId: z.coerce.number().min(1, 'Selecciona concepto'),
  paymentMethodId: z.coerce.number().min(1, 'Selecciona método'),
  amount: z.coerce.number().min(0.01, 'Monto requerido'),
  description: z.string().optional(),
})
type CreateFormValues = z.infer<typeof createSchema>

export default function CashPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterMovementType, setFilterMovementType] = useState('')
  const [filterPaymentMethodId, setFilterPaymentMethodId] = useState('')
  const qc = useQueryClient()
  const toast = useToast()

  const canCreate = usePermission(PERMISSIONS.CAJA_CREATE_MOVEMENT)
  const canCancel = usePermission(PERMISSIONS.CAJA_CANCEL_MOVEMENT)

  const { data, isLoading } = useQuery({
    queryKey: ['cash/movements', page, filterFrom, filterTo, filterMovementType, filterPaymentMethodId],
    queryFn: () => cashApi.listMovements({
      page, limit: 20,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      movementType: (filterMovementType as 'INGRESO' | 'EGRESO') || undefined,
      paymentMethodId: filterPaymentMethodId ? Number(filterPaymentMethodId) : undefined,
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['cash/today-summary'],
    queryFn: cashApi.todaySummary,
  })

  const { data: concepts = [] } = useQuery({
    queryKey: ['catalogs/financial-concepts'],
    queryFn: () => catalogsApi.financialConcepts.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['catalogs/payment-methods'],
    queryFn: () => catalogsApi.paymentMethods.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    watch: watchCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate, isSubmitting: isCreating },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema) as unknown as Resolver<CreateFormValues>,
    defaultValues: { movementType: 'INGRESO' },
  })

  const { register: registerCancel, handleSubmit: handleCancelSubmit, reset: resetCancel } =
    useForm<{ reason: string }>()

  const watchType = watchCreate('movementType')
  const filteredConcepts = concepts.filter((c) => c.type === watchType)

  const createMutation = useMutation({
    mutationFn: cashApi.createMovement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash'] })
      setShowCreate(false)
      resetCreate()
      toast.success('Movimiento registrado correctamente')
    },
    onError: () => toast.error('Error al registrar movimiento'),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      cashApi.cancelMovement(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash'] })
      setCancelId(null)
      resetCancel()
      toast.success('Movimiento anulado')
    },
    onError: () => toast.error('Error al anular movimiento'),
  })

  async function onCreateSubmit(values: CreateFormValues) {
    await createMutation.mutateAsync({
      movementType: values.movementType,
      conceptId: Number(values.conceptId),
      paymentMethodId: Number(values.paymentMethodId),
      originType: 'MOVIMIENTO_MANUAL',
      amount: Number(values.amount),
      description: values.description || undefined,
    })
  }

  async function onCancelSubmit(values: { reason: string }) {
    if (!cancelId) return
    await cancelMutation.mutateAsync({ id: cancelId, reason: values.reason })
  }

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    {
      key: 'movementType',
      header: 'Tipo',
      render: (r: FinancialMovement) =>
        r.movementType === 'INGRESO' ? (
          <Badge variant="green">Ingreso</Badge>
        ) : (
          <Badge variant="red">Egreso</Badge>
        ),
      width: '90px',
    },
    {
      key: 'concept',
      header: 'Concepto',
      render: (r: FinancialMovement) => r.concept?.name ?? '—',
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (r: FinancialMovement) => (
        <span
          style={{
            fontWeight: 500,
            color: r.movementType === 'INGRESO' ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {r.movementType === 'INGRESO' ? '+' : '-'}{formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Método',
      render: (r: FinancialMovement) => r.paymentMethod?.name ?? '—',
    },
    {
      key: 'originType',
      header: 'Origen',
      render: (r: FinancialMovement) => <Badge variant="gray">{r.originType}</Badge>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: FinancialMovement) =>
        r.status === 'CANCELADO' ? (
          <Badge variant="red">Cancelado</Badge>
        ) : (
          <Badge variant="green">Activo</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (r: FinancialMovement) => formatDateTime(r.createdAt),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (r: FinancialMovement) => (
        <TableActions>
          {canCancel && r.status === 'ACTIVO' && r.originType === 'MOVIMIENTO_MANUAL' && (
            <Button size="sm" variant="danger" onClick={() => setCancelId(r.id)}>
              Anular
            </Button>
          )}
        </TableActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Caja"
        subtitle="Movimientos financieros del día"
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              + Nuevo movimiento
            </Button>
          ) : undefined
        }
      />

      <div className={styles.summaryRow}>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Ingresos</div>
          <div className={[styles.sumValue, styles.sumIn].join(' ')}>
            {formatCurrency(summary?.totalIncome ?? 0)}
          </div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Egresos</div>
          <div className={[styles.sumValue, styles.sumOut].join(' ')}>
            {formatCurrency(summary?.totalExpenses ?? 0)}
          </div>
        </div>
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Neto del día</div>
          <div className={styles.sumValue}>{formatCurrency(summary?.netTotal ?? 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div style={{ width: 150 }}><Input label="Desde" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 150 }}><Input label="Hasta" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 140 }}>
          <Select
            label="Tipo"
            placeholder="Todos"
            options={[{ value: 'INGRESO', label: 'Ingreso' }, { value: 'EGRESO', label: 'Egreso' }]}
            value={filterMovementType}
            onChange={(e) => { setFilterMovementType(e.target.value); setPage(1) }}
          />
        </div>
        <div style={{ width: 170 }}>
          <Select
            label="Método de pago"
            placeholder="Todos"
            options={paymentMethods.map(m => ({ value: m.id, label: m.name }))}
            value={filterPaymentMethodId}
            onChange={(e) => { setFilterPaymentMethodId(e.target.value); setPage(1) }}
          />
        </div>
        {(filterFrom || filterTo || filterMovementType || filterPaymentMethodId) && (
          <Button variant="ghost" onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterMovementType(''); setFilterPaymentMethodId(''); setPage(1) }}>✕ Limpiar</Button>
        )}
      </div>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="💰" title="Sin movimientos" description="No hay movimientos registrados hoy." />
        ) : (
          <>
            <Table columns={columns} data={rows} keyExtractor={(r) => r.id} />
            <div style={{ padding: '0 10px' }}>
              <PaginationBar meta={meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Modal crear movimiento */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); resetCreate() }}
        title="Nuevo movimiento manual"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); resetCreate() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleCreateSubmit(onCreateSubmit)}
              disabled={isCreating || createMutation.isPending}
            >
              {isCreating || createMutation.isPending ? 'Guardando…' : 'Registrar'}
            </Button>
          </>
        }
      >
        {createMutation.isError && (
          <div className={styles.errorBox}>
            {createMutation.error instanceof Error ? createMutation.error.message : 'Error'}
          </div>
        )}
        <div className={styles.formGrid2}>
          <Select
            label="Tipo"
            options={[
              { value: 'INGRESO', label: 'Ingreso' },
              { value: 'EGRESO', label: 'Egreso' },
            ]}
            {...registerCreate('movementType')}
          />
          <Select
            label="Concepto *"
            options={filteredConcepts.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="— Seleccionar —"
            error={errorsCreate.conceptId?.message}
            {...registerCreate('conceptId')}
          />
        </div>
        <div className={styles.formGrid2}>
          <Select
            label="Método de pago *"
            options={paymentMethods.map((m) => ({ value: m.id, label: m.name }))}
            placeholder="— Seleccionar —"
            error={errorsCreate.paymentMethodId?.message}
            {...registerCreate('paymentMethodId')}
          />
          <Input
            label="Monto (Q) *"
            type="number"
            step="0.01"
            min="0.01"
            error={errorsCreate.amount?.message}
            {...registerCreate('amount')}
          />
        </div>
        <Textarea label="Descripción" placeholder="Detalle del movimiento..." {...registerCreate('description')} />
      </Modal>

      {/* Modal anular */}
      <Modal
        isOpen={cancelId !== null}
        onClose={() => { setCancelId(null); resetCancel() }}
        title="Anular movimiento"
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCancelId(null); resetCancel() }}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={handleCancelSubmit(onCancelSubmit)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Anulando…' : 'Confirmar anulación'}
            </Button>
          </>
        }
      >
        <Input label="Motivo *" placeholder="Describe el motivo..." {...registerCancel('reason', { required: true })} />
      </Modal>
    </div>
  )
}
