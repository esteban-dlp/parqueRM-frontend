import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports.api'
import { parkConfigApi } from '@/api/parkConfig.api'
import { downloadReportPdf } from '@/utils/pdf'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Table } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { PERMISSIONS } from '@/utils/permissions'
import { formatCurrency, formatDate, todayISO } from '@/utils/formatters'
import type { ReportVisitorRow, GeneralReport } from '@/types/reports'
import styles from './ReportsPage.module.css'

async function downloadXlsx(sheetData: Record<string, unknown>[], filename: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, filename)
}

type TabKey = 'general' | 'visitors' | 'vehicles' | 'lodging' | 'income' | 'receipts'

const TAB_LABELS: Record<TabKey, string> = {
  general: 'General',
  visitors: 'Visitantes',
  vehicles: 'Vehículos',
  lodging: 'Hospedaje',
  income: 'Ingresos (Caja)',
  receipts: 'Transacciones',
}

export default function ReportsPage() {
  const canExport = usePermission(PERMISSIONS.REPORTES_EXPORT)
  const toast = useToast()
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

  const { data: vehiclesData, isLoading: loadingVehicles } = useQuery({
    queryKey: ['reports/vehicles', params],
    queryFn: () => reportsApi.vehicles(params),
    enabled: tab === 'vehicles',
  })

  const { data: lodgingData, isLoading: loadingLodging } = useQuery({
    queryKey: ['reports/lodging', params],
    queryFn: () => reportsApi.lodging(params),
    enabled: tab === 'lodging',
  })

  const { data: incomeData, isLoading: loadingIncome } = useQuery({
    queryKey: ['reports/income', params],
    queryFn: () => reportsApi.income(params),
    enabled: tab === 'income',
  })

  const { data: receiptsData, isLoading: loadingReceipts } = useQuery({
    queryKey: ['reports/receipts', params],
    queryFn: () => reportsApi.receipts(params),
    enabled: tab === 'receipts',
  })

  const { data: parkConfig } = useQuery({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  async function handleExportExcel() {
    if (tab === 'visitors') {
      const rows = (visitorsData?.data ?? []) as unknown as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      const flat = rows.map((r) => ({
        Ticket: r.ticketNumber,
        Nombre: r.fullName ?? '—',
        Categoría: r.categoryName,
        Cantidad: r.quantity,
        'Total Q': r.totalAmount,
        Ingreso: r.checkInAt,
        Salida: r.checkOutAt ?? '—',
      }))
      await downloadXlsx(flat, `visitantes-${from}.xlsx`)
    } else if (tab === 'vehicles') {
      const rows = (vehiclesData?.data ?? []) as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      const flat = rows.map((r) => ({
        Placa: r.plateNumber ?? '—',
        Tipo: (r.vehicleType as { name?: string } | null)?.name ?? '—',
        'Tarifa Q': r.appliedRate,
        'Total Q': r.totalAmount,
        Ingreso: r.checkInAt,
        Salida: r.checkOutAt ?? '—',
      }))
      await downloadXlsx(flat, `vehiculos-${from}.xlsx`)
    } else if (tab === 'lodging') {
      const rows = (lodgingData?.data ?? []) as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      const flat = rows.map((r) => ({
        Tipo: (r.lodgingType as { name?: string } | null)?.name ?? '—',
        Fecha: r.recordDate,
        Noches: r.nights,
        Huéspedes: r.guests,
        'Tarifa Q': r.appliedRate,
        'Total Q': r.totalAmount,
      }))
      await downloadXlsx(flat, `hospedaje-${from}.xlsx`)
    } else if (tab === 'income') {
      const rows = (incomeData?.data ?? []) as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      const flat = rows.map((r) => ({
        Concepto: (r.concept as { name?: string } | null)?.name ?? String(r.conceptName ?? ''),
        'Método de pago': (r.paymentMethod as { name?: string } | null)?.name ?? String(r.paymentMethodName ?? ''),
        'Monto Q': r.amount ?? r.total ?? 0,
      }))
      await downloadXlsx(flat, `ingresos-${from}.xlsx`)
    } else if (tab === 'receipts') {
      const rows = (receiptsData?.data ?? []) as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      const flat = rows.map((r) => ({
        'No. Recibo': r.receiptNumber,
        Contribuyente: r.contributorName ?? '—',
        Origen: r.originType,
        'Método de pago': (r.paymentMethod as { name?: string } | null)?.name ?? '—',
        'Total Q': r.total,
        Estado: r.status,
        Fecha: r.receiptDate ?? r.createdAt,
      }))
      await downloadXlsx(flat, `transacciones-${from}.xlsx`)
    } else if (tab === 'general' && general) {
      const rows = [
        { Indicador: 'Visitantes', Valor: general.totalVisitors },
        { Indicador: 'Vehículos', Valor: general.totalVehicles },
        { Indicador: 'Hospedaje', Valor: general.totalLodging },
        { Indicador: 'Ingresos (Q)', Valor: general.totalIncome },
        { Indicador: 'Egresos (Q)', Valor: general.totalExpense },
        { Indicador: 'Neto (Q)', Valor: general.net },
      ]
      await downloadXlsx(rows, `resumen-${from}.xlsx`)
    }
  }

  async function handleExportPdf() {
    await downloadReportPdf({
      tab,
      from,
      to,
      general: general as unknown as Record<string, unknown> | undefined,
      visitors: (visitorsData?.data ?? []) as unknown as Record<string, unknown>[],
      vehicles: (vehiclesData?.data ?? []) as Record<string, unknown>[],
      lodging: (lodgingData?.data ?? []) as Record<string, unknown>[],
      income: (incomeData?.data ?? []) as Record<string, unknown>[],
      receipts: (receiptsData?.data ?? []) as Record<string, unknown>[],
      parkConfig,
    })
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

  const vehicleColumns = [
    { key: 'plateNumber', header: 'Placa', width: '100px', render: (r: Record<string, unknown>) => String(r.plateNumber ?? '—') },
    {
      key: 'vehicleType',
      header: 'Tipo',
      render: (r: Record<string, unknown>) => {
        const vt = r.vehicleType as { name?: string } | null | undefined
        return String(vt?.name ?? '—')
      },
    },
    {
      key: 'appliedRate',
      header: 'Tarifa',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.appliedRate ?? 0)),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.totalAmount ?? 0)),
    },
    {
      key: 'checkInAt',
      header: 'Ingreso',
      render: (r: Record<string, unknown>) => formatDate(r.checkInAt as string),
    },
    {
      key: 'checkOutAt',
      header: 'Salida',
      render: (r: Record<string, unknown>) => formatDate(r.checkOutAt as string | null),
    },
  ]

  const lodgingColumns = [
    {
      key: 'lodgingType',
      header: 'Tipo',
      render: (r: Record<string, unknown>) => {
        const lt = r.lodgingType as { name?: string } | null | undefined
        return String(lt?.name ?? '—')
      },
    },
    { key: 'recordDate', header: 'Fecha', render: (r: Record<string, unknown>) => String(r.recordDate ?? '—') },
    { key: 'nights', header: 'Noches', width: '70px', render: (r: Record<string, unknown>) => String(r.nights ?? '—') },
    { key: 'guests', header: 'Huésp.', width: '70px', render: (r: Record<string, unknown>) => String(r.guests ?? '—') },
    {
      key: 'appliedRate',
      header: 'Tarifa',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.appliedRate ?? 0)),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.totalAmount ?? 0)),
    },
  ]

  const incomeRows = (incomeData?.data ?? []) as Record<string, unknown>[]

  const incomeColumns = [
    {
      key: 'concept',
      header: 'Concepto',
      render: (r: Record<string, unknown>) => {
        const c = r.concept as { name?: string } | null | undefined
        return String(c?.name ?? r.conceptName ?? '—')
      },
    },
    {
      key: 'paymentMethod',
      header: 'Método',
      render: (r: Record<string, unknown>) => {
        const pm = r.paymentMethod as { name?: string } | null | undefined
        return String(pm?.name ?? r.paymentMethodName ?? '—')
      },
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.amount ?? r.total ?? 0)),
    },
  ]

  const receiptsRows = (receiptsData?.data ?? []) as Record<string, unknown>[]

  const receiptsColumns = [
    { key: 'receiptNumber', header: 'No. Recibo', width: '120px', render: (r: Record<string, unknown>) => String(r.receiptNumber ?? '—') },
    { key: 'originType', header: 'Origen', render: (r: Record<string, unknown>) => <Badge variant="blue">{String(r.originType ?? '—')}</Badge> },
    {
      key: 'paymentMethod',
      header: 'Método',
      render: (r: Record<string, unknown>) => {
        const pm = r.paymentMethod as { name?: string } | null | undefined
        return String(pm?.name ?? '—')
      },
    },
    {
      key: 'total',
      header: 'Total',
      render: (r: Record<string, unknown>) => formatCurrency(Number(r.total ?? 0)),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r: Record<string, unknown>) =>
        r.status === 'CANCELADO'
          ? <Badge variant="red">Cancelado</Badge>
          : <Badge variant="green">Activo</Badge>,
    },
    {
      key: 'receiptDate',
      header: 'Fecha',
      render: (r: Record<string, unknown>) => formatDate((r.receiptDate ?? r.createdAt) as string),
    },
  ]

  const isLoading =
    (tab === 'general' && loadingGeneral) ||
    (tab === 'visitors' && loadingVisitors) ||
    (tab === 'vehicles' && loadingVehicles) ||
    (tab === 'lodging' && loadingLodging) ||
    (tab === 'income' && loadingIncome) ||
    (tab === 'receipts' && loadingReceipts)

  const vehicleRows = (vehiclesData?.data ?? []) as Record<string, unknown>[]
  const lodgingRows = (lodgingData?.data ?? []) as Record<string, unknown>[]

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
        {(Object.keys(TAB_LABELS) as TabKey[]).map((t) => (
          <button
            key={t}
            type="button"
            className={[styles.tab, tab === t ? styles.tabActive : ''].filter(Boolean).join(' ')}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
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
          {tab === 'vehicles' && (
            <Card padding="flush">
              {!vehicleRows.length ? (
                <EmptyState icon="🚗" title="Sin datos" description="No hay vehículos en el rango seleccionado." />
              ) : (
                <Table
                  columns={vehicleColumns}
                  data={vehicleRows}
                  keyExtractor={(r) => String(r.id)}
                />
              )}
            </Card>
          )}
          {tab === 'lodging' && (
            <Card padding="flush">
              {!lodgingRows.length ? (
                <EmptyState icon="🏕️" title="Sin datos" description="No hay hospedajes en el rango seleccionado." />
              ) : (
                <Table
                  columns={lodgingColumns}
                  data={lodgingRows}
                  keyExtractor={(r) => String(r.id)}
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
          {tab === 'receipts' && (
            <Card padding="flush">
              {!receiptsRows.length ? (
                <EmptyState icon="🧾" title="Sin transacciones" description="No hay recibos en el rango seleccionado." />
              ) : (
                <Table
                  columns={receiptsColumns}
                  data={receiptsRows}
                  keyExtractor={(r) => String(r.id)}
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
  const hasData = report.totalVisitors > 0 || report.totalVehicles > 0 || report.totalLodging > 0 || report.totalIncome > 0
  if (!hasData) {
    return <EmptyState icon="📊" title="Sin datos" description="No hay datos en el rango seleccionado." />
  }
  return (
    <div className={styles.generalGrid}>
      <Card>
        <div className={styles.sectionTitle}>Registros del período</div>
        <div className={styles.reportRow}>
          <span>Visitantes</span>
          <span className={styles.reportRowRight}>
            <span className={styles.reportCount}>{report.totalVisitors}</span>
          </span>
        </div>
        <div className={styles.reportRow}>
          <span>Vehículos</span>
          <span className={styles.reportRowRight}>
            <span className={styles.reportCount}>{report.totalVehicles}</span>
          </span>
        </div>
        <div className={styles.reportRow}>
          <span>Hospedaje</span>
          <span className={styles.reportRowRight}>
            <span className={styles.reportCount}>{report.totalLodging}</span>
          </span>
        </div>
      </Card>

      <Card>
        <div className={styles.sectionTitle}>Resumen financiero (movimientos manuales)</div>
        <div className={styles.reportRow}>
          <span>Ingresos</span>
          <span style={{ color: 'var(--success)', fontWeight: 500 }}>{formatCurrency(report.totalIncome)}</span>
        </div>
        <div className={styles.reportRow}>
          <span>Egresos</span>
          <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{formatCurrency(report.totalExpense)}</span>
        </div>
        <div className={[styles.reportRow, styles.reportRowTotal].join(' ')}>
          <span>Neto</span>
          <span>{formatCurrency(report.net)}</span>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 8 }}>
          Los recibos de cobro no se incluyen aquí — solo movimientos de Caja.
        </p>
      </Card>
    </div>
  )
}
