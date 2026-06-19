import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { surveysApi } from '@/api/surveys.api'
import { networkApi } from '@/api/network.api'
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
import { getApiErrorMessage } from '@/api/client'
import { copyText } from '@/utils/clipboard'
import { PERMISSIONS } from '@/utils/permissions'
import type { SurveyQuestion, CreateSurveyQuestionDto, SurveyAnswerType } from '@/types/surveys'
import styles from './SurveyQuestionsPage.module.css'

const ANSWER_TYPE_LABELS: Record<SurveyAnswerType, string> = {
  SCALE_1_5: 'Escala 1 a 5',
  SCALE_1_10: 'Escala 1 a 10',
  EMOJI: 'Caritas / íconos',
}

export default function SurveyQuestionsPage() {
  const canManage = usePermission(PERMISSIONS.SURVEYS_CONFIG_MANAGE)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<SurveyQuestion | null>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['surveys', 'questions'],
    queryFn: surveysApi.questions.list,
  })

  const { data: localAccess } = useQuery({
    queryKey: ['network', 'local-access'],
    queryFn: networkApi.localAccess,
    staleTime: 60_000,
  })

  const surveyUrl = localAccess?.primaryIp ? `http://${localAccess.primaryIp}/encuestas` : null

  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateSurveyQuestionDto>()

  function invalidate() {
    return qc.invalidateQueries({ queryKey: ['surveys', 'questions'] })
  }

  const createMutation = useMutation({
    mutationFn: (dto: CreateSurveyQuestionDto) => surveysApi.questions.create(dto),
    onSuccess: async () => {
      await invalidate()
      toast.success('Pregunta creada correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al crear la pregunta')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateSurveyQuestionDto> }) =>
      surveysApi.questions.update(id, dto),
    onSuccess: async () => {
      await invalidate()
      toast.success('Pregunta actualizada correctamente')
      handleClose()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al actualizar la pregunta')),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => surveysApi.questions.toggle(id),
    onSuccess: invalidate,
  })

  const reorderMutation = useMutation({
    mutationFn: surveysApi.questions.reorder,
    onSuccess: invalidate,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Error al reordenar')),
  })

  function handleClose() {
    setShowForm(false)
    setEditItem(null)
    reset()
  }

  function handleEdit(item: SurveyQuestion) {
    setEditItem(item)
    reset({ text: item.text, answerType: item.answerType })
    setShowForm(true)
  }

  async function onSubmit(values: CreateSurveyQuestionDto) {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, dto: values })
    } else {
      await createMutation.mutateAsync({ ...values, displayOrder: sorted.length })
    }
  }

  async function handleCopyUrl() {
    if (!surveyUrl) return
    try {
      await copyText(surveyUrl)
      toast.success('URL copiada')
    } catch {
      toast.error('No se pudo copiar la URL')
    }
  }

  function move(item: SurveyQuestion, direction: -1 | 1) {
    const index = sorted.findIndex((q) => q.id === item.id)
    const swapWith = sorted[index + direction]
    if (!swapWith) return
    reorderMutation.mutate({
      items: [
        { id: item.id, displayOrder: swapWith.displayOrder },
        { id: swapWith.id, displayOrder: item.displayOrder },
      ],
    })
  }

  const columns = [
    { key: 'text', header: 'Pregunta' },
    {
      key: 'answerType',
      header: 'Tipo de respuesta',
      render: (r: SurveyQuestion) => ANSWER_TYPE_LABELS[r.answerType],
    },
    {
      key: 'isActive',
      header: 'Estado',
      width: '90px',
      render: (r: SurveyQuestion) =>
        r.isActive ? <Badge variant="green">Activa</Badge> : <Badge variant="gray">Inactiva</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '220px',
      render: (r: SurveyQuestion) => (
        <TableActions>
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => move(r, -1)} disabled={reorderMutation.isPending}>
                ↑
              </Button>
              <Button size="sm" variant="ghost" onClick={() => move(r, 1)} disabled={reorderMutation.isPending}>
                ↓
              </Button>
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
        title="Encuesta de satisfacción"
        subtitle="Preguntas mostradas en la pantalla de captura. La encuesta es anónima."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              + Nueva pregunta
            </Button>
          ) : undefined
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <div className={styles.urlPanel}>
          <div className={styles.urlInfo}>
            <span className={styles.urlLabel}>URL de la encuesta (pantalla pública, sin login)</span>
            {surveyUrl ? (
              <a className={styles.urlValue} href={surveyUrl} target="_blank" rel="noreferrer">
                {surveyUrl}
              </a>
            ) : (
              <span className={styles.urlValue}>Detectando IP de la red local…</span>
            )}
          </div>
          <div className={styles.urlActions}>
            <Button variant="secondary" size="sm" onClick={handleCopyUrl} disabled={!surveyUrl}>
              Copiar URL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => surveyUrl && window.open(surveyUrl, '_blank')}
              disabled={!surveyUrl}
            >
              Abrir encuesta
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="flush">
        {isLoading ? (
          <Loading />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Sin preguntas configuradas"
            description={canManage ? 'Agrega la primera pregunta de la encuesta.' : 'No hay preguntas configuradas.'}
          />
        ) : (
          <Table columns={columns} data={sorted} keyExtractor={(r) => r.id} />
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editItem ? 'Editar pregunta' : 'Nueva pregunta'}
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
        <Input label="Pregunta *" {...register('text', { required: 'Requerido' })} />
        <Select
          label="Tipo de respuesta *"
          options={[
            { value: 'SCALE_1_5', label: ANSWER_TYPE_LABELS.SCALE_1_5 },
            { value: 'SCALE_1_10', label: ANSWER_TYPE_LABELS.SCALE_1_10 },
            { value: 'EMOJI', label: ANSWER_TYPE_LABELS.EMOJI },
          ]}
          {...register('answerType', { required: true })}
        />
      </Modal>
    </div>
  )
}
