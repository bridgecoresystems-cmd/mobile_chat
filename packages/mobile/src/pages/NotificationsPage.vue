<template>
  <AppLayout>
    <div class="page">
      <header>
        <h1>{{ t('notif_title') }}</h1>
      </header>

      <div v-if="loading" class="center"><div class="spinner" /></div>

      <div v-else-if="!notifications.length" class="empty">
        <div class="empty-icon">🔔</div>
        <p>{{ t('notif_empty') }}</p>
        <span>{{ t('notif_empty_sub') }}</span>
      </div>

      <ul v-else class="list">
        <li v-for="n in notifications" :key="n.id" :class="n.status">
          <div class="avatar">{{ senderInitials(n) }}</div>
          <div class="info">
            <span class="name">{{ senderName(n) }}</span>
            <span class="sub">{{ t('notif_wants') }}</span>
            <span class="time">{{ formatTime(n.created_at) }}</span>
          </div>

          <div v-if="n.status === 'pending'" class="actions">
            <button class="btn-accept" @click="accept(n)" :disabled="processing.has(n.id)">
              {{ processing.has(n.id) ? '...' : '✓' }}
            </button>
            <button class="btn-reject" @click="reject(n)" :disabled="processing.has(n.id)">
              ✕
            </button>
          </div>

          <div v-else class="status-chip" :class="n.status">
            {{ n.status === 'accepted' ? t('notif_accepted') : t('notif_rejected') }}
          </div>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { bffHeaders } from '../stores/auth'
import { useI18n } from '../composables/useI18n'
import type { Notification } from '@chat/shared'

const router        = useRouter()
const { t, locale } = useI18n()
const API           = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const notifications = ref<Notification[]>([])
const loading       = ref(true)
const processing    = ref<Set<string>>(new Set())

async function fetch_() {
  loading.value = true
  try {
    const res = await fetch(`${API}/notifications`, { headers: bffHeaders() })
    notifications.value = await res.json()
  } finally {
    loading.value = false
  }
}

async function accept(n: Notification) {
  processing.value.add(n.id)
  try {
    const res = await fetch(`${API}/notifications/${n.id}/accept`, {
      method: 'POST', headers: bffHeaders(),
    })
    if (res.ok) {
      n.status = 'accepted'
      // Переходим в чат сразу
      router.push(`/chat/${n.room_id}`)
    }
  } finally {
    processing.value.delete(n.id)
  }
}

async function reject(n: Notification) {
  processing.value.add(n.id)
  try {
    const res = await fetch(`${API}/notifications/${n.id}/reject`, {
      method: 'POST', headers: bffHeaders(),
    })
    if (res.ok) n.status = 'rejected'
  } finally {
    processing.value.delete(n.id)
  }
}

function senderName(n: Notification) {
  if (n.first_name && n.last_name) return `${n.first_name} ${n.last_name}`
  return n.username ?? n.from_id
}

function senderInitials(n: Notification) {
  const name = senderName(n).split(' ')
  return name.length >= 2
    ? (name[0][0] + name[1][0]).toUpperCase()
    : name[0][0].toUpperCase()
}

function formatTime(ts: number) {
  const d    = new Date(ts)
  const diff = Date.now() - ts
  const lc   = locale()
  if (diff < 60_000)     return t('notif_just_now')
  if (diff < 3_600_000)  return t('notif_min_ago', { n: String(Math.floor(diff / 60_000)) })
  if (diff < 86_400_000) return d.toLocaleTimeString(lc, { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString(lc, { day: 'numeric', month: 'short' })
}

onMounted(fetch_)
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

header {
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

h1 { font-size: 18px; font-weight: 800; }

.center { flex: 1; display: flex; align-items: center; justify-content: center; }

.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty {
  flex: 1; display: flex; flex-direction: column;
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
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}

.list li.accepted { opacity: .6; }
.list li.rejected { opacity: .45; }

.avatar {
  width: 46px; height: 46px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
  flex-shrink: 0;
}

.info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.name { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub  { font-size: 12px; color: var(--muted); }
.time { font-size: 11px; color: var(--muted); margin-top: 2px; }

.actions { display: flex; gap: 8px; flex-shrink: 0; }

.btn-accept {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
  transition: opacity .15s;
}

.btn-reject {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--border);
  color: var(--muted);
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}

.btn-accept:disabled, .btn-reject:disabled { opacity: .5; }
.btn-reject:hover { background: rgba(239,68,68,.2); color: #ef4444; }

.status-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  flex-shrink: 0;
}

.status-chip.accepted { background: rgba(34,197,94,.15); color: #22c55e; }
.status-chip.rejected { background: var(--border); color: var(--muted); }
</style>
