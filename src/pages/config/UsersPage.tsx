import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { usersApi } from '@/api/users.api'
import { rolesApi } from '@/api/roles.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableActions } from '@/components/ui/Table'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/api/client'
import { PERMISSIONS } from '@/utils/permissions'
import { formatDateTime } from '@/utils/formatters'
import type { User } from '@/types/users'
import type { PaginatedMeta } from '@/types/api'
import styles from './UsersPage.module.css'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [changePwdUser, setChangePwdUser] = useState<User | null>(null)
  const canManage = usePermission(PERMISSIONS.USERS_MANAGE)
  const qc = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.list({ page, limit: 20 }),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    staleTime: 10 * 60 * 1000,
  })

  const { register: regCreate, handleSubmit: subCreate, reset: resetCreate, formState: { isSubmitting: subm, errors: errCreate } } =
    useForm<{ username: string; fullName: string; email?: string; password: string; roleId: number }>()

  const { register: regEdit, handleSubmit: subEdit, reset: resetEdit } =
    useForm<{ fullName: string; email?: string; roleId: number }>()

  const { register: regPwd, handleSubmit: subPwd, reset: resetPwd } =
    useForm<{ newPassword: string }>()

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      resetCreate()
      toast.success('Usuario creado correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al crear usuario')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
      resetEdit()
      toast.success('Usuario actualizado correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar usuario')),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => usersApi.toggleStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Estado del usuario actualizado')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al cambiar estado del usuario')),
  })

  const pwdMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      usersApi.adminChangePassword(id, { newPassword }),
    onSuccess: () => {
      setChangePwdUser(null)
      resetPwd()
      toast.success('Contraseña actualizada correctamente')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar contraseña')),
  })

  function openEdit(u: User) {
    setEditUser(u)
    resetEdit({ fullName: u.fullName, email: u.email ?? '', roleId: u.roleId })
  }

  const rows = data?.data ?? []
  const meta = data?.meta as PaginatedMeta | undefined

  const columns = [
    { key: 'username', header: 'Usuario' },
    { key: 'fullName', header: 'Nombre completo' },
    {
      key: 'role',
      header: 'Rol',
      render: (r: User) => r.role?.name ?? '—',
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (r: User) =>
        r.isActive ? <Badge variant="green">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
      width: '90px',
    },
    {
      key: 'lastLoginAt',
      header: 'Último acceso',
      render: (r: User) => formatDateTime(r.lastLoginAt),
    },
    {
      key: 'actions',
      header: '',
      width: '140px',
      render: (r: User) => (
        <TableActions>
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => setChangePwdUser(r)}>Contraseña</Button>
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
        title="Usuarios"
        subtitle="Gestión de usuarios del sistema"
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>+ Nuevo usuario</Button>
          ) : undefined
        }
      />

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon="👤" title="Sin usuarios" description="Crea el primer usuario del sistema." />
        ) : (
          <>
            <Table columns={columns} data={rows} keyExtractor={(r) => r.id} />
            <div style={{ padding: '0 10px' }}>
              <PaginationBar meta={meta} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Modal crear */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetCreate() }}
        title="Nuevo usuario"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); resetCreate() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={subCreate(async (v) => {
                await createMutation.mutateAsync({
                  username: v.username,
                  password: v.password,
                  fullName: v.fullName,
                  email: v.email || undefined,
                  roleId: Number(v.roleId),
                })
              })}
              disabled={subm || createMutation.isPending}
            >
              {subm || createMutation.isPending ? 'Creando…' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <div className={styles.formGrid2}>
          <Input label="Usuario *" {...regCreate('username', { required: 'Usuario requerido' })} error={errCreate.username?.message} />
          <Input
            label="Contraseña *"
            type="password"
            {...regCreate('password', { required: 'Contraseña requerida', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
            error={errCreate.password?.message}
          />
        </div>
        <Input label="Nombre completo *" {...regCreate('fullName', { required: 'Nombre requerido' })} error={errCreate.fullName?.message} />
        <div className={styles.formGrid2} style={{ marginTop: 10 }}>
          <Input label="Email" type="email" {...regCreate('email')} />
          <Select
            label="Rol *"
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="— Seleccionar rol —"
            {...regCreate('roleId', { required: true })}
          />
        </div>
      </Modal>

      {/* Modal editar */}
      <Modal
        isOpen={editUser !== null}
        onClose={() => { setEditUser(null); resetEdit() }}
        title="Editar usuario"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditUser(null); resetEdit() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={subEdit(async (v) => {
                if (!editUser) return
                await updateMutation.mutateAsync({
                  id: editUser.id,
                  dto: { fullName: v.fullName, email: v.email || undefined, roleId: Number(v.roleId) },
                })
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <Input label="Nombre completo *" {...regEdit('fullName', { required: true })} />
        <div className={styles.formGrid2} style={{ marginTop: 10 }}>
          <Input label="Email" type="email" {...regEdit('email')} />
          <Select
            label="Rol *"
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="— Rol —"
            {...regEdit('roleId', { required: true })}
          />
        </div>
      </Modal>

      {/* Modal cambiar contraseña */}
      <Modal
        isOpen={changePwdUser !== null}
        onClose={() => { setChangePwdUser(null); resetPwd() }}
        title={`Cambiar contraseña — ${changePwdUser?.username ?? ''}`}
        size="narrow"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setChangePwdUser(null); resetPwd() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={subPwd(async (v) => {
                if (!changePwdUser) return
                await pwdMutation.mutateAsync({ id: changePwdUser.id, newPassword: v.newPassword })
              })}
              disabled={pwdMutation.isPending}
            >
              {pwdMutation.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
          </>
        }
      >
        <Input label="Nueva contraseña *" type="password" {...regPwd('newPassword', { required: true })} />
      </Modal>
    </div>
  )
}
