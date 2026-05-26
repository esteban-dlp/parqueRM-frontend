import { toNum } from './formatters'
import { getServerBaseUrl } from '@/api/client'
import type { Receipt } from '@/types/receipts'
import type { ParkConfig } from '@/types/parkConfig'

type JsPDF = import('jspdf').jsPDF

function fmtQ(amount: unknown): string {
  return `Q ${toNum(amount).toFixed(2)}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  console.log('[PDF] Loading logo from:', url)
  // Primary: fetch → FileReader (works when server returns CORS headers)
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) {
      console.error(`[PDF] Logo fetch failed: HTTP ${res.status} for ${url}`)
    } else {
      const blob = await res.blob()
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (e) => { console.error('[PDF] FileReader error:', e); resolve(null) }
        reader.readAsDataURL(blob)
      })
      if (dataUrl) { console.log('[PDF] Logo loaded via fetch, mime:', blob.type); return dataUrl }
    }
  } catch (err) {
    console.error('[PDF] Fetch error (likely CORS), trying canvas fallback:', err)
  }
  // Fallback: Image + canvas (requires server to send CORS headers or same origin)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 200
        canvas.height = img.naturalHeight || 80
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL()
        console.log('[PDF] Logo loaded via canvas fallback')
        resolve(dataUrl)
      } catch (e) {
        console.error('[PDF] Canvas tainted — server missing CORS headers:', e)
        resolve(null)
      }
    }
    img.onerror = (e) => { console.error('[PDF] Image element load error:', e); resolve(null) }
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

  let startY = 10

  // Logo
  console.log('[PDF] parkConfig.logoUrl =', parkConfig?.logoUrl ?? '(none)')
  if (parkConfig?.logoUrl) {
    const logoAbsUrl = `${getServerBaseUrl()}${parkConfig.logoUrl}`
    console.log('[PDF] Resolved logo URL =', logoAbsUrl)
    const dataUrl = await loadImageAsDataUrl(logoAbsUrl)
    if (dataUrl) {
      console.log('[PDF] Logo inserted into PDF')
      const imgFmt = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')
        ? 'JPEG'
        : dataUrl.startsWith('data:image/webp')
          ? 'WEBP'
          : 'PNG'
      const dims = await getImageDimensions(dataUrl)
      const maxW = 50
      const maxH = 20
      const scale = Math.min(maxW / dims.w, maxH / dims.h)
      const logoW = parseFloat((dims.w * scale).toFixed(2))
      const logoH = parseFloat((dims.h * scale).toFixed(2))
      doc.addImage(dataUrl, imgFmt, (pageW - logoW) / 2, startY, logoW, logoH)
      startY += logoH + 3
    } else {
      console.warn('[PDF] Logo not inserted — loadImageAsDataUrl returned null')
    }
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(parkName, pageW / 2, startY + 5, { align: 'center' })
  startY += 9

  if (parkSubtitle) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(parkSubtitle, pageW / 2, startY, { align: 'center' })
    startY += 4
  }

  const contactParts: string[] = []
  if (address) contactParts.push(address)
  if (phone) contactParts.push(`Tel: ${phone}`)
  if (email) contactParts.push(email)
  if (contactParts.length > 0) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(contactParts.join('  |  '), pageW / 2, startY, { align: 'center' })
    doc.setTextColor(0)
    startY += 4
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW / 2, startY + 2, { align: 'center' })

  const lineY = startY + 6
  doc.setDrawColor(180, 180, 180)
  doc.line(14, lineY, pageW - 14, lineY)

  return lineY + 6
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

export async function downloadReceiptPdf(receipt: Receipt, parkConfig?: ParkConfig | null): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  let y = await drawHeader(doc, 'TICKET DE PAGO', parkConfig)

  // Metadata block
  y = row(doc, 'No. ticket:', receipt.receiptNumber, y)
  if (parkConfig?.ticketVersion) {
    y = row(doc, 'Versión ticket:', parkConfig.ticketVersion, y)
  }
  if (parkConfig?.ruv) {
    y = row(doc, 'RUV:', parkConfig.ruv, y)
  }
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

  // Subtotal / discount block
  if (receipt.discountAmount != null && toNum(receipt.discountAmount) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (receipt.subtotal != null) {
      doc.text('Subtotal:', 14, y)
      doc.text(fmtQ(receipt.subtotal), pageW - 14, y, { align: 'right' })
      y += 5
    }
    const discLabel = receipt.discountType === 'PERCENTAGE' && receipt.discountPercentage
      ? `Descuento (${receipt.discountPercentage}%):`
      : receipt.discountType === 'AMOUNT'
        ? 'Descuento (Q fijo):'
        : 'Descuento:'
    doc.text(discLabel, 14, y)
    doc.text(`-${fmtQ(receipt.discountAmount)}`, pageW - 14, y, { align: 'right' })
    if (receipt.discountReason) {
      y += 4
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(`Motivo: ${receipt.discountReason}`, 16, y)
      doc.setTextColor(0)
      doc.setFontSize(9)
    }
    y += 5
  }

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
  doc.text('Este ticket es válido como comprobante de pago.', pageW / 2, y, { align: 'center' })
  doc.setTextColor(0)

  drawFooter(doc)

  const filename = `ticket-${receipt.receiptNumber.replace(/\//g, '-')}.pdf`
  doc.save(filename)
}

// ─── REPORT PDF ─────────────────────────────────────────────────────────────

interface ReportPdfOpts {
  tab: 'general' | 'visitors' | 'vehicles' | 'lodging' | 'income' | 'receipts'
  from: string
  to: string
  general?: Record<string, unknown>
  visitors?: Record<string, unknown>[]
  vehicles?: Record<string, unknown>[]
  lodging?: Record<string, unknown>[]
  income?: Record<string, unknown>[]
  receipts?: Record<string, unknown>[]
  parkConfig?: ParkConfig | null
}

export async function downloadReportPdf(opts: ReportPdfOpts): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  const tabLabels: Record<string, string> = {
    general: 'Reporte General',
    visitors: 'Reporte de Visitantes',
    vehicles: 'Reporte de Vehículos',
    lodging: 'Reporte de Hospedaje',
    income: 'Reporte de Ingresos (Caja)',
    receipts: 'Reporte de Tickets',
  }
  let y = await drawHeader(doc, tabLabels[opts.tab] ?? opts.tab, opts.parkConfig)

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
  } else if (opts.tab === 'vehicles' && opts.vehicles?.length) {
    const cols = [
      { label: 'Placa', x: 14 },
      { label: 'Tipo', x: 55 },
      { label: 'Tarifa Q', x: 130 },
      { label: 'Total Q', x: pageW - 14 },
    ]
    doc.setFillColor(245, 245, 245)
    doc.rect(14, y - 4, pageW - 28, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(cols[0].label, cols[0].x, y)
    doc.text(cols[1].label, cols[1].x, y)
    doc.text(cols[2].label, cols[2].x, y, { align: 'right' })
    doc.text(cols[3].label, cols[3].x, y, { align: 'right' })
    y += 5
    doc.setDrawColor(200)
    doc.line(14, y, pageW - 14, y)
    y += 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    let totalVeh = 0
    for (const r of opts.vehicles) {
      if (y > 270) { doc.addPage(); y = 20 }
      const typeName = (r.vehicleType as { name?: string } | null)?.name ?? '—'
      const amount = toNum(r.totalAmount ?? 0)
      totalVeh += amount
      doc.text(String(r.plateNumber ?? '—'), cols[0].x, y)
      doc.text(typeName.length > 20 ? typeName.slice(0, 20) + '…' : typeName, cols[1].x, y)
      doc.text(fmtQ(r.appliedRate), cols[2].x, y, { align: 'right' })
      doc.text(fmtQ(amount), cols[3].x, y, { align: 'right' })
      y += 5
    }
    y += 3
    doc.line(14, y, pageW - 14, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', cols[0].x, y)
    doc.text(fmtQ(totalVeh), cols[3].x, y, { align: 'right' })
  } else if (opts.tab === 'lodging' && opts.lodging?.length) {
    const cols = [
      { label: 'Tipo', x: 14 },
      { label: 'Fecha', x: 70 },
      { label: 'Noches', x: 105 },
      { label: 'Huésp.', x: 130 },
      { label: 'Total Q', x: pageW - 14 },
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
    let totalLod = 0
    for (const r of opts.lodging) {
      if (y > 270) { doc.addPage(); y = 20 }
      const typeName = (r.lodgingType as { name?: string } | null)?.name ?? '—'
      const amount = toNum(r.totalAmount ?? 0)
      totalLod += amount
      doc.text(typeName.length > 22 ? typeName.slice(0, 22) + '…' : typeName, cols[0].x, y)
      doc.text(String(r.recordDate ?? '—'), cols[1].x, y)
      doc.text(String(r.nights ?? '—'), cols[2].x, y)
      doc.text(String(r.guests ?? '—'), cols[3].x, y)
      doc.text(fmtQ(amount), cols[4].x, y, { align: 'right' })
      y += 5
    }
    y += 3
    doc.line(14, y, pageW - 14, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', cols[0].x, y)
    doc.text(fmtQ(totalLod), cols[4].x, y, { align: 'right' })
  } else if (opts.tab === 'receipts' && opts.receipts?.length) {
    const cols = [
      { label: 'No. ticket', x: 14 },
      { label: 'Origen', x: 55 },
      { label: 'Método', x: 100 },
      { label: 'Estado', x: 145 },
      { label: 'Total Q', x: pageW - 14 },
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
    let totalRec = 0
    for (const r of opts.receipts) {
      if (y > 270) { doc.addPage(); y = 20 }
      const methodName = (r.paymentMethod as { name?: string } | null)?.name ?? '—'
      const amount = toNum(r.total ?? 0)
      if (r.status !== 'CANCELADO') totalRec += amount
      doc.text(String(r.receiptNumber ?? '—'), cols[0].x, y)
      doc.text(String(r.originType ?? '—'), cols[1].x, y)
      doc.text(methodName.length > 18 ? methodName.slice(0, 18) + '…' : methodName, cols[2].x, y)
      doc.text(String(r.status ?? '—'), cols[3].x, y)
      doc.text(fmtQ(amount), cols[4].x, y, { align: 'right' })
      y += 5
    }
    y += 3
    doc.line(14, y, pageW - 14, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL ACTIVOS', cols[0].x, y)
    doc.text(fmtQ(totalRec), cols[4].x, y, { align: 'right' })
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('Sin datos en el rango seleccionado.', pageW / 2, y + 10, { align: 'center' })
    doc.setTextColor(0)
  }

  drawFooter(doc)

  const tabFiles: Record<string, string> = {
    general: 'resumen', visitors: 'visitantes', vehicles: 'vehiculos',
    lodging: 'hospedaje', income: 'ingresos', receipts: 'transacciones',
  }
  doc.save(`reporte-${tabFiles[opts.tab] ?? opts.tab}-${opts.from}.pdf`)
}
