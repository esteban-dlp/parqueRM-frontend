import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { rolesApi } from '@/api/roles.api'
import { permissionsApi } from '@/api/permissions.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Table, TableActions } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import type { Role, Permission } from '@/types/roles'
import styles from './RolesPage.module.css'

export default function RolesPage() {
  const canManage = usePermission(PERMISSIONS.ROLES_MANAGE)
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<number[]>([])
  const qc = useQueryClient()
  const toast = useToast()

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
  })

  const { data: permGroups = [] } = useQuery({
    queryKey: ['permissions/grouped'],
    queryFn: permissionsApi.groupedByModule,
    staleTime: 60 * 60 * 1000,
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<{ name: string; description?: string }>()

  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setShowForm(false)
      reset()
      toast.success('Rol creado correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al crear rol')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { name?: string; description?: string } }) =>
      rolesApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setEditRole(null)
      reset()
      toast.success('Rol actualizado correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar rol')),
  })

  const assignPermsMutation = useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      rolesApi.assignPermissions(id, { permissionIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setPermRole(null)
      toast.success('Permisos actualizados correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar permisos')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Rol eliminado correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al eliminar rol')),
  })

  function openPerms(role: Role) {
    setPermRole(role)
    const perms = Array.isArray(role.permissions) ? role.permissions : []
    setSelectedPerms(perms.map((p) => p.id))
  }

  function togglePerm(id: number) {
    setSelectedPerms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function openEdit(role: Role) {
    setEditRole(role)
    reset({ name: role.name, description: role.description ?? '' })
  }

  const columns = [
    { key: 'name', header: 'Nombre' },
    {
      key: 'description',
      header: 'Descripción',
      render: (r: Role) => r.description ?? '—',
    },
    {
      key: 'permissions',
      header: 'Permisos',
      render: (r: Role) => (
        <Badge variant="blue">{Array.isArray(r.permissions) ? r.permissions.length : 0} permisos</Badge>
      ),
      width: '110px',
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (r: Role) =>
        r.isActive ? <Badge variant="green">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
      width: '90px',
    },
    {
      key: 'actions',
      header: '',
      width: '220px',
      render: (r: Role) => (
        <TableActions>
          {canManage && (
            <>
              {r.name !== 'Administrador' ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
                  <Button size="sm" variant="secondary" onClick={() => openPerms(r)}>Permisos</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`¿Eliminar el rol "${r.name}"? Esta acción no se puede deshacer.`)) {
                        deleteMutation.mutate(r.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </>
              ) : (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: '0 4px' }}>
                  Protegido
                </span>
              )}
            </>
          )}
        </TableActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Gestión de roles y permisos"
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>+ Nuevo rol</Button>
          ) : undefined
        }
      />

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : !Array.isArray(roles) || roles.length === 0 ? (
          <EmptyState icon="🔑" title="Sin roles" description="Crea el primer rol del sistema." />
        ) : (
          <Table columns={columns} data={roles} keyExtractor={(r) => r.id} />
        )}
      </Card>

      {/* Modal crear */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); reset() }}
        title="Nuevo rol"
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); reset() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(async (v) => {
                await createMutation.mutateAsync({ name: v.name, description: v.description })
              })}
              disabled={isSubmitting || createMutation.isPending}
            >
              {isSubmitting || createMutation.isPending ? 'Creando…' : 'Crear rol'}
            </Button>
          </>
        }
      >
        <Input label="Nombre *" {...register('name', { required: true })} />
        <Textarea label="Descripción" {...register('description')} />
      </Modal>

      {/* Modal editar */}
      <Modal
        isOpen={editRole !== null}
        onClose={() => { setEditRole(null); reset() }}
        title="Editar rol"
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditRole(null); reset() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit(async (v) => {
                if (!editRole) return
                await updateMutation.mutateAsync({ id: editRole.id, dto: { name: v.name, description: v.description } })
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <Input label="Nombre *" {...register('name', { required: true })} />
        <Textarea label="Descripción" {...register('description')} />
      </Modal>

      {/* Modal permisos */}
      <Modal
        isOpen={permRole !== null}
        onClose={() => setPermRole(null)}
        title={`Permisos — ${permRole?.name ?? ''}`}
        size="wide"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPermRole(null)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (permRole) {
                  assignPermsMutation.mutate({ id: permRole.id, permissionIds: selectedPerms })
                }
              }}
              disabled={assignPermsMutation.isPending}
            >
              {assignPermsMutation.isPending ? 'Guardando…' : 'Guardar permisos'}
            </Button>
          </>
        }
      >
        {(Array.isArray(permGroups) ? permGroups : []).map((group) => (
          <div key={group.module} className={styles.permGroup}>
            <div className={styles.permGroupTitle}>{group.module}</div>
            <div className={styles.permGrid}>
              {(Array.isArray(group.permissions) ? group.permissions : []).map((p: Permission) => (
                <label key={p.id} className={styles.permItem}>
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(p.id)}
                    onChange={() => togglePerm(p.id)}
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  )
}
