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
import { formatCurrency, formatDate, formatDateTime, todayISO } from '@/utils/formatters'
import type { ReportQueryParams, ReportVisitorRow, GeneralReport } from '@/types/reports'
import styles from './ReportsPage.module.css'

async function downloadXlsx(sheetData: Record<string, unknown>[], filename: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, filename)
}

type SheetSpec = { name: string; rows: Record<string, unknown>[] }

async function downloadMultiSheetXlsx(sheets: SheetSpec[], filename: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ '_': 'Sin datos' }])
    // sheet names are limited to 31 chars, no special chars
    const safe = s.name.replace(/[\\\/\?\*\[\]:]/g, '_').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, safe)
  }
  XLSX.writeFile(wb, filename)
}

type TabKey = 'general' | 'visitors' | 'vehicles' | 'lodging' | 'income' | 'receipts'
type ReportListResult = { data: Record<string, unknown>[]; meta?: { totalPages?: number } }
type ExcelExportResult =
  | { filename: string; rows: Record<string, unknown>[] }
  | { filename: string; sheets: SheetSpec[] }

const TAB_LABELS: Record<TabKey, string> = {
  general: 'General',
  visitors: 'Visitantes',
  vehicles: 'Vehículos',
  lodging: 'Hospedaje',
  income: 'Ingresos (Caja)',
  receipts: 'Tickets',
}

async function fetchAllReportRows(
  fetcher: (params?: ReportQueryParams) => Promise<ReportListResult>,
  params: ReportQueryParams,
): Promise<Record<string, unknown>[]> {
  const limit = 100
  const first = await fetcher({ ...params, page: 1, limit })
  const rows = [...(first.data ?? [])]
  const totalPages = first.meta?.totalPages ?? 1
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetcher({ ...params, page, limit })
    rows.push(...(next.data ?? []))
  }
  return rows
}

function nameOf(value: unknown): string {
  return String((value as { name?: unknown } | null | undefined)?.name ?? '')
}

function userOf(value: unknown): string {
  const user = value as { fullName?: unknown; username?: unknown } | null | undefined
  return String(user?.fullName ?? user?.username ?? '')
}

function namesOf(value: unknown): string {
  const items = Array.isArray(value) ? value : []
  return items
    .map((item) => (item as { name?: unknown })?.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .join(', ')
}

function yesNo(value: unknown): string {
  return value ? 'Si' : 'No'
}

function visitorExportRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    'No. ticket': r.ticketNumber ?? '',
    'Fecha registro': formatDate(String(r.recordDate ?? '')),
    Ingreso: formatDateTime(String(r.checkInAt ?? '')),
    Salida: r.checkOutAt ? formatDateTime(String(r.checkOutAt)) : '',
    Categoria: nameOf(r.visitorCategory) || r.categoryName || '',
    'Es extranjero': yesNo(r.isForeign),
    'Tarifa': nameOf(r.tariff),
    'Tarifa aplicada Q': r.appliedRate ?? '',
    Cantidad: r.quantity ?? '',
    'Total Q': r.totalAmount ?? '',
    Pais: nameOf(r.country),
    Departamento: nameOf(r.department),
    Municipio: nameOf(r.municipality),
    Nacionalidad: r.nationality ?? '',
    'Tipo de identificacion': r.identificationType ?? '',
    'Numero de identificacion': r.identificationNumber ?? '',
    'Nombre completo': r.fullName ?? '',
    Email: r.email ?? '',
    'Fuente de informacion': nameOf(r.infoSource),
    'Tipo de viaje': nameOf(r.travelType),
    Genero: r.gender ?? '',
    'Rango de edad': r.ageRange ?? '',
    'Tipo de visita': r.visitType ?? '',
    'Motivos de visita': namesOf(r.visitReasons),
    Actividades: namesOf(r.visitActivities),
    Observaciones: r.observations ?? '',
    Fuente: r.source ?? '',
    'Creado por': userOf(r.createdByUser),
  }
}

function visitorLineExportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const lines: Record<string, unknown>[] = []
  for (const r of rows) {
    lines.push({
      'No. ticket': r.ticketNumber,
      'Tipo linea': 'Principal',
      Categoria: nameOf(r.visitorCategory) || r.categoryName || '',
      Cantidad: r.quantity ?? '',
      'Precio unit Q': r.appliedRate ?? '',
      'Total linea Q': Number(r.appliedRate ?? 0) * Number(r.quantity ?? 1),
      'Es extranjero': yesNo(r.isForeign),
    })
    const companions = (Array.isArray(r.companions) ? r.companions : []) as Record<string, unknown>[]
    for (const c of companions) {
      lines.push({
        'No. ticket': r.ticketNumber,
        'Tipo linea': 'Acompanante',
        Categoria: nameOf(c.visitorCategory),
        Cantidad: c.quantity ?? '',
        'Precio unit Q': c.appliedRate ?? '',
        'Total linea Q': c.totalAmount ?? '',
        'Es extranjero': yesNo(c.isForeign),
      })
    }
  }
  return lines
}

function vehicleExportRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    'Tipo de vehiculo': nameOf(r.vehicleType),
    Placa: r.plateNumber ?? '',
    'Vehiculo extranjero': yesNo(r.isForeign),
    'Tarifa': nameOf(r.tariff),
    'Tarifa aplicada Q': r.appliedRate ?? '',
    'Total Q': r.totalAmount ?? '',
    Ingreso: formatDateTime(String(r.checkInAt ?? '')),
    Salida: r.checkOutAt ? formatDateTime(String(r.checkOutAt)) : '',
    'Salida habilitada': yesNo(r.exitEnabled),
    'Ticket visitante relacionado': (r.visitorRecord as { ticketNumber?: unknown } | null | undefined)?.ticketNumber ?? '',
    Observaciones: r.observations ?? '',
    Fuente: r.source ?? '',
    'Creado por': userOf(r.createdByUser),
  }
}

function lodgingExportRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    'Tipo de hospedaje': nameOf(r.lodgingType),
    'Fecha registro': formatDate(String(r.recordDate ?? '')),
    Noches: r.nights ?? '',
    Huespedes: r.guests ?? '',
    'Es extranjero': yesNo(r.isForeign),
    'Tarifa': nameOf(r.tariff),
    'Tarifa aplicada Q': r.appliedRate ?? '',
    'Total Q': r.totalAmount ?? '',
    Observaciones: r.observations ?? '',
    'Creado por': userOf(r.createdByUser),
  }
}

function incomeExportRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    Concepto: nameOf(r.concept) || r.conceptName || '',
    'Metodo de pago': nameOf(r.paymentMethod) || r.paymentMethodName || '',
    Origen: r.originType ?? '',
    'ID origen': r.originId ?? '',
    'Ticket relacionado': (r.receipt as { receiptNumber?: unknown } | null | undefined)?.receiptNumber ?? r.receiptId ?? '',
    'Monto Q': r.amount ?? r.total ?? 0,
    Estado: r.status ?? '',
    'Fecha movimiento': formatDateTime(String(r.movementDate ?? r.createdAt ?? '')),
    'Creado por': userOf(r.createdByUser),
    Descripcion: r.description ?? '',
  }
}

function receiptHeaderExportRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    'No. ticket': r.receiptNumber ?? '',
    Contribuyente: r.contributorName ?? '',
    Documento: r.contributorDocument ?? '',
    Direccion: r.contributorAddress ?? '',
    Origen: r.originType ?? '',
    'ID origen': r.originId ?? '',
    'Metodo de pago': nameOf(r.paymentMethod),
    'Subtotal Q': r.subtotal ?? '',
    'Tipo descuento': r.discountType ?? '',
    'Descuento %': r.discountPercentage ?? '',
    'Descuento Q': r.discountAmount ?? 0,
    'Motivo descuento': r.discountReason ?? '',
    'Total Q': r.total ?? '',
    Recibido: r.amountReceived ?? '',
    Cambio: r.changeAmount ?? '',
    'Referencia pago': r.paymentReference ?? '',
    Estado: r.status ?? '',
    Emitido: formatDateTime(String(r.receiptDate ?? r.createdAt ?? '')),
    'Emitido por': userOf(r.createdByUser),
    'Anulado por': userOf(r.cancelledByUser),
    'Fecha anulacion': r.cancelledAt ? formatDateTime(String(r.cancelledAt)) : '',
    'Motivo anulacion': r.cancelReason ?? '',
  }
}

function receiptLineExportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const lines: Record<string, unknown>[] = []
  for (const r of rows) {
    const rowLines = (Array.isArray(r.lines) ? r.lines : []) as Record<string, unknown>[]
    if (!rowLines.length) {
      lines.push({ 'No. ticket': r.receiptNumber, Descripcion: '', Cantidad: '', 'Precio unit Q': '', 'Total linea Q': r.total ?? '' })
      continue
    }
    for (const line of rowLines) {
      lines.push({
        'No. ticket': r.receiptNumber,
        Descripcion: line.description ?? '',
        Cantidad: line.quantity ?? '',
        'Precio unit Q': line.unitPrice ?? '',
        'Total linea Q': line.total ?? '',
      })
    }
  }
  return lines
}

async function buildExcelExport(
  tab: TabKey,
  params: ReportQueryParams,
  general?: GeneralReport,
): Promise<ExcelExportResult | null> {
  if (tab === 'visitors') {
    const rows = await fetchAllReportRows(reportsApi.visitors as unknown as (params?: ReportQueryParams) => Promise<ReportListResult>, params)
    if (!rows.length) return null
    return {
      filename: `visitantes-${params.from}.xlsx`,
      sheets: [
        { name: 'Visitantes', rows: rows.map(visitorExportRow) },
        { name: 'Lineas visitantes', rows: visitorLineExportRows(rows) },
      ],
    }
  }

  if (tab === 'vehicles') {
    const rows = await fetchAllReportRows(reportsApi.vehicles, params)
    if (!rows.length) return null
    return { filename: `vehiculos-${params.from}.xlsx`, rows: rows.map(vehicleExportRow) }
  }

  if (tab === 'lodging') {
    const rows = await fetchAllReportRows(reportsApi.lodging, params)
    if (!rows.length) return null
    return { filename: `hospedaje-${params.from}.xlsx`, rows: rows.map(lodgingExportRow) }
  }

  if (tab === 'income') {
    const rows = await fetchAllReportRows(reportsApi.income, params)
    if (!rows.length) return null
    return { filename: `ingresos-${params.from}.xlsx`, rows: rows.map(incomeExportRow) }
  }

  if (tab === 'receipts') {
    const rows = await fetchAllReportRows(reportsApi.receipts, params)
    if (!rows.length) return null
    return {
      filename: `tickets-${params.from}.xlsx`,
      sheets: [
        { name: 'Tickets', rows: rows.map(receiptHeaderExportRow) },
        { name: 'Lineas de ticket', rows: receiptLineExportRows(rows) },
      ],
    }
  }

  if (tab === 'general' && general) {
    return {
      filename: `resumen-${params.from}.xlsx`,
      rows: [
        { Indicador: 'Visitantes', Valor: general?.totalVisitors ?? 0 },
        { Indicador: 'Vehiculos', Valor: general.totalVehicles },
        { Indicador: 'Hospedaje', Valor: general?.totalLodging ?? 0 },
        { Indicador: 'Ingresos (Q)', Valor: general?.totalIncome ?? 0 },
        { Indicador: 'Egresos (Q)', Valor: general?.totalExpense ?? 0 },
        { Indicador: 'Neto (Q)', Valor: general?.net ?? 0 },
      ],
    }
  }

  return null
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
    const exportResult = await buildExcelExport(tab, params, general)
    if (!exportResult) { toast.error('No hay datos para exportar'); return }
    if ('sheets' in exportResult) {
      await downloadMultiSheetXlsx(exportResult.sheets, exportResult.filename)
    } else {
      await downloadXlsx(exportResult.rows, exportResult.filename)
    }
    return

    if (tab === 'visitors') {
      const rows = (visitorsData?.data ?? []) as unknown as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      // Hoja 1: cabecera por visitante; Hoja 2: cada línea de cobro (principal + acompañantes)
      const headers = rows.map((r) => {
        const companions = (r.companions as unknown as Array<{ totalAmount: number }> | undefined) ?? []
        const companionSum = companions.reduce((s, c) => s + Number(c.totalAmount ?? 0), 0)
        return {
          'No. ticket': r.ticketNumber,
          Nombre: r.fullName ?? '—',
          'Categoría principal': (r.visitorCategory as { name?: string } | undefined)?.name
            ?? (r.categoryName as string | undefined)
            ?? '—',
          'Cant. principal': r.quantity,
          'Tarifa principal Q': r.appliedRate,
          'Acompañantes (líneas)': companions.length,
          'Subtotal acompañantes Q': companionSum,
          'Total Q': r.totalAmount,
          'Es extranjero': r.isForeign ? 'Sí' : 'No',
          Ingreso: r.checkInAt,
          Salida: r.checkOutAt ?? '—',
        }
      })
      const lines: Record<string, unknown>[] = []
      for (const r of rows) {
        lines.push({
          'No. ticket': r.ticketNumber,
          'Tipo línea': 'Principal',
          Categoría: (r.visitorCategory as { name?: string } | undefined)?.name ?? '—',
          Cantidad: r.quantity,
          'Precio unit Q': r.appliedRate,
          'Total línea Q': Number(r.appliedRate ?? 0) * Number(r.quantity ?? 1),
          'Es extranjero': r.isForeign ? 'Sí' : 'No',
        })
        const companions = (r.companions as unknown as Array<{
          visitorCategory?: { name?: string }
          quantity: number
          appliedRate: number
          totalAmount: number
          isForeign?: boolean
        }> | undefined) ?? []
        for (const c of companions) {
          lines.push({
            'No. ticket': r.ticketNumber,
            'Tipo línea': 'Acompañante',
            Categoría: c.visitorCategory?.name ?? '—',
            Cantidad: c.quantity,
            'Precio unit Q': c.appliedRate,
            'Total línea Q': c.totalAmount,
            'Es extranjero': c.isForeign ? 'Sí' : 'No',
          })
        }
      }
      await downloadMultiSheetXlsx(
        [
          { name: 'Visitantes', rows: headers },
          { name: 'Líneas (principal+acomp)', rows: lines },
        ],
        `visitantes-${from}.xlsx`,
      )
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
        Origen: r.originType ?? '—',
        'No. ticket relacionado': r.receiptId ?? '—',
        'Monto Q': r.amount ?? r.total ?? 0,
        Estado: r.status,
        Fecha: r.movementDate ?? r.createdAt,
      }))
      await downloadXlsx(flat, `ingresos-${from}.xlsx`)
    } else if (tab === 'receipts') {
      const rows = (receiptsData?.data ?? []) as Record<string, unknown>[]
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      // Hoja 1: cabecera del ticket; Hoja 2: cada línea
      const headers = rows.map((r) => ({
        'No. ticket': r.receiptNumber,
        Contribuyente: r.contributorName ?? '—',
        Documento: r.contributorDocument ?? '—',
        Origen: r.originType,
        'ID origen': r.originId ?? '—',
        'Método de pago': (r.paymentMethod as { name?: string } | null)?.name ?? '—',
        'Subtotal Q': r.subtotal ?? '—',
        'Descuento Q': r.discountAmount ?? 0,
        'Total Q': r.total,
        Recibido: r.amountReceived ?? '—',
        Cambio: r.changeAmount ?? '—',
        Estado: r.status,
        Emitido: r.receiptDate ?? r.createdAt,
        'Emitido por': (r.createdByUser as { fullName?: string } | undefined)?.fullName ?? '—',
      }))
      const lines: Record<string, unknown>[] = []
      for (const r of rows) {
        const rowLines = (r.lines as Array<{
          description?: string; quantity: number; unitPrice: number; total: number
        }> | undefined) ?? []
        if (!rowLines.length) {
          lines.push({
            'No. ticket': r.receiptNumber,
            Descripción: '—',
            Cantidad: '—',
            'Precio unit Q': '—',
            'Total línea Q': r.total,
          })
          continue
        }
        for (const l of rowLines) {
          lines.push({
            'No. ticket': r.receiptNumber,
            Descripción: l.description ?? '—',
            Cantidad: l.quantity,
            'Precio unit Q': l.unitPrice,
            'Total línea Q': l.total,
          })
        }
      }
      await downloadMultiSheetXlsx(
        [
          { name: 'Tickets', rows: headers },
          { name: 'Líneas de ticket', rows: lines },
        ],
        `tickets-${from}.xlsx`,
      )
    } else if (tab === 'general' && general) {
      const rows = [
        { Indicador: 'Visitantes', Valor: general?.totalVisitors ?? 0 },
        { Indicador: 'Vehículos', Valor: general?.totalVehicles ?? 0 },
        { Indicador: 'Hospedaje', Valor: general?.totalLodging ?? 0 },
        { Indicador: 'Ingresos (Q)', Valor: general?.totalIncome ?? 0 },
        { Indicador: 'Egresos (Q)', Valor: general?.totalExpense ?? 0 },
        { Indicador: 'Neto (Q)', Valor: general?.net ?? 0 },
      ]
      await downloadXlsx(rows, `resumen-${from}.xlsx`)
    }
  }

  async function handleExportPdf() {
    const exportVisitors = tab === 'visitors'
      ? await fetchAllReportRows(reportsApi.visitors as unknown as (params?: ReportQueryParams) => Promise<ReportListResult>, params)
      : ((visitorsData?.data ?? []) as unknown as Record<string, unknown>[])
    const exportVehicles = tab === 'vehicles'
      ? await fetchAllReportRows(reportsApi.vehicles, params)
      : ((vehiclesData?.data ?? []) as Record<string, unknown>[])
    const exportLodging = tab === 'lodging'
      ? await fetchAllReportRows(reportsApi.lodging, params)
      : ((lodgingData?.data ?? []) as Record<string, unknown>[])
    const exportIncome = tab === 'income'
      ? await fetchAllReportRows(reportsApi.income, params)
      : ((incomeData?.data ?? []) as Record<string, unknown>[])
    const exportReceipts = tab === 'receipts'
      ? await fetchAllReportRows(reportsApi.receipts, params)
      : ((receiptsData?.data ?? []) as Record<string, unknown>[])

    await downloadReportPdf({
      tab,
      from,
      to,
      general: general as unknown as Record<string, unknown> | undefined,
      visitors: exportVisitors,
      vehicles: exportVehicles,
      lodging: exportLodging,
      income: exportIncome,
      receipts: exportReceipts,
      parkConfig,
    })
  }

  const visitorColumns = [
    { key: 'ticketNumber', header: 'No. ticket', width: '110px' },
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
    { key: 'receiptNumber', header: 'No. ticket', width: '120px', render: (r: Record<string, unknown>) => String(r.receiptNumber ?? '—') },
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
        r.status === 'ANULADO'
          ? <Badge variant="red">Anulado</Badge>
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
                <EmptyState icon="🧾" title="Sin tickets" description="No hay tickets en el rango seleccionado." />
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
