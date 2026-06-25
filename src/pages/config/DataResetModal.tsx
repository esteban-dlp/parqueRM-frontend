import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { prepareDataReset, executeDataReset } from '@/api/system.api'
import { getApiErrorMessage } from '@/api/client'

type Step = 1 | 2 | 3 | 'loading' | 'success' | 'error'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const STEP_TITLE: Record<string, string> = {
  '1': 'Eliminar datos operativos — Advertencia',
  '2': 'Confirmar eliminación',
  '3': 'Verificar identidad del administrador',
  'loading': 'Procesando…',
  'success': 'Datos eliminados',
  'error': 'Error al ejecutar',
}

const RESPONSIBILITY =
  'Esta acción queda bajo total responsabilidad del usuario que la está ejecutando. ' +
  'El proveedor, desarrollador o contratista no será responsable por los datos eliminados.'

export function DataResetModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [nonce, setNonce] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function resetState() {
    setStep(1)
    setConfirmText('')
    setPassword('')
    setNonce('')
    setErrorMsg('')
  }

  function handleClose() {
    if (step === 'loading') return
    if (step === 'success') {
      window.location.reload()
      return
    }
    resetState()
    onClose()
  }

  async function handlePrepare() {
    setStep('loading')
    try {
      const result = await prepareDataReset('ELIMINAR')
      setNonce(result.nonce)
      setStep(3)
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Error al preparar la eliminación'))
      setStep('error')
    }
  }

  async function handleExecute() {
    setStep('loading')
    try {
      await executeDataReset(nonce, password)
      setStep('success')
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Error al eliminar los datos'))
      setStep('error')
    }
  }

  const dangerBoxStyle = {
    background: 'var(--danger-light)',
    border: '1px solid var(--danger-border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: 'var(--text-sm)',
    color: 'var(--danger-text)',
    marginBottom: 16,
  }

  const DangerBox = ({ text }: { text: string }) => (
    <div style={dangerBoxStyle}>{text}</div>
  )

  const actions = (primary: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
      <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
      {primary}
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={STEP_TITLE[String(step)] ?? ''} size="narrow">
      {step === 1 && (
        <>
          <DangerBox text={RESPONSIBILITY} />
          <p style={{ marginBottom: 14, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            Esta acción eliminará permanentemente todos los datos operativos de la plataforma:
            visitantes, vehículos, hospedaje, recibos, movimientos de caja, cierres de caja y encuestas respondidas.
          </p>
          <p style={{ marginBottom: 20, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            No se eliminarán: usuarios, roles, permisos, configuración del parque, catálogos ni tarifas.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={handleClose}>No, cancelar</Button>
            <Button variant="danger" onClick={() => setStep(2)}>Sí, continuar</Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <DangerBox text={RESPONSIBILITY} />
          <p style={{ marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            Para confirmar, escriba exactamente la palabra <strong>ELIMINAR</strong> en el campo:
          </p>
          <Input
            label="Escriba ELIMINAR para confirmar"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            autoFocus
          />
          {actions(
            <Button variant="danger" onClick={handlePrepare} disabled={confirmText !== 'ELIMINAR'}>
              Continuar
            </Button>,
          )}
        </>
      )}

      {step === 3 && (
        <>
          <DangerBox text={RESPONSIBILITY} />
          <p style={{ marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            Ingrese su contraseña de administrador para ejecutar la eliminación:
          </p>
          <Input
            label="Contraseña de administrador"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {actions(
            <Button variant="danger" onClick={handleExecute} disabled={!password.trim()}>
              Eliminar datos permanentemente
            </Button>,
          )}
        </>
      )}

      {step === 'loading' && (
        <div style={{
          textAlign: 'center',
          padding: '28px 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
        }}>
          Procesando… por favor espere.
        </div>
      )}

      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{
            background: 'var(--success-light)',
            border: '1px solid var(--success-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: 'var(--text-sm)',
            color: 'var(--success)',
            marginBottom: 20,
          }}>
            Los datos operativos han sido eliminados correctamente.
          </div>
          <Button variant="primary" onClick={handleClose}>
            Cerrar y recargar página
          </Button>
        </div>
      )}

      {step === 'error' && (
        <>
          <DangerBox text={errorMsg} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
