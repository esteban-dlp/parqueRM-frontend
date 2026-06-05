import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { parkConfigApi } from '@/api/parkConfig.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage, buildLogoUrl } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import type { ParkConfig, UpdateParkConfigDto } from '@/types/parkConfig'
import styles from './ConfigPage.module.css'

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/
const SIDEBAR_COLOR_FALLBACK = '#1A3A2A'

function buildFormDefaults(config: ParkConfig | null): UpdateParkConfigDto & { sidebarColorHex: string } {
  return {
    parkName: config?.parkName ?? '',
    parkSubtitle: config?.parkSubtitle ?? '',
    sigapCode: config?.sigapCode ?? '',
    department: config?.department ?? '',
    municipality: config?.municipality ?? '',
    address: config?.address ?? '',
    phone: config?.phone ?? '',
    email: config?.email ?? '',
    logoUrl: config?.logoUrl ?? '',
    maxCapacity: config?.maxCapacity ?? 150,
    systemLanUrl: config?.systemLanUrl ?? '',
    sidebarColorHex: config?.sidebarColorHex ?? SIDEBAR_COLOR_FALLBACK,
    ticketVersion: config?.ticketVersion ?? 'v1.0',
    ruv: config?.ruv ?? '',
  }
}

export default function ConfigPage() {
  const canEdit = usePermission(PERMISSIONS.CONFIG_UPDATE)
  const qc = useQueryClient()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [colorDraft, setColorDraft] = useState(SIDEBAR_COLOR_FALLBACK)

  // data puede ser:
  //   undefined  → todavía cargando
  //   null       → cargado, no existe registro en DB
  //   ParkConfig → cargado, configuración existente
  const { data: config, isLoading, isError, error } = useQuery<ParkConfig | null>({
    queryKey: ['park-config'],
    queryFn: parkConfigApi.get,
    retry: false,
  })

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting, isDirty } } =
    useForm<UpdateParkConfigDto>()

  // Inicializar formulario cuando llegan datos (o cuando se confirma que no hay datos)
  useEffect(() => {
    if (config !== undefined) {
      const defaults = buildFormDefaults(config)
      reset(defaults)
      setColorDraft(defaults.sidebarColorHex)
    }
  }, [config, reset])

  const updateMutation = useMutation({
    mutationFn: parkConfigApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['park-config'] })
      toast.success(config ? 'Configuración guardada correctamente' : 'Configuración creada correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al guardar configuración')),
  })

  async function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await parkConfigApi.uploadLogo(file)
      qc.invalidateQueries({ queryKey: ['park-config'] })
      setLogoPreview(buildLogoUrl(result.logoUrl))
      toast.success('Logo subido correctamente')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al subir el logo'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleColorPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setColorDraft(val)
    setValue('sidebarColorHex', val, { shouldDirty: true })
  }

  function handleColorTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setColorDraft(val)
    if (HEX_REGEX.test(val)) {
      setValue('sidebarColorHex', val, { shouldDirty: true })
    }
  }

  async function onSubmit(values: UpdateParkConfigDto) {
    const dto: UpdateParkConfigDto = {
      parkName: values.parkName || undefined,
      parkSubtitle: values.parkSubtitle || undefined,
      sigapCode: values.sigapCode || undefined,
      department: values.department || undefined,
      municipality: values.municipality || undefined,
      address: values.address || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      logoUrl: values.logoUrl || undefined,
      maxCapacity: values.maxCapacity != null && String(values.maxCapacity).trim() !== ''
        ? Number(values.maxCapacity)
        : undefined,
      systemLanUrl: values.systemLanUrl || undefined,
      sidebarColorHex: values.sidebarColorHex && HEX_REGEX.test(values.sidebarColorHex)
        ? values.sidebarColorHex
        : undefined,
      ticketVersion: values.ticketVersion || undefined,
      ruv: values.ruv || undefined,
    }
    await updateMutation.mutateAsync(dto)
  }

  if (isLoading) return <Loading />

  // Solo mostrar error para fallas reales del servidor (500, red, etc.)
  // "sin configuración" ya NO es un error — el backend devuelve null con 200
  if (isError) {
    return (
      <div>
        <PageHeader title="Configuración del parque" subtitle="Datos institucionales y servicios" />
        <div className={styles.errorBox} style={{ margin: '24px 0' }}>
          {getApiErrorMessage(error, 'No se pudo cargar la configuración. Verifica que el servidor esté activo.')}
        </div>
      </div>
    )
  }

  const isCreating = config === null
  // Botón habilitado cuando: se está creando desde cero (siempre), o hay cambios (isDirty)
  const canSave = !isSubmitting && !updateMutation.isPending && (isCreating || isDirty)

  const currentLogoSrc = logoPreview ?? buildLogoUrl(config?.logoUrl)

  return (
    <div>
      <PageHeader
        title="Configuración del parque"
        subtitle={isCreating ? 'Configura los datos iniciales del parque' : 'Datos institucionales y servicios'}
      />

      {isCreating && (
        <div className={styles.successBox} style={{ margin: '0 0 18px', background: 'var(--accent-dim, #f0fdf4)', border: '1px solid var(--accent, #22c55e)', color: 'var(--text-primary)' }}>
          <strong>Primera vez:</strong> no existe configuración del parque. Completa los datos y guarda para crear el perfil inicial.
        </div>
      )}

      <div className={styles.grid2}>
        <Card>
          <div className={styles.sectionTitle}>
            {isCreating ? 'Crear configuración del parque' : 'Datos del parque'}
          </div>

          {updateMutation.isError && (
            <div className={styles.errorBox}>
              {getApiErrorMessage(updateMutation.error, 'Error al guardar configuración')}
            </div>
          )}

          <div className={styles.formGrid2}>
            <Input label="Nombre del parque" {...register('parkName')} />
            <Input label="Subtítulo" {...register('parkSubtitle')} />
          </div>
          <div className={styles.formGrid2}>
            <Input label="Código SIGAP" {...register('sigapCode')} />
            <Input label="Capacidad máxima" type="number" {...register('maxCapacity')} />
          </div>
          <div className={styles.formGrid2}>
            <Input label="Departamento" {...register('department')} />
            <Input label="Municipio" {...register('municipality')} />
          </div>
          <Input label="Dirección" {...register('address')} />
          <div className={styles.formGrid2} style={{ marginTop: 10 }}>
            <Input label="Teléfono" {...register('phone')} />
            <Input label="Correo electrónico" type="email" {...register('email')} />
          </div>

          {/* Logo del parque */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Logo del parque
            </div>
            {currentLogoSrc && (
              <img
                src={currentLogoSrc}
                alt="Logo actual"
                style={{ height: 64, maxWidth: 240, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.svg,.webp"
                style={{ display: 'none' }}
                onChange={onLogoFileChange}
              />
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo…' : 'Subir logo'}
                </Button>
              )}
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                JPG, PNG, SVG o WEBP · máx. 2 MB
              </span>
            </div>
          </div>

          {/* Color de la barra lateral */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Color de la barra lateral
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={HEX_REGEX.test(colorDraft) ? colorDraft : SIDEBAR_COLOR_FALLBACK}
                onChange={handleColorPickerChange}
                disabled={!canEdit}
                style={{
                  width: 40,
                  height: 36,
                  padding: 2,
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                  background: 'none',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={colorDraft}
                onChange={handleColorTextChange}
                disabled={!canEdit}
                maxLength={7}
                placeholder="#1A3A2A"
                style={{
                  width: 96,
                  fontFamily: 'monospace',
                  fontSize: 'var(--text-sm)',
                  padding: '7px 10px',
                  border: `1px solid ${HEX_REGEX.test(colorDraft) ? 'var(--border)' : 'var(--error, #ef4444)'}`,
                  borderRadius: 6,
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: HEX_REGEX.test(colorDraft) ? colorDraft : SIDEBAR_COLOR_FALLBACK,
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }}
                title={`Vista previa: ${colorDraft}`}
              />
              {!HEX_REGEX.test(colorDraft) && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--error, #ef4444)' }}>
                  HEX inválido
                </span>
              )}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              Solo formato #RRGGBB · Ej: #1A3A2A, #F54927
            </div>
          </div>

          <Input label="URL de la red local (LAN)" {...register('systemLanUrl')} />

          <div className={styles.formGrid2} style={{ marginTop: 10 }}>
            <Input
              label="Versión de ticket / boleta"
              placeholder="v1.0"
              hint="Se imprime en los tickets emitidos"
              {...register('ticketVersion')}
            />
            <Input
              label="RUV (Registro único de venta)"
              placeholder="RUV-2026-001"
              hint="Identificador oficial para reportes / SICOIN"
              {...register('ruv')}
            />
          </div>

          {canEdit && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={!canSave}
              >
                {isSubmitting || updateMutation.isPending
                  ? 'Guardando…'
                  : isCreating
                    ? 'Crear configuración'
                    : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
