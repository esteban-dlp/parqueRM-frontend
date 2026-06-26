import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { receiptsApi } from '@/api/receipts.api'
import { catalogsApi } from '@/api/catalogs.api'
import { visitorsApi } from '@/api/visitors.api'
import { vehiclesApi } from '@/api/vehicles.api'
import { lodgingApi } from '@/api/lodging.api'
import { parkConfigApi } from '@/api/parkConfig.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency, toNum } from '@/utils/formatters'
import { downloadReceiptPdf } from '@/utils/pdf'
import { getApiErrorMessage, getServerBaseUrl } from '@/api/client'
import { useToast } from '@/hooks/useToast'
import type { ReceiptOriginType, Receipt } from '@/types/receipts'
import styles from './CobroPage.module.css'

const ORIGIN_TYPES = ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL'] as const

const optionalId = z.preprocess(
  (v) => (v === '' || v === '0' || v === 0 || v === null ? undefined : v),
  z.coerce.number().positive().optional(),
)

const lineSchema = z.object({
  conceptId: optionalId,
  originType: z.enum(ORIGIN_TYPES).optional(),
  originId: optionalId,
  description: z.string().min(1, 'Requerido'),
  quantity: z.coerce.number().min(1).default(1),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0).optional().default(0),
})

const schema = z.object({
  originType: z.enum(['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL']).default('SERVICIO_GENERAL'),
  contributorName: z.string().optional(),
  contributorDocument: z.string().optional(),
  contributorAddress: z.string().optional(),
  paymentMethodId: z.coerce.number().min(1, 'Selecciona método de pago'),
  amountReceived: z.coerce.number().min(0).optional(),
  paymentReference: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']).default('PERCENTAGE'),
  discountValue: z.coerce.number().min(0).optional(),
  discountReason: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Agrega al menos una línea'),
}).superRefine((data, ctx) => {
  const dv = data.discountValue ?? 0
  const subtotal = (data.lines ?? []).reduce(
    (s, l) => s + (toNum(l.quantity) || 1) * toNum(l.unitPrice),
    0,
  )
  if (dv > 0) {
    if (data.discountType === 'PERCENTAGE' && dv > 100) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'El porcentaje no puede superar 100' })
    }
    if (data.discountType === 'AMOUNT' && dv > subtotal) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'El descuento no puede superar el subtotal' })
    }
    if (!data.discountReason?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['discountReason'], message: 'El motivo es obligatorio cuando hay descuento' })
    }
  }
})
type FormValues = z.infer<typeof schema>

function normalizeConceptName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function CobroPage() {
  const { originType, originId } = useParams<{ originType?: string; originId?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [issuedReceipt, setIssuedReceipt] = useState<Receipt | null>(null)
  const hasPrefilled = useRef(false)

  const { data: originVisitor } = useQuery({
    queryKey: ['visitors/cobro-origin', originId],
    queryFn: () => visitorsApi.getById(Number(originId)),
    enabled: originType === 'VISITANTE' && !!originId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: originVehicle } = useQuery({
    queryKey: ['vehicles/cobro-origin', originId],
    queryFn: () => vehiclesApi.getById(Number(originId)),
    enabled: originType === 'VEHICULO' && !!originId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: originLodging } = useQuery({
    queryKey: ['lodging/cobro-origin', originId],
    queryFn: () => lodgingApi.getById(Number(originId)),
    enabled: originType === 'HOSPEDAJE' && !!originId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: relatedVehiclesPage, isFetched: relatedVehiclesFetched } = useQuery({
    queryKey: ['vehicles/by-visitor', originId],
    queryFn: () => vehiclesApi.list({ visitorRecordId: Number(originId), limit: 100 }),
    enabled: originType === 'VISITANTE' && !!originId,
    staleTime: 30 * 1000,
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['catalogs/payment-methods'],
    queryFn: () => catalogsApi.paymentMethods.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: parkConfig } = useQuery({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  const { data: concepts = [] } = useQuery({
    queryKey: ['catalogs/financial-concepts-income'],
    queryFn: () => catalogsApi.financialConcepts.list({ isActive: true, type: 'INGRESO' }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: nextNumber } = useQuery({
    queryKey: ['receipts/next-number'],
    queryFn: receiptsApi.nextNumber,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      originType: (originType as ReceiptOriginType) ?? 'SERVICIO_GENERAL',
      lines: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const watchLines = watch('lines')
  const watchPaymentMethod = watch('paymentMethodId')
  const watchAmountReceived = watch('amountReceived') ?? 0
  const watchDiscountType = watch('discountType') ?? 'PERCENTAGE'
  const watchDiscountValue = watch('discountValue') ?? 0

  const lineTotals = watchLines?.map((line) =>
    parseFloat(((toNum(line.quantity) || 1) * toNum(line.unitPrice)).toFixed(2)),
  ) ?? []
  const subtotal = lineTotals.reduce((sum, total) => sum + total, 0)
  const discountAmount = (() => {
    const dv = Number(watchDiscountValue)
    if (!dv || dv <= 0) return 0
    if (watchDiscountType === 'PERCENTAGE') return parseFloat((subtotal * Math.min(dv, 100) / 100).toFixed(2))
    return Math.min(dv, subtotal)
  })()
  const grandTotal = Math.max(0, subtotal - discountAmount)
  const change = Math.max(0, Number(watchAmountReceived) - grandTotal)
  const relatedVehicles = relatedVehiclesPage?.data ?? []
  const findConceptId = (keywords: string[]) => {
    const normalizedKeywords = keywords.map(normalizeConceptName)
    return concepts.find((concept) => {
      const name = normalizeConceptName(concept.name)
      return normalizedKeywords.some((keyword) => name.includes(keyword))
    })?.id
  }
  const visitorConceptId = findConceptId(['ingreso por visitante', 'visitante'])
  const vehicleConceptId = findConceptId(['ingreso por vehiculo', 'vehiculo'])
  const lodgingConceptId = findConceptId(['ingreso por hospedaje', 'hospedaje'])
  const defaultConceptId = findConceptId(['servicio general']) ?? concepts[0]?.id

  useEffect(() => {
    watchLines?.forEach((line, i) => {
      const qty = Number(line.quantity) || 1
      const price = Number(line.unitPrice) || 0
      const computed = parseFloat((toNum(qty) * toNum(price)).toFixed(2))
      if (computed !== Number(line.total)) {
        setValue(`lines.${i}.total`, computed, { shouldValidate: false, shouldDirty: false })
      }
    })
  }, [watchLines, setValue])

  useEffect(() => {
    if (hasPrefilled.current) return
    if (originType === 'VISITANTE' && originVisitor) {
      if (!relatedVehiclesFetched) return
      hasPrefilled.current = true
      if (originVisitor.fullName) setValue('contributorName', originVisitor.fullName)
      if (originVisitor.identificationNumber) setValue('contributorDocument', originVisitor.identificationNumber)
      const categoryName = originVisitor.visitorCategory?.name ?? 'General'
      const primarySubtotal = parseFloat(
        (Number(originVisitor.appliedRate) * Number(originVisitor.quantity)).toFixed(2),
      )
      const primaryLine = {
        conceptId: visitorConceptId,
        originType: 'VISITANTE' as const,
        originId: Number(originVisitor.id),
        description: `Ingreso de visitantes (${categoryName})`,
        quantity: Number(originVisitor.quantity),
        unitPrice: Number(originVisitor.appliedRate),
        // Source of truth: rate × quantity, not the visitor totalAmount which
        // already includes companions.
        total: primarySubtotal,
      }
      const companionLines = (originVisitor.companions ?? []).map((c) => {
        const name = c.visitorCategory?.name ?? `Cat#${c.visitorCategoryId}`
        return {
          conceptId: visitorConceptId,
          originType: 'VISITANTE' as const,
          originId: Number(originVisitor.id),
          description: `Ingreso de visitantes (${name})`,
          quantity: Number(c.quantity),
          unitPrice: Number(c.appliedRate),
          total: parseFloat((Number(c.appliedRate) * Number(c.quantity)).toFixed(2)),
        }
      })
      const vehicleLines = relatedVehicles
        .filter((vehicle) => !vehicle.isPaid)
        .map((vehicle) => {
          const typeName = vehicle.vehicleType?.name ?? 'Vehiculo'
          const plate = vehicle.plateNumber ? ` (${vehicle.plateNumber})` : ''
          return {
            conceptId: vehicleConceptId,
            originType: 'VEHICULO' as const,
            originId: Number(vehicle.id),
            description: `Estacionamiento - ${typeName}${plate}`,
            quantity: 1,
            unitPrice: Number(vehicle.totalAmount),
            total: Number(vehicle.totalAmount),
          }
        })
      setValue('lines', [primaryLine, ...companionLines, ...vehicleLines])
    } else if (originType === 'VEHICULO' && originVehicle) {
      hasPrefilled.current = true
      const typeName = originVehicle.vehicleType?.name ?? 'Vehículo'
      const plate = originVehicle.plateNumber ? ` (${originVehicle.plateNumber})` : ''
      setValue('lines', [{
        conceptId: vehicleConceptId,
        originType: 'VEHICULO',
        originId: Number(originVehicle.id),
        description: `Estacionamiento - ${typeName}${plate}`,
        quantity: 1,
        unitPrice: originVehicle.totalAmount,
        total: originVehicle.totalAmount,
      }])
    } else if (originType === 'HOSPEDAJE' && originLodging) {
      hasPrefilled.current = true
      const typeName = originLodging.lodgingType?.name ?? 'Alojamiento'
      const nights = originLodging.nights
      setValue('lines', [{
        conceptId: lodgingConceptId,
        originType: 'HOSPEDAJE',
        originId: Number(originLodging.id),
        description: `Hospedaje - ${typeName} × ${nights} noche${nights !== 1 ? 's' : ''}`,
        quantity: nights,
        unitPrice: originLodging.appliedRate,
        total: originLodging.totalAmount,
      }])
    }
  }, [
    originType,
    originVisitor,
    originVehicle,
    originLodging,
    relatedVehicles,
    relatedVehiclesFetched,
    visitorConceptId,
    vehicleConceptId,
    lodgingConceptId,
    setValue,
  ])

  const createMutation = useMutation({
    mutationFn: receiptsApi.create,
    onSuccess: (receipt) => {
      // Invalidate everything that depends on receipts/movements so the
      // dashboard, cash, visitors and reports refresh in real time.
      qc.invalidateQueries({
        predicate: (q) => {
          const key = String(q.queryKey[0] ?? '')
          return (
            key.startsWith('receipts') ||
            key.startsWith('dashboard') ||
            key.startsWith('cash') ||
            key.startsWith('visitors') ||
            key.startsWith('vehicles') ||
            key.startsWith('lodging') ||
            key.startsWith('reports')
          )
        },
      })
      toast.success('Ticket emitido correctamente')
      setIssuedReceipt(receipt)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al emitir ticket')),
  })

  async function onSubmit(values: FormValues) {
    const selectedMethod = paymentMethods.find(
      (m) => String(m.id) === String(values.paymentMethodId),
    )
    if (selectedMethod?.name?.toLowerCase().includes('efectivo')) {
      const received = toNum(values.amountReceived)
      if (received < grandTotal) {
        setError('amountReceived', { message: `Monto insuficiente (total: ${formatCurrency(grandTotal)})` })
        return
      }
    }
    await createMutation.mutateAsync({
      originType: values.originType as ReceiptOriginType,
      originId: originId ? Number(originId) : undefined,
      contributorName: values.contributorName || undefined,
      contributorDocument: values.contributorDocument || undefined,
      contributorAddress: values.contributorAddress || undefined,
      paymentMethodId: Number(values.paymentMethodId),
      subtotal: subtotal > 0 ? subtotal : undefined,
      discountType: discountAmount > 0 ? values.discountType : undefined,
      discountValue: discountAmount > 0 ? Number(values.discountValue) : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      discountReason: discountAmount > 0 ? (values.discountReason || undefined) : undefined,
      total: grandTotal,
      amountReceived: values.amountReceived ? toNum(values.amountReceived) : undefined,
      changeAmount: change > 0 ? toNum(change) : undefined,
      paymentReference: values.paymentReference || undefined,
      lines: values.lines.map((l) => ({
        conceptId: l.conceptId ? Number(l.conceptId) : undefined,
        originType: l.originType,
        originId: l.originId ? Number(l.originId) : undefined,
        description: l.description,
        quantity: toNum(l.quantity) || 1,
        unitPrice: toNum(l.unitPrice),
        total: parseFloat(((toNum(l.quantity) || 1) * toNum(l.unitPrice)).toFixed(2)),
      })),
    })
  }

  function handleNewReceipt() {
    setIssuedReceipt(null)
    reset({
      originType: 'SERVICIO_GENERAL',
      lines: [{ conceptId: defaultConceptId, description: '', quantity: 1, unitPrice: 0, total: 0 }],
    })
  }

  if (issuedReceipt) {
    return (
      <div>
        <PageHeader title="Cobro" subtitle="Ticket emitido" />
        <Card>
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>Ticket emitido correctamente</div>
            <div className={styles.successNumber}>No. ticket: {issuedReceipt.receiptNumber}</div>
          </div>
          <div className={styles.receiptPreview}>
            {parkConfig?.logoUrl && (
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <img
                  src={`${getServerBaseUrl()}${parkConfig.logoUrl}`}
                  alt="Logo"
                  style={{ maxHeight: 56, maxWidth: 160, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
            {parkConfig?.parkName && (
              <div style={{ textAlign: 'center', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>
                {parkConfig.parkName}
              </div>
            )}
            <div className={styles.receiptRow}>
              <span>Contribuyente</span>
              <span>{issuedReceipt.contributorName ?? '—'}</span>
            </div>
            {issuedReceipt.lines.map((line, i) => (
              <div key={i} className={styles.receiptRow}>
                <span>{line.description ?? `Línea ${i + 1}`} × {line.quantity}</span>
                <span>{formatCurrency(line.total)}</span>
              </div>
            ))}
            {Number(issuedReceipt.discountAmount) > 0 && (
              <>
                <div className={styles.receiptRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(issuedReceipt.subtotal ?? issuedReceipt.total)}</span>
                </div>
                <div className={styles.receiptRow} style={{ color: 'var(--color-success, #16a34a)' }}>
                  <span>
                    {issuedReceipt.discountType === 'PERCENTAGE'
                      ? `Descuento (${issuedReceipt.discountPercentage}%)`
                      : 'Descuento (Q fijo)'}
                  </span>
                  <span>−{formatCurrency(issuedReceipt.discountAmount!)}</span>
                </div>
              </>
            )}
            <div className={styles.receiptTotal}>
              <span>Total</span>
              <span>{formatCurrency(issuedReceipt.total)}</span>
            </div>
            {issuedReceipt.changeAmount != null && issuedReceipt.changeAmount > 0 && (
              <div className={styles.receiptRow}>
                <span>Cambio entregado</span>
                <span>{formatCurrency(issuedReceipt.changeAmount)}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button variant="secondary" onClick={() => downloadReceiptPdf(issuedReceipt, parkConfig)}>
              Descargar PDF
            </Button>
            <Button variant="primary" onClick={handleNewReceipt}>
              Nuevo cobro
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const selectedMethod = paymentMethods.find(
    (m) => String(m.id) === String(watchPaymentMethod),
  )
  const isEffectivo = selectedMethod?.name?.toLowerCase().includes('efectivo')

  const backPath =
    originType === 'VISITANTE' ? '/visitantes'
    : originType === 'VEHICULO' ? '/vehiculos'
    : originType === 'HOSPEDAJE' ? '/hospedaje'
    : '/recibos'

  return (
    <div>
      <PageHeader
        title="Cobro"
        subtitle={nextNumber ? `Próximo No. ticket: ${nextNumber.receiptNumber}` : 'Emitir ticket'}
        actions={
          originId ? (
            <Button variant="ghost" onClick={() => navigate(backPath)}>
              ← Volver
            </Button>
          ) : undefined
        }
      />

      <div className={styles.cobroLayout}>
        {/* Columna izquierda: formulario */}
        <div className={styles.cobroForm}>
          <Card>
            <div className={styles.sectionLabel}>Contribuyente</div>
            <div className={styles.formGrid2}>
              <Input label="Nombre" placeholder="Nombre completo" {...register('contributorName')} />
              <Input label="Documento" placeholder="DPI / NIT" {...register('contributorDocument')} />
            </div>
            <Input label="Dirección" placeholder="Ciudad, Municipio" {...register('contributorAddress')} />
          </Card>

          <Card style={{ marginTop: 14 }}>
            <div className={styles.sectionLabel}>Detalle del cobro</div>
            {fields.map((field, i) => (
              <div key={field.id} className={styles.lineRow}>
                <div className={styles.lineConcept}>
                  <Select
                    label={i === 0 ? 'Concepto' : undefined}
                    placeholder="Concepto"
                    options={concepts.map((c) => ({ value: c.id, label: c.name }))}
                    {...register(`lines.${i}.conceptId`)}
                  />
                </div>
                <div className={styles.lineDesc}>
                  <Input
                    label={i === 0 ? 'Descripción' : undefined}
                    placeholder="Concepto o servicio"
                    {...register(`lines.${i}.description`)}
                    error={errors.lines?.[i]?.description?.message}
                  />
                </div>
                <div className={styles.lineQty}>
                  <Input
                    label={i === 0 ? 'Cant.' : undefined}
                    type="number"
                    min="1"
                    {...register(`lines.${i}.quantity`)}
                  />
                </div>
                <div className={styles.linePrice}>
                  <Input
                    label={i === 0 ? 'Precio unit.' : undefined}
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`lines.${i}.unitPrice`)}
                  />
                </div>
                <div className={styles.lineTotal}>
                  <Input
                    label={i === 0 ? 'Total' : undefined}
                    type="number"
                    step="0.01"
                    readOnly
                    value={(lineTotals[i] ?? 0).toFixed(2)}
                    style={{ background: 'var(--surface-raised)' }}
                    {...register(`lines.${i}.total`)}
                  />
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeLine}
                    onClick={() => remove(i)}
                    aria-label="Eliminar línea"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => append({ conceptId: defaultConceptId, description: '', quantity: 1, unitPrice: 0, total: 0 })}
              style={{ marginTop: 6 }}
            >
              + Agregar línea
            </Button>
          </Card>

          <Card style={{ marginTop: 14 }}>
            <div className={styles.sectionLabel}>Descuento (opcional)</div>
            <div className={styles.discountRow}>
              <div className={styles.discountTypeCol}>
                <span className={styles.discountTypeLabel}>Tipo</span>
                <div className={styles.segmented}>
                  <button
                    type="button"
                    className={[styles.segBtn, watchDiscountType === 'PERCENTAGE' ? styles.segBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={() => setValue('discountType', 'PERCENTAGE')}
                  >%</button>
                  <button
                    type="button"
                    className={[styles.segBtn, watchDiscountType === 'AMOUNT' ? styles.segBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={() => setValue('discountType', 'AMOUNT')}
                  >Q</button>
                </div>
              </div>
              <Input
                label={watchDiscountType === 'PERCENTAGE' ? 'Valor (%)' : 'Valor (Q)'}
                type="number"
                step="0.01"
                min="0"
                max={watchDiscountType === 'PERCENTAGE' ? 100 : undefined}
                placeholder="0"
                error={errors.discountValue?.message}
                {...register('discountValue')}
              />
              <Input
                label={`Motivo${discountAmount > 0 ? ' *' : ''}`}
                placeholder="Razón del descuento aplicado"
                error={errors.discountReason?.message}
                {...register('discountReason')}
              />
            </div>
          </Card>

          <Card style={{ marginTop: 14 }}>
            <div className={styles.sectionLabel}>Pago</div>
            <div className={styles.formGrid2}>
              <Select
                label="Método de pago *"
                options={paymentMethods.map((m) => ({ value: m.id, label: m.name }))}
                placeholder="— Seleccionar —"
                error={errors.paymentMethodId?.message}
                {...register('paymentMethodId')}
              />
              {isEffectivo && (
                <Input
                  label="Monto recibido (Q)"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.amountReceived?.message}
                  {...register('amountReceived')}
                />
              )}
              {!isEffectivo && (
                <Input
                  label="Referencia de pago"
                  placeholder="No. transacción / autorización"
                  {...register('paymentReference')}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Columna derecha: resumen */}
        <div className={styles.cobroSummary}>
          <Card>
            <div className={styles.sectionLabel}>Resumen del cobro</div>
            <div className={styles.summaryLines}>
              {watchLines?.map((line, i) => (
                <div key={i} className={styles.summaryLine}>
                  <span className={styles.summaryLineDesc}>
                    {line.description || `Línea ${i + 1}`}
                  </span>
                  <span>{formatCurrency(lineTotals[i] ?? 0)}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryDivider} />
            {discountAmount > 0 && (
              <>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className={styles.summaryRow} style={{ color: 'var(--color-success, #16a34a)' }}>
                  <span>
                    {watchDiscountType === 'PERCENTAGE'
                      ? `Descuento (${watchDiscountValue}%)`
                      : `Descuento (Q fijo)`}
                  </span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              </>
            )}
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            {isEffectivo && Number(watchAmountReceived) > 0 && (
              <>
                <div className={styles.summaryRow}>
                  <span>Recibido</span>
                  <span>{formatCurrency(Number(watchAmountReceived))}</span>
                </div>
                <div className={[styles.summaryRow, change > 0 ? styles.summaryChange : ''].filter(Boolean).join(' ')}>
                  <span>Cambio</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <div className={styles.conceptSuggest}>
                <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>Conceptos frecuentes</div>
                {concepts.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.conceptChip}
                    onClick={() => {
                      const last = fields[fields.length - 1]
                      if (last && !last.description) {
                        setValue(`lines.${fields.length - 1}.conceptId`, c.id)
                        setValue(`lines.${fields.length - 1}.description`, c.name)
                      } else {
                        append({ conceptId: c.id, description: c.name, quantity: 1, unitPrice: 0, total: 0 })
                      }
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className={styles.originBadge}>
                <span>Origen</span>
                <Badge variant="blue">{originType ?? 'SERVICIO_GENERAL'}</Badge>
              </div>
            </div>

            {createMutation.isError && (
              <div className={styles.errorBox} style={{ marginTop: 12 }}>
                {getApiErrorMessage(createMutation.error, 'Error al emitir el ticket')}
              </div>
            )}

            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending || subtotal <= 0}
            >
              {isSubmitting || createMutation.isPending ? 'Emitiendo…' : `Emitir ticket — ${formatCurrency(grandTotal)}`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
