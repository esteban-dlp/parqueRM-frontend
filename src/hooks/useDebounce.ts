import { useEffect, useRef, useState } from 'react'

export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delayMs = 400,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  return ((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delayMs)
  }) as T
}
