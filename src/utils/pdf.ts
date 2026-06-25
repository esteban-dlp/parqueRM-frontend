import { getServerBaseUrl } from '@/api/client'
import type { ParkConfig } from '@/types/parkConfig'
import type { Receipt } from '@/types/receipts'
import type { CashByPaymentMethodReport, IncomeByOriginReport, SurveyReport } from '@/types/reports'
import { formatDate, formatDateTime, toNum } from './formatters'

type JsPDF = import('jspdf').jsPDF
type ReportTab = 'general' | 'visitors' | 'vehicles' | 'lodging' | 'income' | 'receipts' | 'cashByPaymentMethod' | 'incomeByOrigin' | 'surveys'
type Row = Record<string, unknown>
type DetailField = [string, unknown]

interface ReportPdfOpts {
  tab: ReportTab
  from: string
  to: string
  general?: Row
  visitors?: Row[]
  vehicles?: Row[]
  lodging?: Row[]
  income?: Row[]
  receipts?: Row[]
  cashByPaymentMethod?: CashByPaymentMethodReport
  incomeByOrigin?: IncomeByOriginReport
  surveyReport?: SurveyReport
  parkConfig?: ParkConfig | null
}

function fmtQ(amount: unknown): string {
  return `Q ${toNum(amount).toFixed(2)}`
}

function empty(value: unknown): string {
  if (value == null || value === '') return '-'
  return String(value)
}

function yesNo(value: unknown): string {
  return value ? 'Si' : 'No'
}

const ORIGIN_TYPE_LABELS: Record<string, string> = {
  VISITANTE: 'Visitantes',
  VEHICULO: 'Vehiculos',
  HOSPEDAJE: 'Hospedaje',
  SERVICIO_GENERAL: 'Servicios generales',
  MOVIMIENTO_MANUAL: 'Movimiento manual',
}

function originTypeLabel(value: unknown): string {
  const key = String(value ?? '')
  return ORIGIN_TYPE_LABELS[key] ?? key
}

const SURVEY_EMOJIS = ['😡', '😕', '😐', '🙂', '😄']

function surveyDominantAnswerLabel(answerType: unknown, value: unknown): string {
  const n = Number(value)
  if (answerType === 'EMOJI') return SURVEY_EMOJIS[n - 1] ?? String(n)
  return String(n)
}

function relName(value: unknown): string {
  return empty((value as { name?: unknown } | null | undefined)?.name)
}

function relNameOr(value: unknown, fallback: unknown): string {
  const name = (value as { name?: unknown } | null | undefined)?.name
  return name == null || name === '' ? empty(fallback) : String(name)
}

function userName(value: unknown): string {
  const user = value as { fullName?: unknown; username?: unknown } | null | undefined
  return empty(user?.fullName ?? user?.username)
}

function listNames(value: unknown): string {
  const items = Array.isArray(value) ? value : []
  const names = items
    .map((item) => (item as { name?: unknown })?.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
  return names.length ? names.join(', ') : '-'
}

function truncate(value: unknown, max = 110): string {
  const text = empty(value)
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function dateValue(value: unknown): string {
  return typeof value === 'string' ? formatDate(value) : value instanceof Date ? formatDate(value.toISOString()) : empty(value)
}

function dateTimeValue(value: unknown): string {
  return typeof value === 'string'
    ? formatDateTime(value)
    : value instanceof Date
      ? formatDateTime(value.toISOString())
      : empty(value)
}

function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || 200, h: img.naturalHeight || 80 })
    img.onerror = () => resolve({ w: 200, h: 80 })
    img.src = dataUrl
  })
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (res.ok) {
      const blob = await res.blob()
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
      if (dataUrl) return dataUrl
    }
  } catch {
    // Try canvas fallback below.
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 200
        canvas.height = img.naturalHeight || 80
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL())
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function drawHeader(doc: JsPDF, title: string, parkConfig?: ParkConfig | null): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth()
  const parkName = parkConfig?.parkName ?? 'Parque Nacional'
  const parkSubtitle = parkConfig?.parkSubtitle ?? ''
  const phone = parkConfig?.phone ?? ''
  const address = parkConfig?.address ?? ''
  const email = parkConfig?.email ?? ''
  let y = 10

  if (parkConfig?.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(`${getServerBaseUrl()}${parkConfig.logoUrl}`)
    if (dataUrl) {
      const imgFmt = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')
        ? 'JPEG'
        : dataUrl.startsWith('data:image/webp')
          ? 'WEBP'
          : 'PNG'
      const dims = await getImageDimensions(dataUrl)
      const scale = Math.min(50 / dims.w, 20 / dims.h)
      const logoW = parseFloat((dims.w * scale).toFixed(2))
      const logoH = parseFloat((dims.h * scale).toFixed(2))
      doc.addImage(dataUrl, imgFmt, (pageW - logoW) / 2, y, logoW, logoH)
      y += logoH + 3
    }
  }

  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(parkName, pageW / 2, y + 5, { align: 'center' })
  y += 9

  if (parkSubtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(parkSubtitle, pageW / 2, y, { align: 'center' })
    y += 4
  }

  const contactParts = [address, phone ? `Tel: ${phone}` : '', email].filter(Boolean)
  if (contactParts.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100)
    doc.text(contactParts.join('  |  '), pageW / 2, y, { align: 'center' })
    doc.setTextColor(0)
    y += 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(title, pageW / 2, y + 2, { align: 'center' })
  const lineY = y + 6
  doc.setDrawColor(180, 180, 180)
  doc.line(14, lineY, pageW - 14, lineY)
  return lineY + 6
}

function drawFooter(doc: JsPDF) {
  const pageH = doc.internal.pageSize.getHeight()
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text(`Generado el ${formatDateTime(new Date().toISOString())} - ParqueRM`, pageW / 2, pageH - 8, { align: 'center' })
  doc.setTextColor(0)
}

function ensurePage(doc: JsPDF, y: number, needed = 14): number {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + needed < pageH - 14) return y
  drawFooter(doc)
  doc.addPage()
  return 18
}

function row(doc: JsPDF, label: string, value: string, y: number, labelX = 14, valueX = 80): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(label, labelX, y)
  doc.setFont('helvetica', 'normal')
  doc.text(value, valueX, y)
  return y + 6
}

function drawReceiptLines(doc: JsPDF, receipt: Receipt, y: number): number {
  const pageW = doc.internal.pageSize.getWidth()
  y = ensurePage(doc, y, 18)
  doc.setFillColor(245, 245, 245)
  doc.rect(14, y - 4, pageW - 28, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Descripcion', 16, y)
  doc.text('Cant.', 125, y, { align: 'right' })
  doc.text('Precio unit.', 155, y, { align: 'right' })
  doc.text('Total', pageW - 14, y, { align: 'right' })
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const line of receipt.lines) {
    y = ensurePage(doc, y, 10)
    const qty = toNum(line.quantity)
    const unitPrice = qty > 0 ? toNum(line.total) / qty : toNum(line.unitPrice)
    const descLines = doc.splitTextToSize(line.description ?? '-', 100)
    doc.text(descLines, 16, y)
    doc.text(String(qty), 125, y, { align: 'right' })
    doc.text(fmtQ(unitPrice), 155, y, { align: 'right' })
    doc.text(fmtQ(line.total), pageW - 14, y, { align: 'right' })
    y += Math.max(6, descLines.length * 4)
  }
  return y
}

export async function downloadReceiptPdf(receipt: Receipt, parkConfig?: ParkConfig | null): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = await drawHeader(doc, 'TICKET DE PAGO', parkConfig)

  y = row(doc, 'No. ticket:', receipt.receiptNumber, y)
  if (parkConfig?.ticketVersion) y = row(doc, 'Version ticket:', parkConfig.ticketVersion, y)
  if (parkConfig?.ruv) y = row(doc, 'RUV:', parkConfig.ruv, y)
  y = row(doc, 'Fecha y hora:', dateTimeValue(receipt.receiptDate ?? receipt.createdAt), y)
  y = row(doc, 'Contribuyente:', receipt.contributorName ?? 'Consumidor final', y)
  if (receipt.contributorDocument) y = row(doc, 'Documento:', receipt.contributorDocument, y)
  if (receipt.paymentMethod?.name) y = row(doc, 'Metodo de pago:', receipt.paymentMethod.name, y)
  y += 4

  y = drawReceiptLines(doc, receipt, y)
  y = ensurePage(doc, y, 36)
  y += 2
  doc.line(14, y, pageW - 14, y)
  y += 6

  if (receipt.discountAmount != null && toNum(receipt.discountAmount) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (receipt.subtotal != null) {
      doc.text('Subtotal:', 14, y)
      doc.text(fmtQ(receipt.subtotal), pageW - 14, y, { align: 'right' })
      y += 5
    }
    const discountLabel = receipt.discountType === 'PERCENTAGE' && receipt.discountPercentage
      ? `Descuento (${receipt.discountPercentage}%):`
      : receipt.discountType === 'AMOUNT'
        ? 'Descuento (Q fijo):'
        : 'Descuento:'
    doc.text(discountLabel, 14, y)
    doc.text(`-${fmtQ(receipt.discountAmount)}`, pageW - 14, y, { align: 'right' })
    y += 5
    if (receipt.discountReason) {
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(doc.splitTextToSize(`Motivo: ${receipt.discountReason}`, pageW - 30), 16, y)
      doc.setTextColor(0)
      y += 5
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL', 14, y)
  doc.text(fmtQ(receipt.total), pageW - 14, y, { align: 'right' })
  y += 6

  if (receipt.amountReceived != null && toNum(receipt.amountReceived) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Monto recibido:', 14, y)
    doc.text(fmtQ(receipt.amountReceived), pageW - 14, y, { align: 'right' })
    y += 5
    if (receipt.changeAmount != null && toNum(receipt.changeAmount) > 0) {
      doc.text('Cambio entregado:', 14, y)
      doc.text(fmtQ(receipt.changeAmount), pageW - 14, y, { align: 'right' })
      y += 5
    }
  }

  y = ensurePage(doc, y, 14)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Este ticket es valido como comprobante de pago.', pageW / 2, y + 8, { align: 'center' })
  doc.setTextColor(0)
  drawFooter(doc)

  doc.save(`ticket-${receipt.receiptNumber.replace(/\//g, '-')}.pdf`)
}

function drawSummaryRows(doc: JsPDF, rows: [string, string][], y: number): number {
  const pageW = doc.internal.pageSize.getWidth()
  for (const [label, value] of rows) {
    y = ensurePage(doc, y, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(label, 16, y)
    doc.text(value, pageW - 14, y, { align: 'right' })
    y += 5
  }
  return y
}

function drawDetailBlock(doc: JsPDF, title: string, fields: DetailField[], y: number): number {
  const pageW = doc.internal.pageSize.getWidth()
  y = ensurePage(doc, y, 16)
  doc.setFillColor(245, 245, 245)
  doc.rect(14, y - 4, pageW - 28, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(title, 16, y)
  y += 8

  for (const [label, rawValue] of fields) {
    const value = truncate(rawValue)
    const labelText = `${label}:`
    const valueLines = doc.splitTextToSize(value, pageW - 74)
    y = ensurePage(doc, y, Math.max(6, valueLines.length * 4))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(labelText, 16, y)
    doc.setFont('helvetica', 'normal')
    doc.text(valueLines, 64, y)
    y += Math.max(5, valueLines.length * 4)
  }
  return y + 4
}

function visitorFields(r: Row): DetailField[] {
  return [
    ['Fecha registro', dateValue(r.recordDate)],
    ['Ingreso', dateTimeValue(r.checkInAt)],
    ['Salida', dateTimeValue(r.checkOutAt)],
    ['Categoria', relNameOr(r.visitorCategory, r.categoryName)],
    ['Es extranjero', yesNo(r.isForeign)],
    ['Tarifa aplicada', fmtQ(r.appliedRate)],
    ['Cantidad', r.quantity],
    ['Total', fmtQ(r.totalAmount)],
    ['Pais', relName(r.country)],
    ['Departamento', relName(r.department)],
    ['Municipio', relName(r.municipality)],
    ['Nacionalidad', r.nationality],
    ['Tipo identificacion', r.identificationType],
    ['Numero identificacion', r.identificationNumber],
    ['Nombre completo', r.fullName],
    ['Fuente informacion', relName(r.infoSource)],
    ['Tipo viaje', relName(r.travelType)],
    ['Genero', r.gender],
    ['Rango edad', r.ageRange],
    ['Tipo visita', r.visitType],
    ['Motivos visita', listNames(r.visitReasons)],
    ['Actividades', listNames(r.visitActivities)],
    ['Observaciones', r.observations],
    ['--- Salud del visitante', ''],
    ['Alergico a medicamento', yesNo(r.hasMedicationAllergy)],
    ...(r.hasMedicationAllergy ? [['Medicamento', r.medicationAllergyDetail || 'No especificado'] as DetailField] : []),
    ['Diabetico', yesNo(r.hasDiabetes)],
    ['Hipertension arterial', yesNo(r.hasHypertension)],
    ['Asma u enfermedad respiratoria', yesNo(r.hasRespiratoryDisease)],
    ['Alergico a picadura de animal', yesNo(r.hasAnimalBiteAllergy)],
    ...(r.hasAnimalBiteAllergy ? [['Animal', r.animalBiteAllergyDetail || 'No especificado'] as DetailField] : []),
  ]
}

function vehicleFields(r: Row): DetailField[] {
  return [
    ['Tipo vehiculo', relName(r.vehicleType)],
    ['Placa', r.plateNumber],
    ['Vehiculo extranjero', yesNo(r.isForeign)],
    ['Tarifa aplicada', fmtQ(r.appliedRate)],
    ['Total', fmtQ(r.totalAmount)],
    ['Ingreso', dateTimeValue(r.checkInAt)],
    ['Salida', dateTimeValue(r.checkOutAt)],
    ['Salida habilitada', yesNo(r.exitEnabled)],
    ['Tarifa', relName(r.tariff)],
    ['Visitante relacionado', (r.visitorRecord as { ticketNumber?: unknown } | null | undefined)?.ticketNumber],
    ['Observaciones', r.observations],
  ]
}

function lodgingFields(r: Row): DetailField[] {
  return [
    ['Tipo hospedaje', relName(r.lodgingType)],
    ['Fecha registro', dateValue(r.recordDate)],
    ['Noches', r.nights],
    ['Huespedes', r.guests],
    ['Es extranjero', yesNo(r.isForeign)],
    ['Tarifa aplicada', fmtQ(r.appliedRate)],
    ['Total', fmtQ(r.totalAmount)],
    ['Tarifa', relName(r.tariff)],
    ['Observaciones', r.observations],
  ]
}

function incomeFields(r: Row): DetailField[] {
  return [
    ['Concepto', relNameOr(r.concept, r.conceptName)],
    ['Metodo de pago', relNameOr(r.paymentMethod, r.paymentMethodName)],
    ['Origen', r.originType],
    ['ID origen', r.originId],
    ['Ticket relacionado', (r.receipt as { receiptNumber?: unknown } | null | undefined)?.receiptNumber ?? r.receiptId],
    ['Monto', fmtQ(r.amount ?? r.total)],
    ['Estado', r.status],
    ['Fecha movimiento', dateTimeValue(r.movementDate)],
    ['Creado', dateTimeValue(r.createdAt)],
    ['Creado por', userName(r.createdByUser)],
    ['Descripcion', r.description],
  ]
}

function receiptFields(r: Row): DetailField[] {
  return [
    ['Contribuyente', r.contributorName],
    ['Documento', r.contributorDocument],
    ['Direccion', r.contributorAddress],
    ['Origen', r.originType],
    ['ID origen', r.originId],
    ['Metodo de pago', relName(r.paymentMethod)],
    ['Subtotal', r.subtotal == null ? '-' : fmtQ(r.subtotal)],
    ['Tipo descuento', r.discountType],
    ['Descuento porcentaje', r.discountPercentage],
    ['Descuento monto', fmtQ(r.discountAmount)],
    ['Motivo descuento', r.discountReason],
    ['Total', fmtQ(r.total)],
    ['Recibido', r.amountReceived == null ? '-' : fmtQ(r.amountReceived)],
    ['Cambio', r.changeAmount == null ? '-' : fmtQ(r.changeAmount)],
    ['Referencia pago', r.paymentReference],
    ['Estado', r.status],
    ['Emitido', dateTimeValue(r.receiptDate ?? r.createdAt)],
    ['Emitido por', userName(r.createdByUser)],
    ['Anulado', dateTimeValue(r.cancelledAt)],
    ['Motivo anulacion', r.cancelReason],
  ]
}

function drawRowsAsDetails(doc: JsPDF, rows: Row[], getTitle: (row: Row, index: number) => string, getFields: (row: Row) => DetailField[], y: number): number {
  for (let i = 0; i < rows.length; i += 1) {
    y = drawDetailBlock(doc, getTitle(rows[i], i), getFields(rows[i]), y)
  }
  return y
}

export async function downloadReportPdf(opts: ReportPdfOpts): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const tabLabels: Record<ReportTab, string> = {
    general: 'Reporte General',
    visitors: 'Reporte de Visitantes',
    vehicles: 'Reporte de Vehiculos',
    lodging: 'Reporte de Hospedaje',
    income: 'Reporte de Ingresos',
    receipts: 'Reporte de Tickets',
    cashByPaymentMethod: 'Cierre Diario por Medio de Pago',
    incomeByOrigin: 'Ingresos por Tipo de Origen',
    surveys: 'Reporte de Encuestas',
  }
  let y = await drawHeader(doc, tabLabels[opts.tab], opts.parkConfig)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(`Periodo: ${opts.from} al ${opts.to}`, 14, y)
  doc.setTextColor(0)
  y += 8

  if (opts.tab === 'general' && opts.general) {
    y = drawSummaryRows(doc, [
      ['Visitantes', empty(opts.general.totalVisitors)],
      ['Vehiculos', empty(opts.general.totalVehicles)],
      ['Hospedaje', empty(opts.general.totalLodging)],
      ['Ingresos', fmtQ(opts.general.totalIncome)],
      ['Egresos', fmtQ(opts.general.totalExpense)],
      ['Neto', fmtQ(opts.general.net)],
    ], y)
  } else if (opts.tab === 'visitors' && opts.visitors?.length) {
    y = drawRowsAsDetails(doc, opts.visitors, (r, i) => `Visitante ${i + 1} - ${empty(r.ticketNumber)}`, visitorFields, y)
  } else if (opts.tab === 'vehicles' && opts.vehicles?.length) {
    y = drawRowsAsDetails(doc, opts.vehicles, (r, i) => `Vehiculo ${i + 1} - ${empty(r.plateNumber)}`, vehicleFields, y)
  } else if (opts.tab === 'lodging' && opts.lodging?.length) {
    y = drawRowsAsDetails(doc, opts.lodging, (r, i) => `Hospedaje ${i + 1} - ${relName(r.lodgingType)}`, lodgingFields, y)
  } else if (opts.tab === 'income' && opts.income?.length) {
    y = drawRowsAsDetails(doc, opts.income, (r, i) => `Ingreso ${i + 1} - ${fmtQ(r.amount ?? r.total)}`, incomeFields, y)
  } else if (opts.tab === 'cashByPaymentMethod' && opts.cashByPaymentMethod?.data.length) {
    const { data, paymentMethods, grandTotal } = opts.cashByPaymentMethod
    for (const r of data) {
      const amounts = (r.amounts ?? {}) as Record<string, number>
      const rows: [string, string][] = paymentMethods.map((m) => [m, fmtQ(amounts[m] ?? 0)])
      rows.push(['Total del dia', fmtQ(r.total)])
      y = drawDetailBlock(doc, dateValue(r.date), [], y)
      y = drawSummaryRows(doc, rows, y)
    }
    y = ensurePage(doc, y, 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL GENERAL', 14, y)
    doc.text(fmtQ(grandTotal), doc.internal.pageSize.getWidth() - 14, y, { align: 'right' })
  } else if (opts.tab === 'incomeByOrigin' && opts.incomeByOrigin?.data.length) {
    const { data, grandTotal, grandCount } = opts.incomeByOrigin
    y = drawSummaryRows(doc, data.map((r) => [`${originTypeLabel(r.originType)} (${empty(r.count)} operaciones)`, fmtQ(r.total)]), y)
    y = ensurePage(doc, y, 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`TOTAL GENERAL (${grandCount} operaciones)`, 14, y)
    doc.text(fmtQ(grandTotal), doc.internal.pageSize.getWidth() - 14, y, { align: 'right' })
  } else if (opts.tab === 'surveys' && opts.surveyReport?.data.length) {
    y = drawRowsAsDetails(
      doc,
      opts.surveyReport.data as unknown as Row[],
      (r, i) => `Pregunta ${i + 1} - ${empty(r.question)}`,
      (r) => [
        ['Ocurrencias', empty(r.occurrences)],
        ['Respuesta con mayor valor', surveyDominantAnswerLabel(r.answerType, r.dominantValue)],
        ['Ocurrencias de esa respuesta', empty(r.dominantCount)],
        ['Porcentaje', `${empty(r.percentage)}%`],
      ],
      y,
    )
  } else if (opts.tab === 'receipts' && opts.receipts?.length) {
    y = drawRowsAsDetails(doc, opts.receipts, (r, i) => `Ticket ${i + 1} - ${empty(r.receiptNumber)}`, (r) => {
      const fields = receiptFields(r)
      const lines = (Array.isArray(r.lines) ? r.lines : []) as Row[]
      fields.push(['Lineas', lines.length
        ? lines.map((line) => `${empty(line.description)} x ${empty(line.quantity)} = ${fmtQ(line.total)}`).join('; ')
        : '-'])
      return fields
    }, y)
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('Sin datos en el rango seleccionado.', doc.internal.pageSize.getWidth() / 2, y + 10, { align: 'center' })
    doc.setTextColor(0)
  }

  drawFooter(doc)
  const tabFiles: Record<ReportTab, string> = {
    general: 'resumen',
    visitors: 'visitantes',
    vehicles: 'vehiculos',
    lodging: 'hospedaje',
    income: 'ingresos',
    receipts: 'tickets',
    cashByPaymentMethod: 'cierre-medio-pago',
    incomeByOrigin: 'ingresos-por-tipo',
    surveys: 'encuestas',
  }
  doc.save(`reporte-${tabFiles[opts.tab]}-${opts.from}.pdf`)
}
