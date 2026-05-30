<template>
  <div class="page">
    <div class="card">

      <!-- ── Форма профиля ─────────────────────────────────────────────── -->
      <template v-if="step === 'form'">
        <div class="head">
          <div class="avatar">{{ initials }}</div>
          <div>
            <h2>{{ t('setup_title') }}</h2>
            <p class="sub">{{ t('setup_sub') }}</p>
          </div>
        </div>

        <form @submit.prevent="submitProfile">
          <div class="field">
            <label>{{ t('profile_fname') }}</label>
            <input v-model="firstName" :placeholder="t('profile_fname')" />
          </div>
          <div class="field">
            <label>{{ t('profile_lname') }}</label>
            <input v-model="lastName" :placeholder="t('profile_lname')" />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="your@email.com" autocomplete="email" />
          </div>
          <div class="field">
            <label>{{ t('profile_phone') }}</label>
            <input v-model="phone" placeholder="+993 65 000000" type="tel" />
          </div>

          <p class="privacy">
            Нажимая кнопку, вы соглашаетесь с нашей
            <a href="#" @click.prevent>Политикой конфиденциальности</a>
            и <a href="#" @click.prevent>Условиями использования</a>.
          </p>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" class="btn-primary" :disabled="loading || !formValid">
            {{ loading ? '...' : t('setup_save') }}
          </button>
        </form>
      </template>

      <!-- ── OTP экран ─────────────────────────────────────────────────── -->
      <template v-else>
        <div class="otp-head">
          <div class="otp-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2.5"/>
              <polyline points="2,4 12,13 22,4"/>
            </svg>
          </div>
          <h2>Подтвердите email</h2>
          <p class="sub">Код отправлен на<br><strong>{{ email }}</strong></p>
        </div>

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
          {{ loading ? '...' : 'Подтвердить и продолжить' }}
        </button>

        <div class="resend-row">
          <span class="resend-hint">Не пришёл код?</span>
          <button class="btn-link" :disabled="resendCooldown > 0" @click="resendOtp">
            {{ resendCooldown > 0 ? `Отправить повторно (${resendCooldown}с)` : 'Отправить повторно' }}
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, bffHeaders } from '../stores/auth'
import { registerPushNotifications } from '../composables/usePushNotifications'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const auth   = useAuthStore()
const { t }  = useI18n()
const API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ── Form state ────────────────────────────────────────────────────────────────
const step      = ref<'form' | 'otp'>('form')
const firstName = ref('')
const lastName  = ref('')
const email     = ref('')
const phone     = ref('')
const error     = ref('')
const loading   = ref(false)

const formValid = computed(() =>
  firstName.value.trim() && lastName.value.trim() &&
  email.value.includes('@') && phone.value.trim()
)

const initials = computed(() => {
  const f = firstName.value[0] ?? ''
  const l = lastName.value[0]  ?? ''
  return (f + l).toUpperCase() || '?'
})

// ── OTP state ─────────────────────────────────────────────────────────────────
const otpDigits     = ref<string[]>(Array(6).fill(''))
const otpRefs       = ref<HTMLInputElement[]>([])
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onUnmounted(() => { if (cooldownTimer) clearInterval(cooldownTimer) })

function onOtpInput(i: number) {
  const v = otpDigits.value[i]
  if (v && i < 5) otpRefs.value[i + 1]?.focus()
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

// ── Handlers ──────────────────────────────────────────────────────────────────
async function submitProfile() {
  if (!formValid.value) return
  error.value   = ''
  loading.value = true
  try {
    // 1. Save profile (also updates email in users table)
    const res = await fetch(`${API}/profile`, {
      method:  'POST',
      headers: bffHeaders(),
      body:    JSON.stringify({
        first_name: firstName.value.trim(),
        last_name:  lastName.value.trim(),
        email:      email.value.trim(),
        phone:      phone.value.trim(),
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? 'Ошибка сохранения')
    }

    // 2. Send OTP to email
    const otpRes = await fetch(`${API}/auth/send-otp`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email: email.value.trim() }),
    })
    if (!otpRes.ok) {
      const d = await otpRes.json()
      throw new Error(d.error ?? 'Ошибка отправки кода')
    }

    // 3. Show OTP screen
    step.value = 'otp'
    startCooldown()
    setTimeout(() => otpRefs.value[0]?.focus(), 150)
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
      body:    JSON.stringify({ email: email.value.trim(), code: otpDigits.value.join('') }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Неверный код')

    if (auth.chat_token) registerPushNotifications(auth.chat_token).catch(() => {})
    router.push('/contacts')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function resendOtp() {
  error.value = ''
  try {
    const res = await fetch(`${API}/auth/send-otp`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email: email.value.trim() }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? 'Ошибка')
    }
    otpDigits.value = Array(6).fill('')
    startCooldown()
    setTimeout(() => otpRefs.value[0]?.focus(), 100)
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<style scoped>
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 24px;
  background: var(--bg);
}

.card {
  width: 100%;
  max-width: 380px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Profile form ──────────────────────────────────────────────────────────── */
.head { display: flex; align-items: center; gap: 16px; }

.avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800;
  flex-shrink: 0;
  color: #fff;
}

h2   { font-size: 18px; font-weight: 800; }
.sub { font-size: 13px; color: var(--muted); margin-top: 3px; line-height: 1.5; }

form { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
}

input {
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  width: 100%;
  font-size: 15px;
  transition: border-color .15s;
}
input:focus { border-color: var(--accent); outline: none; }

.privacy {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  text-align: center;
  margin-top: 2px;
}
.privacy a { color: var(--accent); text-decoration: none; }

.error {
  font-size: 13px; color: #f87171;
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.3);
  border-radius: 8px;
  padding: 10px 12px;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border-radius: 10px;
  padding: 13px;
  font-weight: 700;
  font-size: 15px;
  width: 100%;
  transition: opacity .15s;
}
.btn-primary:disabled { opacity: .45; }

/* ── OTP screen ────────────────────────────────────────────────────────────── */
.otp-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.otp-icon { color: var(--accent); }
.otp-head h2 { font-size: 20px; font-weight: 800; }

.otp-boxes {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.otp-box {
  flex: 1;
  min-width: 0;
  max-width: 44px;
  height: 52px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  border-radius: 10px;
  padding: 0;
  caret-color: var(--accent);
}
.otp-box:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15);
  outline: none;
}

.resend-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.resend-hint { font-size: 13px; color: var(--muted); }
.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.btn-link:disabled { color: var(--muted); cursor: default; }
</style>
