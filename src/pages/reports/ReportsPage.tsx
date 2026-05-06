import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDate, todayISO } from '@/utils/formatters'
import type { ReportVisitorRow, GeneralReport } from '@/types/reports'
import styles from './ReportsPage.module.css'

type TabKey = 'general' | 'visitors' | 'income'

export default function ReportsPage() {
  const canExport = usePermission(PERMISSIONS.REPORTES_EXPORT)
  const [tab, setTab] = useState<TabKey>('general')

  const today = todayISO()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)

  const params = { from, to }

  const { data: general, isLoading: loadingGeneral } = useQuery({
    queryKey: ['reports/general', params],
    queryFn: () => reportsApi.general(params),
    enabled: tab === 'general',
  })

  const { data: visitorsData, isLoading: loadingVisitors } = useQuery({
    queryKey: ['reports/visitors', params],
    queryFn: () => reportsApi.visitors(params),
    enabled: tab === 'visitors',
  })

  const { data: incomeData, isLoading: loadingIncome } = useQuery({
    queryKey: ['reports/income', params],
    queryFn: () => reportsApi.income(params),
    enabled: tab === 'income',
  })

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportExcel() {
    const res = tab === 'visitors'
      ? await reportsApi.exportVisitorsExcel(params)
      : tab === 'income'
        ? await reportsApi.exportIncomeExcel(params)
        : await reportsApi.exportGeneralExcel(params)
    downloadBlob(res.data as Blob, `reporte-${tab}-${from}.xlsx`)
  }

  async function handleExportPdf() {
    const res = tab === 'visitors'
      ? await reportsApi.exportVisitorsPdf(params)
      : tab === 'income'
        ? await reportsApi.exportIncomePdf(params)
        : await reportsApi.exportGeneralPdf(params)
    downloadBlob(res.data as Blob, `reporte-${tab}-${from}.pdf`)
  }

  const visitorColumns = [
    { key: 'ticketNumber', header: 'Ticket', width: '100px' },
    { key: 'fullName', header: 'Nombre', render: (r: ReportVisitorRow) => r.fullName ?? '—' },
    { key: 'categoryName', header: 'Categoría' },
    { key: 'quantity', header: 'Cant.', width: '60px' },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (r: ReportVisitorRow) => formatCurrency(r.totalAmount),
    },
    {
      key: 'checkInAt',
      header: 'Ingreso',
      render: (r: ReportVisitorRow) => formatDate(r.checkInAt),
    },
    {
      key: 'checkOutAt',
      header: 'Salida',
      render: (r: ReportVisitorRow) => formatDate(r.checkOutAt),
    },
  ]

  const incomeRows = (incomeData?.data ?? []) as Record<string, unknown>[]

  const incomeColumns = [
    {
      key: 'concept',
      header: 'Concepto',
      render: (r: Record<string, unknown>) => String(r.conceptName ?? r.concept ?? '—'),
    },
    {
      key: 'paymentMethod',
      header: 'Método',
      render: (r: Record<string, unknown>) => String(r.paymentMethodName ?? r.paymentMethod ?? '—'),
    },
    {
      key: 'total',
      header: 'Total',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.total ?? r.amount ?? 0)),
    },
  ]

  const isLoading =
    (tab === 'general' && loadingGeneral) ||
    (tab === 'visitors' && loadingVisitors) ||
    (tab === 'income' && loadingIncome)

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Análisis y exportación de datos" />

      {/* Filtros de fecha */}
      <Card style={{ marginBottom: 16 }}>
        <div className={styles.filterRow}>
          <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {canExport && (
            <div className={styles.exportBtns}>
              <Button variant="secondary" size="sm" onClick={handleExportExcel}>
                Excel
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportPdf}>
                PDF
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['general', 'visitors', 'income'] as TabKey[]).map((t) => (
          <button
            key={t}
            type="button"
            className={[styles.tab, tab === t ? styles.tabActive : ''].filter(Boolean).join(' ')}
            onClick={() => setTab(t)}
          >
            {{ general: 'General', visitors: 'Visitantes', income: 'Ingresos' }[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {tab === 'general' && general && (
            <GeneralReportView report={general} />
          )}
          {tab === 'visitors' && (
            <Card padding="flush">
              {!visitorsData?.data?.length ? (
                <EmptyState icon="📊" title="Sin datos" description="No hay visitantes en el rango seleccionado." />
              ) : (
                <Table
                  columns={visitorColumns}
                  data={visitorsData.data}
                  keyExtractor={(r) => r.id}
                />
              )}
            </Card>
          )}
          {tab === 'income' && (
            <Card padding="flush">
              {!incomeRows.length ? (
                <EmptyState icon="💵" title="Sin ingresos" description="No hay ingresos en el rango seleccionado." />
              ) : (
                <Table
                  columns={incomeColumns}
                  data={incomeRows}
                  keyExtractor={(row) => String(row.conceptName ?? row.concept ?? JSON.stringify(row).slice(0, 30))}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function GeneralReportView({ report }: { report: GeneralReport }) {
  return (
    <div className={styles.generalGrid}>
      {report.visitors && report.visitors.length > 0 && (
        <Card>
          <div className={styles.sectionTitle}>Visitantes por categoría</div>
          {report.visitors.map((v) => (
            <div key={v.categoryName} className={styles.reportRow}>
              <span>{v.categoryName}</span>
              <span className={styles.reportRowRight}>
                <span className={styles.reportCount}>{v.count}</span>
                <span>{formatCurrency(v.total)}</span>
              </span>
            </div>
          ))}
          {report.total != null && (
            <div className={[styles.reportRow, styles.reportRowTotal].join(' ')}>
              <span>Total</span>
              <span>{formatCurrency(report.total)}</span>
            </div>
          )}
        </Card>
      )}

      {report.vehicles && report.vehicles.length > 0 && (
        <Card>
          <div className={styles.sectionTitle}>Vehículos por tipo</div>
          {report.vehicles.map((v) => (
            <div key={v.typeName} className={styles.reportRow}>
              <span>{v.typeName}</span>
              <span className={styles.reportRowRight}>
                <span className={styles.reportCount}>{v.count}</span>
                <span>{formatCurrency(v.total)}</span>
              </span>
            </div>
          ))}
        </Card>
      )}

      {report.income && report.income.length > 0 && (
        <Card>
          <div className={styles.sectionTitle}>Ingresos por concepto</div>
          {report.income.map((i) => (
            <div key={i.conceptName} className={styles.reportRow}>
              <span>{i.conceptName}</span>
              <span>{formatCurrency(i.total)}</span>
            </div>
          ))}
        </Card>
      )}

      {!report.visitors?.length && !report.vehicles?.length && !report.income?.length && (
        <EmptyState icon="📊" title="Sin datos" description="No hay datos en el rango seleccionado." />
      )}
    </div>
  )
}
