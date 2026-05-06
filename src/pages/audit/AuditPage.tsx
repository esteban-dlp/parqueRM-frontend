import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDateTime, todayISO } from '@/utils/formatters'
import type { AuditLog } from '@/types/audit'
import type { PaginatedMeta } from '@/types/api'
import styles from './AuditPage.module.css'

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(todayISO())
  const [entityFilter, setEntityFilter] = useState('')
  const [detail, setDetail] = useState<AuditLog | null>(null)

  const params = {
    page,
    limit: 30,
    from: from || undefined,
    to: to || undefined,
    entityName: entityFilter || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.list(params),
  })

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (r: AuditLog) => formatDateTime(r.createdAt),
      width: '140px',
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (r: AuditLog) => r.user?.username ?? (r.userId ? `ID:${r.userId}` : '—'),
    },
    { key: 'action', header: 'Acción', width: '100px' },
    { key: 'entityName', header: 'Entidad' },
    {
      key: 'entityId',
      header: 'ID',
      render: (r: AuditLog) => String(r.entityId ?? '—'),
      width: '60px',
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (r: AuditLog) => r.ipAddress ?? '—',
      width: '110px',
    },
    {
      key: 'detail',
      header: '',
      width: '70px',
      render: (r: AuditLog) => (
        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Ver</Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Auditoría" subtitle="Registro de acciones del sistema" />

      <Card style={{ marginBottom: 14 }}>
        <div className={styles.filterRow}>
          <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input
            label="Entidad"
            placeholder="VisitorRecord, User..."
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
      </Card>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="🔍" title="Sin registros" description="No hay entradas en el rango seleccionado." />
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
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.action} — ${detail.entityName} #${detail.entityId}` : ''}
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Cerrar</Button>}
      >
        {detail && (
          <div>
            <div className={styles.detailMeta}>
              <span>Usuario</span>
              <span>{detail.user?.fullName ?? detail.user?.username ?? '—'}</span>
            </div>
            <div className={styles.detailMeta}>
              <span>IP</span>
              <span>{detail.ipAddress ?? '—'}</span>
            </div>
            <div className={styles.detailMeta}>
              <span>Fecha</span>
              <span>{formatDateTime(detail.createdAt)}</span>
            </div>
            {detail.oldValues && (
              <div style={{ marginTop: 12 }}>
                <div className={styles.jsonLabel}>Valores anteriores</div>
                <pre className={styles.jsonBox}>{JSON.stringify(detail.oldValues, null, 2)}</pre>
              </div>
            )}
            {detail.newValues && (
              <div style={{ marginTop: 10 }}>
                <div className={styles.jsonLabel}>Valores nuevos</div>
                <pre className={styles.jsonBox}>{JSON.stringify(detail.newValues, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
