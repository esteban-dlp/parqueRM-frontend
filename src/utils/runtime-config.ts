/**
 * Runtime configuration loader.
 *
 * In production, the installer writes /config.json with a same-origin
 * apiUrl ("/api"), so the app keeps working if the server's LAN IP changes.
 * In development, falls back to VITE_API_URL from .env.
 *
 * Must be called before any API client usage (called from main.tsx).
 */
import { apiClient } from '@/api/client'

interface RuntimeConfig {
  apiUrl?: string
}

export async function initRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' })
    if (!response.ok) return

    const config: RuntimeConfig = await response.json()
    if (config.apiUrl) {
      apiClient.defaults.baseURL = config.apiUrl
    }
  } catch {
    // config.json not found — using build-time VITE_API_URL fallback, which is fine for dev
  }
}
