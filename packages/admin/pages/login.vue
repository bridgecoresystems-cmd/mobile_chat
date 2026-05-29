<template>
  <div class="login-page">
    <div class="card">
      <div class="logo">
        <span class="app-name">konekt</span>
        <span class="admin-label">admin panel</span>
      </div>

      <form @submit.prevent="submit">
        <div class="field">
          <label>Имя пользователя</label>
          <input v-model="username" placeholder="admin" autocomplete="username" />
        </div>
        <div class="field">
          <label>Пароль</label>
          <input v-model="password" type="password" placeholder="••••••" autocomplete="current-password" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn" :disabled="loading">
          {{ loading ? '...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const config  = useRuntimeConfig()
const apiUrl  = config.public.apiUrl as string
const token   = useCookie<string | null>('admin_token', { default: () => null })

const username = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: username.value, password: password.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Ошибка входа')

    // Check admin flag
    const profileRes = await fetch(`${apiUrl}/profile`, {
      headers: { Authorization: `Bearer ${data.token}` },
    })
    const profile = await profileRes.json()
    if (!profile.is_admin) throw new Error('Нет доступа к панели администратора')

    token.value = data.token
    await navigateTo('/')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at 30% 20%, rgba(99,102,241,0.08), transparent 50%), var(--bg);
}

.card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  box-shadow: var(--shadow);
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.app-name {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.admin-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

input {
  background: var(--surface2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  width: 100%;
  transition: border-color 0.15s;
}

input:focus { border-color: var(--accent); outline: none; }

.error {
  background: var(--danger-dim);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--danger);
}

.btn {
  background: linear-gradient(135deg, #6366f1, #7c3aed);
  color: #fff;
  border-radius: 10px;
  padding: 13px;
  font-weight: 700;
  font-size: 15px;
  width: 100%;
  transition: opacity 0.15s;
  margin-top: 4px;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn:hover:not(:disabled) { opacity: 0.9; }
</style>
