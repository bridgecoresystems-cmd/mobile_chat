<template>
  <div class="page">

    <!-- Летящие конверты (фон) -->
    <div class="envelopes" aria-hidden="true">
      <div v-for="e in envelopes" :key="e.id" class="env" :style="e.style">
        <svg :width="e.size" :height="e.size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="e.stroke">
          <rect x="2" y="4" width="20" height="16" rx="2.5"/>
          <polyline points="2,4 12,13.5 22,4"/>
          <line x1="2" y1="20" x2="8" y2="13"/>
          <line x1="22" y1="20" x2="16" y2="13"/>
        </svg>
      </div>
    </div>

    <div class="card">
      <div class="logo-wrap">
        <h1>konekt</h1>
      </div>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }"    @click="mode = 'login'; error = ''">{{ t('login_tab') }}</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'; error = ''">{{ t('login_register_tab') }}</button>
      </div>

      <form @submit.prevent="submit">
        <div class="field">
          <label>{{ t('login_username') }}</label>
          <input v-model="username" placeholder="username" autocomplete="username" />
        </div>

        <div class="field">
          <label>{{ t('login_password') }}</label>
          <div class="input-wrap">
            <input
              v-model="password"
              :type="showPass ? 'text' : 'password'"
              placeholder="••••••"
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" @click="showPass = !showPass">
              <svg v-if="showPass" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="mode === 'register'" class="field">
          <label>{{ t('login_confirm') }}</label>
          <div class="input-wrap">
            <input
              v-model="confirm"
              :type="showConfirm ? 'text' : 'password'"
              placeholder="••••••"
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="showConfirm = !showConfirm">
              <svg v-if="showConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <p v-if="confirm && password !== confirm" class="field-error">{{ t('login_mismatch') }}</p>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button
          type="submit"
          class="btn-primary"
          :disabled="loading || (mode === 'register' && password !== confirm)"
        >
          {{ loading ? '...' : mode === 'login' ? t('login_submit') : t('login_register_btn') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { registerPushNotifications } from '../composables/usePushNotifications'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const auth   = useAuthStore()
const { t }  = useI18n()

const mode        = ref<'login' | 'register'>('login')
const username    = ref('')
const password    = ref('')
const confirm     = ref('')
const showPass    = ref(false)
const showConfirm = ref(false)
const error       = ref('')
const loading     = ref(false)

const envelopes = [
  { id: 1, size: 32, stroke: 1.2, style: { left: '6%',  animationDuration: '9s',  animationDelay: '0s',    '--tx': '12vw',  '--env-op': 0.35 } },
  { id: 2, size: 18, stroke: 1.4, style: { left: '20%', animationDuration: '13s', animationDelay: '-5s',   '--tx': '-8vw',  '--env-op': 0.26 } },
  { id: 3, size: 26, stroke: 1.2, style: { left: '42%', animationDuration: '11s', animationDelay: '-2s',   '--tx': '6vw',   '--env-op': 0.30 } },
  { id: 4, size: 14, stroke: 1.6, style: { left: '58%', animationDuration: '15s', animationDelay: '-8s',   '--tx': '-14vw', '--env-op': 0.22 } },
  { id: 5, size: 36, stroke: 1.1, style: { left: '72%', animationDuration: '10s', animationDelay: '-3s',   '--tx': '10vw',  '--env-op': 0.28 } },
  { id: 6, size: 20, stroke: 1.4, style: { left: '85%', animationDuration: '12s', animationDelay: '-7s',   '--tx': '-6vw',  '--env-op': 0.32 } },
  { id: 7, size: 24, stroke: 1.3, style: { left: '33%', animationDuration: '14s', animationDelay: '-11s',  '--tx': '16vw',  '--env-op': 0.26 } },
  { id: 8, size: 16, stroke: 1.5, style: { left: '92%', animationDuration: '8s',  animationDelay: '-4s',   '--tx': '-10vw', '--env-op': 0.30 } },
]

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(username.value, password.value)
      if (auth.chat_token) registerPushNotifications(auth.chat_token).catch(() => {})
      router.push(auth.email_verified ? '/contacts' : '/setup')
    } else {
      if (password.value !== confirm.value) return
      await auth.register(username.value, password.value)
      router.push('/setup')
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 24px;
  background: radial-gradient(circle at top left, rgba(var(--accent-rgb), 0.08), transparent 40%),
              radial-gradient(circle at bottom right, rgba(var(--accent-rgb), 0.05), transparent 40%),
              var(--bg);
  overflow: hidden;
  animation: fadeIn 0.4s ease;
}

.envelopes {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.env {
  position: absolute;
  bottom: -60px;
  color: var(--accent);
  animation: flyUp linear infinite;
  will-change: transform, opacity;
}

@keyframes flyUp {
  0%   { transform: translateY(0) translateX(0) rotate(-8deg); opacity: 0; }
  8%   { opacity: var(--env-op, .1); }
  45%  { transform: translateY(-50vh) translateX(calc(var(--tx, 0) * .5)) rotate(4deg); }
  88%  { opacity: var(--env-op, .1); }
  100% { transform: translateY(-115vh) translateX(var(--tx, 0)) rotate(-6deg); opacity: 0; }
}

.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 380px;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  box-shadow: var(--shadow);
  animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.logo-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }

h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -1px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--other-bg);
  border-radius: 14px;
  padding: 4px;
}

.tabs button {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tabs button.active {
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

form  { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 8px; }

.field label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-wrap { position: relative; display: flex; align-items: center; }
.input-wrap input { width: 100%; padding-right: 44px; }

input {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--text);
  width: 100%;
  transition: all 0.2s ease;
  font-weight: 500;
}

input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.1);
}

input::placeholder { color: var(--muted); opacity: 0.6; }

.eye-btn {
  position: absolute;
  right: 14px;
  font-size: 16px;
  color: var(--muted);
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.eye-btn:hover { opacity: 1; }

.field-error { font-size: 12px; color: #ef4444; font-weight: 500; margin-top: 2px; }

.error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  color: #ef4444;
  font-weight: 500;
}

.btn-primary {
  background: var(--accent-gradient);
  color: var(--text-inverse);
  border-radius: 12px;
  padding: 14px;
  font-weight: 700;
  font-size: 15px;
  width: 100%;
  box-shadow: 0 4px 15px rgba(var(--accent-rgb), 0.3);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.4); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; box-shadow: none; }
</style>
