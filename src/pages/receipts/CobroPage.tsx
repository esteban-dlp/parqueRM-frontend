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
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency, toNum } from '@/utils/formatters'
import { downloadReceiptPdf } from '@/utils/pdf'
import { getApiErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/useToast'
import type { ReceiptOriginType, Receipt } from '@/types/receipts'
import styles from './CobroPage.module.css'

const lineSchema = z.object({
  description: z.string().min(1, 'Requerido'),
  quantity: z.coerce.number().min(1).default(1),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
})

const schema = z.object({
  originType: z.enum(['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL']).default('SERVICIO_GENERAL'),
  contributorName: z.string().optional(),
  contributorDocument: z.string().optional(),
  contributorAddress: z.string().optional(),
  paymentMethodId: z.coerce.number().min(1, 'Selecciona método de pago'),
  amountReceived: z.coerce.number().min(0).optional(),
  paymentReference: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Agrega al menos una línea'),
})
type FormValues = z.infer<typeof schema>

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

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['catalogs/payment-methods'],
    queryFn: () => catalogsApi.paymentMethods.list({ isActive: true }),
    staleTime: 10 * 60 * 1000,
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

  const subtotal = watchLines?.reduce((sum, l) => sum + (Number(l.total) || 0), 0) ?? 0
  const change = Math.max(0, Number(watchAmountReceived) - subtotal)

  useEffect(() => {
    watchLines?.forEach((line, i) => {
      const qty = Number(line.quantity) || 1
      const price = Number(line.unitPrice) || 0
      const computed = parseFloat((toNum(qty) * toNum(price)).toFixed(2))
      if (computed !== Number(line.total)) {
        setValue(`lines.${i}.total`, computed)
      }
    })
  }, [watchLines, setValue])

  useEffect(() => {
    if (hasPrefilled.current) return
    if (originType === 'VISITANTE' && originVisitor) {
      hasPrefilled.current = true
      if (originVisitor.fullName) setValue('contributorName', originVisitor.fullName)
      if (originVisitor.identificationNumber) setValue('contributorDocument', originVisitor.identificationNumber)
      const categoryName = originVisitor.visitorCategory?.name ?? 'General'
      setValue('lines', [{
        description: `Ingreso de visitantes (${categoryName})`,
        quantity: originVisitor.quantity,
        unitPrice: originVisitor.appliedRate,
        total: originVisitor.totalAmount,
      }])
    } else if (originType === 'VEHICULO' && originVehicle) {
      hasPrefilled.current = true
      const typeName = originVehicle.vehicleType?.name ?? 'Vehículo'
      const plate = originVehicle.plateNumber ? ` (${originVehicle.plateNumber})` : ''
      setValue('lines', [{
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
        description: `Hospedaje - ${typeName} × ${nights} noche${nights !== 1 ? 's' : ''}`,
        quantity: nights,
        unitPrice: originLodging.appliedRate,
        total: originLodging.totalAmount,
      }])
    }
  }, [originType, originVisitor, originVehicle, originLodging, setValue])

  const createMutation = useMutation({
    mutationFn: receiptsApi.create,
    onSuccess: (receipt) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      toast.success('Recibo emitido correctamente')
      setIssuedReceipt(receipt)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al emitir recibo')),
  })

  async function onSubmit(values: FormValues) {
    const lineTotal = toNum(subtotal)
    const selectedMethod = paymentMethods.find(
      (m) => String(m.id) === String(values.paymentMethodId),
    )
    if (selectedMethod?.name?.toLowerCase().includes('efectivo')) {
      const received = toNum(values.amountReceived)
      if (received < lineTotal) {
        setError('amountReceived', { message: `Monto insuficiente (total: ${formatCurrency(lineTotal)})` })
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
      total: lineTotal,
      amountReceived: values.amountReceived ? toNum(values.amountReceived) : undefined,
      changeAmount: change > 0 ? toNum(change) : undefined,
      paymentReference: values.paymentReference || undefined,
      lines: values.lines.map((l) => ({
        description: l.description,
        quantity: toNum(l.quantity) || 1,
        unitPrice: toNum(l.unitPrice),
        total: toNum(l.total),
      })),
    })
  }

  function handleNewReceipt() {
    setIssuedReceipt(null)
    reset({
      originType: 'SERVICIO_GENERAL',
      lines: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    })
  }

  if (issuedReceipt) {
    return (
      <div>
        <PageHeader title="Cobro" subtitle="Recibo emitido" />
        <Card>
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>Recibo emitido correctamente</div>
            <div className={styles.successNumber}>No. {issuedReceipt.receiptNumber}</div>
          </div>
          <div className={styles.receiptPreview}>
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
            <Button variant="secondary" onClick={() => downloadReceiptPdf(issuedReceipt)}>
              Descargar PDF
            </Button>
            <Button variant="secondary" onClick={() => receiptsApi.triggerPrint(issuedReceipt.id)}>
              Imprimir recibo
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
        subtitle={nextNumber ? `Próximo recibo: ${nextNumber.receiptNumber}` : 'Emitir recibo'}
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
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0, total: 0 })}
              style={{ marginTop: 6 }}
            >
              + Agregar línea
            </Button>
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
                  <span>{formatCurrency(Number(line.total))}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
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
                        setValue(`lines.${fields.length - 1}.description`, c.name)
                      } else {
                        append({ description: c.name, quantity: 1, unitPrice: 0, total: 0 })
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
                {getApiErrorMessage(createMutation.error, 'Error al emitir el recibo')}
              </div>
            )}

            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending || subtotal <= 0}
            >
              {isSubmitting || createMutation.isPending ? 'Emitiendo…' : `Emitir recibo — ${formatCurrency(subtotal)}`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
