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
        <button :class="{ active: mode === 'login' }"    @click="switchMode('login')">{{ t('login_tab') }}</button>
        <button :class="{ active: mode === 'register' }" @click="switchMode('register')">{{ t('login_register_tab') }}</button>
        <button :class="{ active: mode === 'otp' }"      @click="switchMode('otp')">Email</button>
      </div>

      <!-- Login / Register form -->
      <form v-if="mode !== 'otp'" @submit.prevent="submit">
        <div class="field">
          <label>{{ t('login_username') }}</label>
          <input v-model="username" placeholder="username" autocomplete="username" />
        </div>

        <div v-if="mode === 'register'" class="field">
          <label>{{ t('login_email') }}</label>
          <input v-model="email" type="email" placeholder="example@mail.com" autocomplete="email" />
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

      <!-- OTP form -->
      <div v-else class="otp-flow">
        <!-- Step 1: enter email -->
        <form v-if="otpStep === 'email'" @submit.prevent="sendOtp" class="otp-form">
          <div class="field">
            <label>Email</label>
            <input v-model="otpEmail" type="email" placeholder="your@email.com" autocomplete="email" />
          </div>
          <p class="otp-hint">Отправим 6-значный код на вашу почту</p>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit" class="btn-primary" :disabled="loading || !otpEmail">
            {{ loading ? '...' : 'Получить код' }}
          </button>
        </form>

        <!-- Step 2: enter OTP code -->
        <div v-else class="otp-form">
          <p class="otp-sent-hint">Код отправлен на<br><strong>{{ otpEmail }}</strong></p>
          <div class="otp-boxes">
            <input
              v-for="(_, i) in otpDigits"
              :key="i"
              :ref="el => { if (el) otpRefs[i] = el as HTMLInputElement }"
              v-model="otpDigits[i]"
              class="otp-box"
              type="text"
              inputmode="numeric"
              maxlength="1"
              @input="onOtpInput(i)"
              @keydown.backspace="onOtpBackspace(i)"
              @paste.prevent="onOtpPaste($event)"
            />
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <button class="btn-primary" :disabled="loading || otpDigits.join('').length < 6" @click="verifyOtp">
            {{ loading ? '...' : 'Войти' }}
          </button>
          <button class="btn-link" @click="otpStep = 'email'; error = ''">← Изменить email</button>
        </div>
      </div>
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

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const mode        = ref<'login' | 'register' | 'otp'>('login')
const username    = ref('')
const email       = ref('')
const password    = ref('')
const confirm     = ref('')
const showPass    = ref(false)
const showConfirm = ref(false)
const error       = ref('')
const loading     = ref(false)

// OTP state
const otpStep   = ref<'email' | 'code'>('email')
const otpEmail  = ref('')
const otpDigits = ref<string[]>(Array(6).fill(''))
const otpRefs   = ref<HTMLInputElement[]>([])

function switchMode(m: 'login' | 'register' | 'otp') {
  mode.value    = m
  error.value   = ''
  otpStep.value = 'email'
  otpDigits.value = Array(6).fill('')
}

function onOtpInput(i: number) {
  const val = otpDigits.value[i]
  if (val && i < 5) otpRefs.value[i + 1]?.focus()
}

function onOtpBackspace(i: number) {
  if (!otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = ''
    otpRefs.value[i - 1]?.focus()
  }
}

function onOtpPaste(e: ClipboardEvent) {
  const digits = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) otpDigits.value[i] = digits[i] ?? ''
  otpRefs.value[Math.min(digits.length, 5)]?.focus()
}

async function sendOtp() {
  error.value   = ''
  loading.value = true
  try {
    const res = await fetch(`${API}/auth/send-otp`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email: otpEmail.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Ошибка отправки')
    otpStep.value = 'code'
    setTimeout(() => otpRefs.value[0]?.focus(), 100)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  error.value   = ''
  loading.value = true
  try {
    const res = await fetch(`${API}/auth/verify-otp`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email: otpEmail.value, code: otpDigits.value.join('') }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Неверный код')
    auth.applyResponse(data)
    if (data.chat_token) registerPushNotifications(data.chat_token).catch(() => {})
    router.push('/contacts')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Конверты: разные размеры, позиции, скорости, дрейф по X
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
    } else {
      if (password.value !== confirm.value) return
      await auth.register(username.value, password.value, email.value)
    }
    if (auth.chat_token) {
      registerPushNotifications(auth.chat_token).catch(() => {})
    }
    router.push('/contacts')
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

/* ── Конверты ──────────────────────────────────────────────────────────────── */
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
  0% {
    transform: translateY(0) translateX(0) rotate(-8deg);
    opacity: 0;
  }
  8% {
    opacity: var(--env-op, .1);
  }
  45% {
    transform: translateY(-50vh) translateX(calc(var(--tx, 0) * .5)) rotate(4deg);
  }
  88% {
    opacity: var(--env-op, .1);
  }
  100% {
    transform: translateY(-115vh) translateX(var(--tx, 0)) rotate(-6deg);
    opacity: 0;
  }
}

/* ── Карточка ──────────────────────────────────────────────────────────────── */
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

.logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 42px;
  filter: drop-shadow(0 4px 10px rgba(var(--accent-rgb), 0.3));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

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

form { 
  display: flex; 
  flex-direction: column; 
  gap: 18px; 
}

.field { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
}

.field label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrap input { 
  width: 100%; 
  padding-right: 44px; 
}

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
  background: var(--surface);
}

input::placeholder {
  color: var(--muted);
  opacity: 0.6;
}

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

.eye-btn:hover {
  opacity: 1;
}

.field-error {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
  margin-top: 2px;
}

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

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  box-shadow: none;
}

/* ── OTP ───────────────────────────────────────────────────────────────────── */
.otp-flow { display: flex; flex-direction: column; }
.otp-form { display: flex; flex-direction: column; gap: 18px; }

.otp-hint {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  margin: -6px 0;
}

.otp-sent-hint {
  font-size: 14px;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
}
.otp-sent-hint strong { color: var(--text); }

.otp-boxes {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.otp-box {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  border-radius: 12px;
  padding: 0;
  caret-color: var(--accent);
}
.otp-box:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.15);
}

.btn-link {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  cursor: pointer;
  padding: 4px;
  transition: color 0.15s;
}
.btn-link:hover { color: var(--text); }
</style>
