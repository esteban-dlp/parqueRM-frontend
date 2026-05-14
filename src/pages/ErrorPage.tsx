import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

export default function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  let status: number | undefined
  let message = 'Ocurrió un error inesperado.'

  if (isRouteErrorResponse(error)) {
    status = error.status
    if (error.status === 404) message = 'La página que buscas no existe.'
    else if (error.status === 403) message = 'No tienes permiso para acceder a esta página.'
    else message = error.statusText || message
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      background: 'var(--bg-page, #f5f5f5)',
      color: 'var(--text-primary, #111)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-danger, #dc2626)' }}>
        {status ?? '!'}
      </div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
        Algo salió mal
      </h1>
      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary, #555)', margin: 0, maxWidth: 400 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 20px',
            borderRadius: '6px',
            border: 'none',
            background: 'var(--color-primary, #2563eb)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Volver al dashboard
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px',
            borderRadius: '6px',
            border: '1px solid var(--border, #d1d5db)',
            background: 'transparent',
            color: 'var(--text-primary, #111)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Recargar
        </button>
      </div>
      {import.meta.env.DEV && error instanceof Error && (
        <pre style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '6px',
          background: '#1e1e1e',
          color: '#f8f8f2',
          fontSize: '0.75rem',
          textAlign: 'left',
          maxWidth: '600px',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {error.stack ?? error.message}
        </pre>
      )}
    </div>
  )
}
