import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { cashApi } from '@/api/cash.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Table } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import type { CashClosure } from '@/types/cash'
import type { PaginatedMeta } from '@/types/api'
import styles from './ClosuresPage.module.css'

export default function ClosuresPage() {
  const [page, setPage] = useState(1)
  const [showClose, setShowClose] = useState(false)
  const [detailClosure, setDetailClosure] = useState<CashClosure | null>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const canClose = usePermission(PERMISSIONS.CAJA_CLOSE)

  const { data, isLoading } = useQuery({
    queryKey: ['cash/closures', page],
    queryFn: () => cashApi.listClosures({ page, limit: 20 }),
  })

  const { data: preview } = useQuery({
    queryKey: ['cash/closures/preview'],
    queryFn: cashApi.previewClosure,
    refetchInterval: 60_000,
  })

  const { register, handleSubmit, reset } = useForm<{ observations?: string }>()

  const createMutation = useMutation({
    mutationFn: cashApi.createClosure,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash/closures'] })
      qc.invalidateQueries({ queryKey: ['cash/closures/preview'] })
      setShowClose(false)
      reset()
      toast.success('Cierre de caja realizado correctamente')
    },
    onError: () => toast.error('Error al realizar cierre de caja'),
  })

  async function onSubmit(values: { observations?: string }) {
    await createMutation.mutateAsync({ observations: values.observations || undefined })
  }

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    {
      key: 'closedAt',
      header: 'Fecha cierre',
      render: (r: CashClosure) => formatDateTime(r.closedAt),
    },
    {
      key: 'totalIncome',
      header: 'Ingresos',
      render: (r: CashClosure) => (
        <span style={{ color: 'var(--success)', fontWeight: 500 }}>
          {formatCurrency(r.totalIncome)}
        </span>
      ),
    },
    {
      key: 'totalExpenses',
      header: 'Egresos',
      render: (r: CashClosure) => (
        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
          {formatCurrency(r.totalExpenses)}
        </span>
      ),
    },
    {
      key: 'netTotal',
      header: 'Neto',
      render: (r: CashClosure) => <span style={{ fontWeight: 600 }}>{formatCurrency(r.netTotal)}</span>,
    },
    {
      key: 'closedByUser',
      header: 'Cerrado por',
      render: (r: CashClosure) => r.closedByUser?.fullName ?? '—',
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (r: CashClosure) => (
        <Button size="sm" variant="ghost" onClick={() => setDetailClosure(r)}>
          Detalles
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Cierres de caja"
        subtitle="Historial de cierres"
        actions={
          canClose ? (
            <Button variant="primary" onClick={() => setShowClose(true)}>
              Cerrar caja hoy
            </Button>
          ) : undefined
        }
      />

      {/* Preview del día actual */}
      {preview && (
        <div className={styles.previewCard}>
          <div className={styles.previewTitle}>Resumen pendiente (sin cerrar)</div>
          <div className={styles.previewRow}>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Ingresos</span>
              <span className={[styles.previewValue, styles.valueIn].join(' ')}>
                {formatCurrency(preview.totalIncome)}
              </span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Egresos</span>
              <span className={[styles.previewValue, styles.valueOut].join(' ')}>
                {formatCurrency(preview.totalExpenses)}
              </span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Neto</span>
              <span className={styles.previewValue}>{formatCurrency(preview.netTotal)}</span>
            </div>
          </div>
        </div>
      )}

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="🔒" title="Sin cierres" description="Aún no se han realizado cierres de caja." />
        ) : (
          <>
            <Table columns={columns} data={rows} keyExtractor={(r) => r.id} />
            <div style={{ padding: '0 10px' }}>
              <PaginationBar meta={meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Modal confirmar cierre */}
      <Modal
        isOpen={showClose}
        onClose={() => { setShowClose(false); reset() }}
        title="Cerrar caja"
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowClose(false); reset() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Cerrando…' : 'Confirmar cierre'}
            </Button>
          </>
        }
      >
        {preview && (
          <div className={styles.modalSummary}>
            <div className={styles.modalSummaryRow}>
              <span>Ingresos totales</span>
              <span style={{ color: 'var(--success)' }}>{formatCurrency(preview.totalIncome)}</span>
            </div>
            <div className={styles.modalSummaryRow}>
              <span>Egresos totales</span>
              <span style={{ color: 'var(--danger)' }}>{formatCurrency(preview.totalExpenses)}</span>
            </div>
            <div className={[styles.modalSummaryRow, styles.modalSummaryTotal].join(' ')}>
              <span>Neto</span>
              <span>{formatCurrency(preview.netTotal)}</span>
            </div>
          </div>
        )}
        <Textarea
          label="Notas de cierre (opcional)"
          placeholder="Observaciones del cierre..."
          {...register('observations')}
        />
      </Modal>

      {/* Modal detalles */}
      <Modal
        isOpen={detailClosure !== null}
        onClose={() => setDetailClosure(null)}
        title={`Detalle cierre — ${detailClosure ? formatDateTime(detailClosure.closedAt) : ''}`}
        footer={
          <Button variant="secondary" onClick={() => setDetailClosure(null)}>Cerrar</Button>
        }
      >
        {detailClosure && (
          <div>
            <div className={styles.detailRow}>
              <span>Ingresos</span>
              <span style={{ color: 'var(--success)' }}>{formatCurrency(detailClosure.totalIncome)}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Egresos</span>
              <span style={{ color: 'var(--danger)' }}>{formatCurrency(detailClosure.totalExpenses)}</span>
            </div>
            <div className={[styles.detailRow, styles.detailTotal].join(' ')}>
              <span>Neto</span>
              <span>{formatCurrency(detailClosure.netTotal)}</span>
            </div>
            {detailClosure.observations && (
              <div className={styles.detailNotes}>{detailClosure.observations}</div>
            )}
            {detailClosure.details && detailClosure.details.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className={styles.detailSectionLabel}>Desglose por método de pago</div>
                {detailClosure.details.map((d) => (
                  <div key={d.id} className={styles.detailSubRow}>
                    <span>{d.paymentMethod?.name ?? d.concept?.name ?? '—'}</span>
                    <span>{formatCurrency(d.totalIncome - d.totalExpenses)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
