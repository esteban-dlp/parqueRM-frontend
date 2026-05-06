import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { catalogsApi } from '@/api/catalogs.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableActions } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { PERMISSIONS } from '@/utils/permissions'
import type { CatalogItem, CreateCatalogItemDto } from '@/types/catalogs'
import styles from './CatalogsPage.module.css'

type CatalogKey =
  | 'visitorCategories'
  | 'vehicleTypes'
  | 'lodgingTypes'
  | 'paymentMethods'
  | 'financialConcepts'
  | 'visitReasons'
  | 'visitActivities'
  | 'infoSources'
  | 'travelTypes'
  | 'countries'
  | 'departments'

const CATALOG_LABELS: Record<CatalogKey, string> = {
  visitorCategories: 'Categorías de visitante',
  vehicleTypes: 'Tipos de vehículo',
  lodgingTypes: 'Tipos de hospedaje',
  paymentMethods: 'Métodos de pago',
  financialConcepts: 'Conceptos financieros',
  visitReasons: 'Motivos de visita',
  visitActivities: 'Actividades',
  infoSources: 'Fuentes de información',
  travelTypes: 'Tipos de viaje',
  countries: 'Países',
  departments: 'Departamentos',
}

const CATALOG_KEYS = Object.keys(CATALOG_LABELS) as CatalogKey[]

export default function CatalogsPage() {
  const canManage = usePermission(PERMISSIONS.CATALOGS_MANAGE)
  const [activeTab, setActiveTab] = useState<CatalogKey>('visitorCategories')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<CatalogItem | null>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalogs', activeTab],
    queryFn: () => catalogsApi[activeTab].list(),
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateCatalogItemDto>()

  const createMutation = useMutation({
    mutationFn: (dto: CreateCatalogItemDto) => catalogsApi[activeTab].create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogs', activeTab] })
      toast.success('Elemento creado correctamente')
      handleClose()
    },
    onError: () => toast.error('Error al crear elemento'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateCatalogItemDto> }) =>
      catalogsApi[activeTab].update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogs', activeTab] })
      toast.success('Elemento actualizado correctamente')
      handleClose()
    },
    onError: () => toast.error('Error al actualizar elemento'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => catalogsApi[activeTab].toggleStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogs', activeTab] }),
  })

  function handleClose() {
    setShowForm(false)
    setEditItem(null)
    reset()
  }

  function handleEdit(item: CatalogItem) {
    setEditItem(item)
    reset({ name: item.name })
    setShowForm(true)
  }

  async function onSubmit(values: CreateCatalogItemDto) {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, dto: values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  const columns = [
    { key: 'name', header: 'Nombre' },
    {
      key: 'type',
      header: 'Tipo',
      render: (r: CatalogItem) => {
        const item = r as CatalogItem & { type?: string }
        return item.type ? <Badge variant={item.type === 'INGRESO' ? 'green' : 'red'}>{item.type}</Badge> : null
      },
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (r: CatalogItem) =>
        r.isActive ? <Badge variant="green">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
      width: '90px',
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: CatalogItem) => (
        <TableActions>
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}>Editar</Button>
              <Button
                size="sm"
                variant={r.isActive ? 'secondary' : 'ghost'}
                onClick={() => toggleMutation.mutate(r.id)}
                disabled={toggleMutation.isPending}
              >
                {r.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            </>
          )}
        </TableActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Catálogos"
        subtitle="Gestión de catálogos del sistema"
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              + Nuevo
            </Button>
          ) : undefined
        }
      />

      {/* Tabs de catálogos */}
      <div className={styles.tabsWrap}>
        {CATALOG_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={[styles.tab, activeTab === k ? styles.tabActive : ''].filter(Boolean).join(' ')}
            onClick={() => { setActiveTab(k); setShowForm(false); setEditItem(null) }}
          >
            {CATALOG_LABELS[k]}
          </button>
        ))}
      </div>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState
            icon="📋"
            title={`Sin ${CATALOG_LABELS[activeTab].toLowerCase()}`}
            description={canManage ? 'Agrega el primer elemento.' : 'No hay elementos configurados.'}
          />
        ) : (
          <Table columns={columns} data={items} keyExtractor={(r) => r.id} />
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editItem ? `Editar — ${CATALOG_LABELS[activeTab]}` : `Nuevo — ${CATALOG_LABELS[activeTab]}`}
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <Input label="Nombre *" {...register('name', { required: 'Requerido' })} />
        {activeTab === 'financialConcepts' && (
          <Select
            label="Tipo *"
            options={[
              { value: 'INGRESO', label: 'Ingreso' },
              { value: 'EGRESO', label: 'Egreso' },
            ]}
            placeholder="— Tipo —"
            {...register('type')}
          />
        )}
        {activeTab === 'countries' && (
          <Input label="Nacionalidad" placeholder="Guatemalteco" {...register('nationality')} />
        )}
      </Modal>
    </div>
  )
}
