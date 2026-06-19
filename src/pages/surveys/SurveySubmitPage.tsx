import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { surveysApi } from '@/api/surveys.api'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import type { SurveyQuestion } from '@/types/surveys'
import styles from './SurveySubmitPage.module.css'

const EMOJIS = ['😡', '😕', '😐', '🙂', '😄']

function QuestionControl({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: number | undefined
  onChange: (value: number) => void
}) {
  if (question.answerType === 'EMOJI') {
    return (
      <div className={styles.optionsRow}>
        {EMOJIS.map((emoji, i) => (
          <button
            key={emoji}
            type="button"
            className={[styles.emojiBtn, value === i + 1 ? styles.optionActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(i + 1)}
          >
            {emoji}
          </button>
        ))}
      </div>
    )
  }

  const max = question.answerType === 'SCALE_1_10' ? 10 : 5
  const options = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className={styles.optionsRow}>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          className={[styles.scaleBtn, value === n ? styles.optionActive : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function SurveySubmitPage() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['surveys', 'questions', 'active'],
    queryFn: surveysApi.questions.listActive,
  })

  const submitMutation = useMutation({
    mutationFn: surveysApi.responses.submit,
    onSuccess: () => setSubmitted(true),
  })

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined)

  function handleSubmit() {
    if (!allAnswered) return
    submitMutation.mutate({
      answers: questions.map((q) => ({ questionId: q.id, value: answers[q.id] })),
      generalComment: comment.trim() || undefined,
    })
  }

  function startOver() {
    setAnswers({})
    setComment('')
    setSubmitted(false)
  }

  if (isLoading) {
    return (
      <div className={styles.card}>
        <Loading />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className={styles.card}>
        <div className={styles.thankYou}>
          <div className={styles.thankYouIcon}>🙏</div>
          <h1 className={styles.title}>¡Gracias por tu opinión!</h1>
          <p className={styles.subtitle}>Tu respuesta fue enviada de forma anónima.</p>
          <Button variant="primary" onClick={startOver}>Responder otra encuesta</Button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Encuesta de satisfacción</h1>
        <p className={styles.subtitle}>No hay preguntas configuradas en este momento.</p>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Encuesta de satisfacción</h1>
      <p className={styles.subtitle}>Tu respuesta es anónima. No se solicita ningún dato personal.</p>

      {questions.map((q) => (
        <div key={q.id} className={styles.question}>
          <div className={styles.questionText}>{q.text}</div>
          <QuestionControl
            question={q}
            value={answers[q.id]}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
          />
        </div>
      ))}

      <div className={styles.question}>
        <div className={styles.questionText}>Comentarios generales (opcional)</div>
        <textarea
          className={styles.textarea}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
        />
      </div>

      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={!allAnswered || submitMutation.isPending}
        style={{ width: '100%' }}
      >
        {submitMutation.isPending ? 'Enviando…' : 'Enviar encuesta'}
      </Button>
    </div>
  )
}
