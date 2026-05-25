<template>
  <AppLayout>
    <div class="page">
      <header>
        <h1>Профиль</h1>
        <button class="edit-btn" @click="editing = !editing">
          {{ editing ? 'Отмена' : 'Изменить' }}
        </button>
      </header>

      <div class="avatar-section">
        <div class="avatar">{{ initials }}</div>
        <div>
          <p class="display-name">{{ displayName }}</p>
          <p class="username">@{{ auth.user?.username }}</p>
        </div>
      </div>

      <form v-if="editing" class="form" @submit.prevent="save">
        <div class="field">
          <label>Имя</label>
          <input v-model="form.first_name" placeholder="Имя" />
        </div>
        <div class="field">
          <label>Фамилия</label>
          <input v-model="form.last_name" placeholder="Фамилия" />
        </div>
        <div class="field">
          <label>Телефон</label>
          <input v-model="form.phone" placeholder="+993 65 000000" type="tel" />
        </div>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? '...' : 'Сохранить' }}
        </button>
      </form>

      <div v-else class="info-list">
        <div class="info-row">
          <span class="label">Имя</span>
          <span>{{ profile?.first_name ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Фамилия</span>
          <span>{{ profile?.last_name ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Телефон</span>
          <span>{{ profile?.phone ?? '—' }}</span>
        </div>
      </div>

      <div class="footer">
        <button class="logout-btn" @click="logout">Выйти из аккаунта</button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { useAuthStore, bffHeaders } from '../stores/auth'
import type { Profile } from '@chat/shared'

const router  = useRouter()
const auth    = useAuthStore()
const API     = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const profile   = ref<Profile | null>(null)
const editing   = ref(false)
const saving    = ref(false)
const saveError = ref('')
const form      = ref({ first_name: '', last_name: '', phone: '' })

const displayName = computed(() => {
  if (profile.value?.first_name) return `${profile.value.first_name} ${profile.value.last_name}`
  return auth.user?.username ?? ''
})

const initials = computed(() => {
  if (profile.value?.first_name) {
    return (profile.value.first_name[0] + profile.value.last_name[0]).toUpperCase()
  }
  return (auth.user?.username?.[0] ?? '?').toUpperCase()
})

async function load() {
  const res = await fetch(`${API}/profile`, { headers: bffHeaders() })
  if (res.ok) {
    const d = await res.json()
    profile.value = d.profile
    if (d.profile) {
      form.value = { first_name: d.profile.first_name, last_name: d.profile.last_name, phone: d.profile.phone }
    }
  }
}

async function save() {
  saving.value    = true
  saveError.value = ''
  try {
    const res = await fetch(`${API}/profile`, {
      method: 'POST', headers: bffHeaders(),
      body: JSON.stringify(form.value),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
    await load()
    editing.value = false
  } catch (e: any) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(load)
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

h1 { font-size: 18px; font-weight: 800; }

.edit-btn { font-size: 14px; color: var(--accent); font-weight: 600; }

.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--border);
}

.avatar {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 800;
  flex-shrink: 0;
}

.display-name { font-size: 18px; font-weight: 700; }
.username     { font-size: 13px; color: var(--muted); margin-top: 2px; }

.form {
  padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 12px; font-weight: 600;
  color: var(--muted); text-transform: uppercase; letter-spacing: .5px;
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
  border-radius: 8px; padding: 10px 12px;
}

.btn-primary {
  background: var(--accent); color: #fff;
  border-radius: 10px; padding: 13px;
  font-weight: 700; font-size: 15px; width: 100%;
}

.btn-primary:disabled { opacity: .45; }

.info-list { padding: 8px 0; }

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 15px;
}

.label { color: var(--muted); font-size: 14px; }

.footer {
  padding: 24px 20px;
  margin-top: auto;
}

.logout-btn {
  width: 100%;
  padding: 13px;
  border-radius: 10px;
  border: 1.5px solid rgba(239,68,68,.4);
  color: #ef4444;
  font-weight: 600;
  font-size: 15px;
}
</style>
