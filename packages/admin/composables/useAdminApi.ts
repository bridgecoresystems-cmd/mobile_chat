export function useAdminApi() {
  const config  = useRuntimeConfig()
  const apiUrl  = config.public.apiUrl as string
  const token   = useCookie<string | null>('admin_token', { default: () => null })

  function headers() {
    return token.value
      ? { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, { headers: headers() })
    if (res.status === 401 || res.status === 403) {
      token.value = null
      await navigateTo('/login')
      throw new Error('unauthorized')
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).error ?? `HTTP ${res.status}`)
    }
    return res.json()
  }

  async function del<T>(path: string): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, { method: 'DELETE', headers: headers() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async function patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  return { token, get, post, del, patch }
}
