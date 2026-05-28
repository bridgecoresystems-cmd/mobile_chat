import { reactive } from "vue"
import type { User, AuthResponse } from "@chat/shared"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

interface AuthState {
  user:       User | null
  token:      string | null  // BFF JWT (7d)
  chat_token: string | null  // Rust engine JWT (7d)
}

function load(): AuthState {
  try {
    const raw = localStorage.getItem("auth")
    return raw ? JSON.parse(raw) : { user: null, token: null, chat_token: null }
  } catch {
    return { user: null, token: null, chat_token: null }
  }
}

const state = reactive<AuthState>(load())

function persist() {
  localStorage.setItem("auth", JSON.stringify(state))
}

function applyResponse(data: AuthResponse) {
  state.user       = data.user
  state.token      = data.token
  state.chat_token = data.chat_token
  persist()
}

// Headers for BFF-protected endpoints
// skipContentType=true используется для FormData (браузер сам проставляет boundary)
export function bffHeaders(opts?: { skipContentType?: boolean }): HeadersInit {
  const h: Record<string, string> = {
    "authorization": `Bearer ${state.token}`,
    "x-chat-token":  state.chat_token ?? "",
  }
  if (!opts?.skipContentType) h["content-type"] = "application/json"
  return h
}

export function useAuthStore() {
  async function register(username: string, password: string) {
    const res = await fetch(`${API}/auth/register`, {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "register failed")
    applyResponse(data as AuthResponse)
  }

  async function login(username: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "login failed")
    applyResponse(data as AuthResponse)
  }

  async function refreshChatToken() {
    const res = await fetch(`${API}/auth/refresh-chat-token`, {
      method:  "POST",
      headers: { "authorization": `Bearer ${state.token}` },
    })
    if (res.ok) {
      const { chat_token } = await res.json()
      state.chat_token = chat_token
      persist()
    }
  }

  function logout() {
    state.user       = null
    state.token      = null
    state.chat_token = null
    localStorage.removeItem("auth")
    window.dispatchEvent(new Event("chat:logout"))
  }

  return {
    get user()       { return state.user },
    get token()      { return state.token },
    get chat_token() { return state.chat_token },
    register,
    login,
    logout,
    refreshChatToken,
  }
}
