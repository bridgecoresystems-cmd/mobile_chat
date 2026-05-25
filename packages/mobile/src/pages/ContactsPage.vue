<template>
  <AppLayout>
  <div class="page">
    <header>
      <div class="header-left">
        <div class="my-avatar" @click="router.push('/profile')">
          {{ myInitials }}
        </div>
        <h1>Контакты</h1>
      </div>
      <button class="add-btn" @click="router.push('/search')" title="Найти пользователя">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </header>

    <div v-if="loading" class="center"><div class="spinner" /></div>

    <div v-else-if="!contacts.length" class="empty">
      <div class="empty-icon">👥</div>
      <p>Нет контактов</p>
      <span>Нажми «+» чтобы найти людей</span>
    </div>

    <ul v-else class="list">
      <li
        v-for="c in contacts"
        :key="c.contact_id"
        @click="openChat(c)"
      >
        <div class="avatar">{{ contactInitials(c) }}</div>
        <div class="info">
          <span class="name">{{ contactName(c) }}</span>
          <span class="sub">{{ c.phone ?? c.username }}</span>
        </div>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </li>
    </ul>
  </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { useAuthStore, bffHeaders } from '../stores/auth'
import type { Contact } from '@chat/shared'

const router  = useRouter()
const auth    = useAuthStore()
const API     = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const contacts = ref<Contact[]>([])
const loading  = ref(true)

const myInitials = computed(() => {
  const u = auth.user?.username ?? '?'
  return u[0].toUpperCase()
})

function contactName(c: Contact) {
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`
  return c.username ?? c.contact_id
}

function contactInitials(c: Contact) {
  const n = contactName(c)
  const parts = n.split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : n[0].toUpperCase()
}

async function fetchContacts() {
  loading.value = true
  try {
    const res = await fetch(`${API}/contacts`, { headers: bffHeaders() })
    contacts.value = await res.json()
  } finally {
    loading.value = false
  }
}

function openChat(c: Contact) {
  router.push(`/chat/${c.room_id}`)
}

onMounted(fetchContacts)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 12px; }

.my-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
}

h1 { font-size: 18px; font-weight: 800; }

.add-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
}

.center {
  flex: 1; display: flex; align-items: center; justify-content: center;
}

.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: var(--muted);
}

.empty-icon { font-size: 48px; }
.empty p    { font-size: 16px; font-weight: 600; color: var(--text); }
.empty span { font-size: 13px; }

.list { flex: 1; overflow-y: auto; list-style: none; }

.list li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}

.list li:active { background: var(--surface); }

.avatar {
  width: 46px; height: 46px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
  flex-shrink: 0;
}

.info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.name { font-weight: 700; font-size: 15px; }
.sub  { font-size: 12px; color: var(--muted); }

.chevron { color: var(--muted); }
</style>
