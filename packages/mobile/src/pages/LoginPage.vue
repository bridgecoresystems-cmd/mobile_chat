<template>
  <div class="page">
    <div class="card">
      <div class="logo-wrap">
        <div class="logo-icon">💬</div>
        <h1>BridgeCore Chat</h1>
      </div>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }"    @click="mode = 'login'">{{ t('login_tab') }}</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">{{ t('login_register_tab') }}</button>
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
              {{ showPass ? '🙈' : '👁' }}
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
              {{ showConfirm ? '🙈' : '👁' }}
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

const router   = useRouter()
const auth     = useAuthStore()
const { t }    = useI18n()

const mode        = ref<'login' | 'register'>('login')
const username    = ref('')
const password    = ref('')
const confirm     = ref('')
const showPass    = ref(false)
const showConfirm = ref(false)
const error       = ref('')
const loading     = ref(false)

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(username.value, password.value)
    } else {
      if (password.value !== confirm.value) return
      await auth.register(username.value, password.value)
    }
    // Регистрируем FCM токен (только на нативном устройстве)
    if (auth.chat_token) {
      registerPushNotifications(auth.chat_token).catch(() => {})
    }
    // После входа — роутер сам проверит профиль и перенаправит на /setup если нужно
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

.logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo-icon { font-size: 36px; }

h1 {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.3px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--bg);
  border-radius: 10px;
  padding: 4px;
}

.tabs button {
  flex: 1;
  padding: 9px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  transition: all .15s;
}

.tabs button.active {
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,.3);
}

form { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrap input { width: 100%; padding-right: 40px; }

input {
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  width: 100%;
  transition: border-color .15s;
}

input:focus { border-color: var(--accent); }

.eye-btn {
  position: absolute;
  right: 10px;
  font-size: 16px;
  color: var(--muted);
  padding: 4px;
  background: none;
  border: none;
}

.field-error {
  font-size: 12px;
  color: #f87171;
}

.error {
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.3);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: #f87171;
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
  margin-top: 4px;
}

.btn-primary:disabled { opacity: .45; }
</style>
