<template>
  <div class="page">
    <div class="card">
      <div class="head">
        <div class="avatar">{{ initials }}</div>
        <div>
          <h2>{{ t('setup_title') }}</h2>
          <p class="sub">{{ t('setup_sub') }}</p>
        </div>
      </div>

      <form @submit.prevent="submit">
        <div class="field">
          <label>{{ t('profile_fname') }}</label>
          <input v-model="firstName" :placeholder="t('profile_fname')" />
        </div>
        <div class="field">
          <label>{{ t('profile_lname') }}</label>
          <input v-model="lastName" :placeholder="t('profile_lname')" />
        </div>
        <div class="field">
          <label>{{ t('profile_phone') }}</label>
          <input v-model="phone" placeholder="+993 65 000000" type="tel" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="loading || !valid">
          {{ loading ? '...' : t('setup_save') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, bffHeaders } from '../stores/auth'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const auth   = useAuthStore()
const { t }  = useI18n()
const API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const firstName = ref('')
const lastName  = ref('')
const phone     = ref('')
const error     = ref('')
const loading   = ref(false)

const valid    = computed(() => firstName.value.trim() && lastName.value.trim() && phone.value.trim())
const initials = computed(() => {
  const f = firstName.value[0] ?? ''
  const l = lastName.value[0]  ?? ''
  return (f + l).toUpperCase() || '?'
})

async function submit() {
  if (!valid.value) return
  error.value   = ''
  loading.value = true
  try {
    const res = await fetch(`${API}/profile`, {
      method:  'POST',
      headers: bffHeaders(),
      body:    JSON.stringify({
        first_name: firstName.value.trim(),
        last_name:  lastName.value.trim(),
        phone:      phone.value.trim(),
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? 'error')
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 24px;
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
  gap: 28px;
}

.head { display: flex; align-items: center; gap: 16px; }

.avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800;
  flex-shrink: 0;
}

h2 { font-size: 18px; font-weight: 800; }
.sub { font-size: 13px; color: var(--muted); margin-top: 2px; }

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
}

input:focus { border-color: var(--accent); }

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
  margin-top: 4px;
}

.btn-primary:disabled { opacity: .45; }
</style>
