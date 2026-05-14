import { toNum } from './formatters'
import type { Receipt } from '@/types/receipts'

type JsPDF = import('jspdf').jsPDF

const PARK_NAME = 'El Refugio del Quetzal'
const PARK_CODE = 'PRM-SM-001'

function fmtQ(amount: unknown): string {
  return `Q ${toNum(amount).toFixed(2)}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function drawHeader(doc: JsPDF, title: string) {
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(PARK_NAME, pageW / 2, 18, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(PARK_CODE, pageW / 2, 23, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW / 2, 31, { align: 'center' })

  doc.setDrawColor(180, 180, 180)
  doc.line(14, 34, pageW - 14, 34)

  return 40 // y position after header
}

function drawFooter(doc: JsPDF) {
  const pageH = doc.internal.pageSize.getHeight()
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150)
  doc.text(
    `Generado el ${new Date().toLocaleString('es-GT')} — ParqueRM`,
    pageW / 2,
    pageH - 8,
    { align: 'center' },
  )
  doc.setTextColor(0)
}

function row(doc: JsPDF, label: string, value: string, y: number, labelX = 14, valueX = 80): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(label, labelX, y)
  doc.setFont('helvetica', 'normal')
  doc.text(value, valueX, y)
  return y + 6
}

// ─── RECEIPT PDF ────────────────────────────────────────────────────────────

export async function downloadReceiptPdf(receipt: Receipt): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  let y = drawHeader(doc, 'RECIBO DE PAGO')

  // Metadata block
  y = row(doc, 'No. Recibo:', receipt.receiptNumber, y)
  y = row(doc, 'Fecha:', fmtDate(receipt.receiptDate ?? receipt.createdAt), y)
  y = row(doc, 'Contribuyente:', receipt.contributorName ?? 'Consumidor final', y)
  if (receipt.contributorDocument) {
    y = row(doc, 'Documento:', receipt.contributorDocument, y)
  }
  if (receipt.paymentMethod?.name) {
    y = row(doc, 'Método de pago:', receipt.paymentMethod.name, y)
  }
  y += 4

  // Lines table header
  doc.setFillColor(245, 245, 245)
  doc.rect(14, y - 4, pageW - 28, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Descripción', 16, y)
  doc.text('Cant.', 125, y, { align: 'right' })
  doc.text('Precio unit.', 155, y, { align: 'right' })
  doc.text('Total', pageW - 14, y, { align: 'right' })
  y += 5

  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 4

  // Lines
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const line of receipt.lines) {
    const desc = line.description ?? '—'
    const qty = toNum(line.quantity)
    const unitPrice = qty > 0 ? toNum(line.total) / qty : toNum(line.unitPrice)
    doc.text(desc, 16, y)
    doc.text(String(qty), 125, y, { align: 'right' })
    doc.text(fmtQ(unitPrice), 155, y, { align: 'right' })
    doc.text(fmtQ(line.total), pageW - 14, y, { align: 'right' })
    y += 6
  }

  y += 2
  doc.line(14, y, pageW - 14, y)
  y += 6

  // Total block
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

  y += 8
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Este recibo es válido como comprobante de pago.', pageW / 2, y, { align: 'center' })
  doc.setTextColor(0)

  drawFooter(doc)

  const filename = `recibo-${receipt.receiptNumber.replace(/\//g, '-')}.pdf`
  doc.save(filename)
}

// ─── REPORT PDF ─────────────────────────────────────────────────────────────

interface ReportPdfOpts {
  tab: 'general' | 'visitors' | 'income'
  from: string
  to: string
  general?: Record<string, unknown>
  visitors?: Record<string, unknown>[]
  income?: Record<string, unknown>[]
}

export async function downloadReportPdf(opts: ReportPdfOpts): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  const tabLabel = { general: 'Reporte General', visitors: 'Reporte de Visitantes', income: 'Reporte de Ingresos' }[opts.tab]
  let y = drawHeader(doc, tabLabel)

  // Date range
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(`Período: ${opts.from} al ${opts.to}`, 14, y)
  doc.setTextColor(0)
  y += 8

  if (opts.tab === 'general' && opts.general) {
    const g = opts.general as {
      totalVisitors: number; totalVehicles: number; totalLodging: number
      totalIncome: number; totalExpense: number; net: number
    }

    // Registros
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Registros del período', 14, y)
    y += 6

    const regRows = [
      ['Visitantes', String(g.totalVisitors)],
      ['Vehículos', String(g.totalVehicles)],
      ['Hospedaje', String(g.totalLodging)],
    ]
    for (const [label, val] of regRows) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(label, 16, y)
      doc.text(val, pageW - 14, y, { align: 'right' })
      y += 5
    }

    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Resumen financiero', 14, y)
    y += 6

    const finRows: [string, string, string][] = [
      ['Ingresos (Q)', fmtQ(g.totalIncome), '1B5E20'],
      ['Egresos (Q)', fmtQ(g.totalExpense), 'B71C1C'],
      ['Neto (Q)', fmtQ(g.net), '000000'],
    ]
    for (const [label, val, color] of finRows) {
      doc.setFont(label === 'Neto (Q)' ? 'helvetica' : 'helvetica', label === 'Neto (Q)' ? 'bold' : 'normal')
      doc.setFontSize(9)
      doc.text(label, 16, y)
      const c = parseInt(color, 16)
      doc.setTextColor((c >> 16) & 255, (c >> 8) & 255, c & 255)
      doc.text(val, pageW - 14, y, { align: 'right' })
      doc.setTextColor(0)
      y += 5
    }
  } else if (opts.tab === 'visitors' && opts.visitors?.length) {
    // Table headers
    const cols = [
      { label: 'Ticket', x: 14, w: 30 },
      { label: 'Nombre', x: 46, w: 55 },
      { label: 'Categoría', x: 103, w: 35 },
      { label: 'Cant.', x: 140, w: 15 },
      { label: 'Total Q', x: 157, w: 20 },
      { label: 'Ingreso', x: 179, w: 17 },
    ]

    doc.setFillColor(245, 245, 245)
    doc.rect(14, y - 4, pageW - 28, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    for (const col of cols) doc.text(col.label, col.x, y)
    y += 5
    doc.setDrawColor(200)
    doc.line(14, y, pageW - 14, y)
    y += 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    for (const r of opts.visitors) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(String(r.ticketNumber ?? '—'), cols[0].x, y)
      const name = String(r.fullName ?? '—')
      doc.text(name.length > 22 ? name.slice(0, 22) + '…' : name, cols[1].x, y)
      doc.text(String(r.categoryName ?? '—'), cols[2].x, y)
      doc.text(String(r.quantity ?? '—'), cols[3].x, y)
      doc.text(fmtQ(r.totalAmount), cols[4].x, y)
      doc.text(fmtDate(r.checkInAt as string), cols[5].x, y)
      y += 5
    }
  } else if (opts.tab === 'income' && opts.income?.length) {
    const cols = [
      { label: 'Concepto', x: 14 },
      { label: 'Método de pago', x: 100 },
      { label: 'Monto Q', x: pageW - 14 },
    ]

    doc.setFillColor(245, 245, 245)
    doc.rect(14, y - 4, pageW - 28, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(cols[0].label, cols[0].x, y)
    doc.text(cols[1].label, cols[1].x, y)
    doc.text(cols[2].label, cols[2].x, y, { align: 'right' })
    y += 5
    doc.setDrawColor(200)
    doc.line(14, y, pageW - 14, y)
    y += 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    let totalIncome = 0
    for (const r of opts.income) {
      if (y > 270) { doc.addPage(); y = 20 }
      const conceptName = (r.concept as { name?: string } | null)?.name ?? String(r.conceptName ?? '—')
      const methodName = (r.paymentMethod as { name?: string } | null)?.name ?? String(r.paymentMethodName ?? '—')
      const amount = toNum(r.amount ?? r.total ?? 0)
      totalIncome += amount
      doc.text(conceptName, cols[0].x, y)
      doc.text(methodName, cols[1].x, y)
      doc.text(fmtQ(amount), cols[2].x, y, { align: 'right' })
      y += 5
    }

    y += 3
    doc.line(14, y, pageW - 14, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', cols[0].x, y)
    doc.text(fmtQ(totalIncome), cols[2].x, y, { align: 'right' })
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('Sin datos en el rango seleccionado.', pageW / 2, y + 10, { align: 'center' })
    doc.setTextColor(0)
  }

  drawFooter(doc)

  const tabFile = { general: 'resumen', visitors: 'visitantes', income: 'ingresos' }[opts.tab]
  doc.save(`reporte-${tabFile}-${opts.from}.pdf`)
}
