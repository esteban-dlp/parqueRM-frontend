import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { receiptsApi } from '@/api/receipts.api'
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
import { PaginationBar } from '@/components/shared/PaginationBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import type { Receipt } from '@/types/receipts'
import type { PaginatedMeta } from '@/types/api'

export default function ReceiptsPage() {
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOriginType, setFilterOriginType] = useState('')
  const [filterPaymentMethodId, setFilterPaymentMethodId] = useState('')
  const qc = useQueryClient()
  const toast = useToast()

  const canCancel = usePermission(PERMISSIONS.RECEIPTS_CANCEL)
  const canPrint = usePermission(PERMISSIONS.RECEIPTS_PRINT)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', page, filterFrom, filterTo, filterStatus, filterOriginType, filterPaymentMethodId],
    queryFn: () => receiptsApi.list({
      page, limit: 20,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      status: filterStatus || undefined,
      originType: filterOriginType || undefined,
      paymentMethodId: filterPaymentMethodId ? Number(filterPaymentMethodId) : undefined,
    }),
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['catalogs/payment-methods'],
    queryFn: () => catalogsApi.paymentMethods.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, cancelReason }: { id: number; cancelReason: string }) =>
      receiptsApi.cancel(id, { cancelReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      setCancelId(null)
      resetCancel()
      toast.success('Ticket anulado')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al anular ticket')),
  })

  const printMutation = useMutation({
    mutationFn: (id: number) => receiptsApi.triggerPrint(id),
  })

  const { register: registerCancel, handleSubmit: handleCancelSubmit, reset: resetCancel } = useForm<{ cancelReason: string }>()

  async function onCancelSubmit(values: { cancelReason: string }) {
    if (!cancelId) return
    await cancelMutation.mutateAsync({ id: cancelId, cancelReason: values.cancelReason })
  }

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    { key: 'receiptNumber', header: 'No. ticket', width: '120px' },
    {
      key: 'contributorName',
      header: 'Contribuyente',
      render: (r: Receipt) => r.contributorName ?? '—',
    },
    {
      key: 'originType',
      header: 'Origen',
      render: (r: Receipt) => <Badge variant="blue">{r.originType}</Badge>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (r: Receipt) => formatCurrency(r.total),
    },
    {
      key: 'discount',
      header: 'Descuento',
      render: (r: Receipt) =>
        r.discountAmount && Number(r.discountAmount) > 0
          ? <span style={{ color: 'var(--color-warning)' }}>-{formatCurrency(Number(r.discountAmount))}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Pago',
      render: (r: Receipt) => r.paymentMethod?.name ?? '—',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: Receipt) =>
        r.status === 'CANCELADO' ? (
          <Badge variant="red">Cancelado</Badge>
        ) : (
          <Badge variant="green">Activo</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (r: Receipt) => formatDateTime(r.createdAt),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: Receipt) => (
        <TableActions>
          {canPrint && r.status === 'ACTIVO' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => printMutation.mutate(r.id)}
              disabled={printMutation.isPending}
            >
              Imprimir
            </Button>
          )}
          {canCancel && r.status === 'ACTIVO' && (
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
      <PageHeader title="Tickets" subtitle="Historial de tickets emitidos" />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div style={{ width: 150 }}><Input label="Desde" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 150 }}><Input label="Hasta" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1) }} /></div>
        <div style={{ width: 140 }}>
          <Select
            label="Estado"
            placeholder="Todos"
            options={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'CANCELADO', label: 'Cancelado' }]}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          />
        </div>
        <div style={{ width: 170 }}>
          <Select
            label="Origen"
            placeholder="Todos"
            options={[
              { value: 'VISITANTE', label: 'Visitante' },
              { value: 'VEHICULO', label: 'Vehículo' },
              { value: 'HOSPEDAJE', label: 'Hospedaje' },
              { value: 'SERVICIO_GENERAL', label: 'Servicio general' },
              { value: 'MOVIMIENTO_MANUAL', label: 'Manual' },
            ]}
            value={filterOriginType}
            onChange={(e) => { setFilterOriginType(e.target.value); setPage(1) }}
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
        {(filterFrom || filterTo || filterStatus || filterOriginType || filterPaymentMethodId) && (
          <Button variant="ghost" onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterStatus(''); setFilterOriginType(''); setFilterPaymentMethodId(''); setPage(1) }}>✕ Limpiar</Button>
        )}
      </div>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="🧾" title="Sin tickets" description="Aún no se han emitido tickets." />
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
        isOpen={cancelId !== null}
        onClose={() => { setCancelId(null); resetCancel() }}
        title="Anular ticket"
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCancelId(null); resetCancel() }}>
              Cancelar
            </Button>
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
        <Input
          label="Motivo de anulación *"
          placeholder="Describe el motivo..."
          {...registerCancel('cancelReason', { required: 'Ingresa el motivo' })}
        />
      </Modal>
    </div>
  )
}
