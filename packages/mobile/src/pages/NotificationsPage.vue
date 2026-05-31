<template>
  <AppLayout>
    <div class="page">
      <header>
        <h1>{{ t('notif_title') }}</h1>
      </header>

      <div v-if="loading" class="center"><div class="spinner" /></div>

      <div v-else-if="!contactRequests.length && !broadcastList.length" class="empty">
        <div class="empty-icon">🔔</div>
        <p>{{ t('notif_empty') }}</p>
        <span>{{ t('notif_empty_sub') }}</span>
      </div>

      <div v-else class="scroll-area">

        <!-- ── Рассылки ─────────────────────────────────────────────────────── -->
        <section v-if="broadcastList.length">
          <div class="section-label">📢 Рассылки</div>
          <ul class="list">
            <li
              v-for="b in broadcastList"
              :key="b.id"
              class="broadcast-item"
              :class="{ new: b.is_new }"
              @click="openBroadcast(b)"
            >
              <div class="b-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6 6l.55-.55a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
                </svg>
              </div>
              <div class="info">
                <span class="b-title">{{ b.title }}</span>
                <span class="b-body">{{ b.body }}</span>
                <span class="time">{{ formatTime(b.created_at) }}</span>
              </div>
              <span v-if="b.is_new" class="new-dot" />
              <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </li>
          </ul>
        </section>

        <!-- ── Запросы в контакты ───────────────────────────────────────────── -->
        <section v-if="contactRequests.length">
          <div class="section-label">👤 Запросы в контакты</div>
          <ul class="list">
            <li v-for="n in contactRequests" :key="n.id" :class="n.status">
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
                <button class="btn-reject" @click="reject(n)" :disabled="processing.has(n.id)">✕</button>
              </div>
              <div v-else class="status-chip" :class="n.status">
                {{ n.status === 'accepted' ? t('notif_accepted') : t('notif_rejected') }}
              </div>
            </li>
          </ul>
        </section>

      </div>

      <!-- ── Broadcast modal ──────────────────────────────────────────────────── -->
      <Transition name="modal">
        <div v-if="activeBroadcast" class="modal-backdrop" @click.self="activeBroadcast = null">
          <div class="modal-card">
            <div class="modal-top">
              <div class="modal-icon">📢</div>
              <button class="modal-close" @click="activeBroadcast = null">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <h2 class="modal-title">{{ activeBroadcast.title }}</h2>
            <p class="modal-body">{{ activeBroadcast.body }}</p>
            <span class="modal-time">{{ formatTime(activeBroadcast.created_at) }}</span>
          </div>
        </div>
      </Transition>
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

const contactRequests = ref<Notification[]>([])
const broadcastList   = ref<any[]>([])
const loading         = ref(true)
const processing      = ref<Set<string>>(new Set())
const activeBroadcast = ref<any>(null)

async function fetch_() {
  loading.value = true
  try {
    const res  = await fetch(`${API}/notifications`, { headers: bffHeaders() })
    const data = await res.json()
    contactRequests.value = data.contact_requests ?? []
    broadcastList.value   = data.broadcasts ?? []
  } finally {
    loading.value = false
  }
  // Mark all broadcasts as seen after loading
  fetch(`${API}/notifications/broadcasts-seen`, { method: 'POST', headers: bffHeaders() }).catch(() => {})
}

function openBroadcast(b: any) {
  activeBroadcast.value = b
  b.is_new = false // visually mark as read instantly
}

async function accept(n: Notification) {
  processing.value.add(n.id)
  try {
    const res = await fetch(`${API}/notifications/${n.id}/accept`, {
      method: 'POST', headers: bffHeaders(),
    })
    if (res.ok) {
      n.status = 'accepted'
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
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

h1 {
  font-size: 24px; font-weight: 800; letter-spacing: -0.8px;
  background: linear-gradient(135deg, var(--text), var(--muted));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

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

.scroll-area { flex: 1; overflow-y: auto; }

/* ── Section headers ─────────────────────────────────────────────────────────── */
.section-label {
  padding: 10px 20px 6px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .6px;
  color: var(--muted);
  background: var(--bg);
  position: sticky; top: 0; z-index: 2;
}

.list { list-style: none; }

/* ── Broadcast items ─────────────────────────────────────────────────────────── */
.broadcast-item {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background .12s;
  position: relative;
}
.broadcast-item:active { background: var(--surface); }
.broadcast-item.new { background: rgba(var(--accent-rgb), .04); }

.b-icon {
  width: 44px; height: 44px; border-radius: 14px;
  background: rgba(var(--accent-rgb), .12);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.b-title { font-weight: 700; font-size: 14px; }
.b-body  { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }

.new-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.chevron { color: var(--muted); flex-shrink: 0; margin-left: auto; }

/* ── Contact request items ───────────────────────────────────────────────────── */
.list li {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
  transition: background .1s;
}
.list li.accepted { opacity: .6; }
.list li.rejected { opacity: .45; }

.avatar {
  width: 46px; height: 46px; border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}

.info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.name { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub  { font-size: 12px; color: var(--muted); }
.time { font-size: 11px; color: var(--muted); margin-top: 2px; }

.actions { display: flex; gap: 8px; flex-shrink: 0; }

.btn-accept {
  width: 36px; height: 36px; border-radius: 50%;
  background: #22c55e; color: #fff;
  font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .15s;
}
.btn-reject {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--border); color: var(--muted); font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.btn-accept:disabled, .btn-reject:disabled { opacity: .5; }
.btn-reject:hover { background: rgba(239,68,68,.2); color: #ef4444; }

.status-chip {
  font-size: 12px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px; flex-shrink: 0;
}
.status-chip.accepted { background: rgba(34,197,94,.15); color: #22c55e; }
.status-chip.rejected { background: var(--border); color: var(--muted); }

/* ── Broadcast modal ─────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(6px);
  display: flex; align-items: flex-end;
  padding: 0 0 env(safe-area-inset-bottom);
}

.modal-card {
  width: 100%;
  background: var(--surface);
  border-radius: 24px 24px 0 0;
  padding: 24px 24px 32px;
  display: flex; flex-direction: column; gap: 12px;
}

.modal-top {
  display: flex; justify-content: space-between; align-items: center;
}

.modal-icon { font-size: 32px; }

.modal-close {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--border); color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.modal-close:hover { background: var(--accent); color: #fff; }

.modal-title {
  font-size: 20px; font-weight: 800; line-height: 1.3;
}

.modal-body {
  font-size: 15px; color: var(--muted); line-height: 1.6;
  white-space: pre-wrap;
}

.modal-time { font-size: 12px; color: var(--muted); }

/* ── Transitions ─────────────────────────────────────────────────────────────── */
.modal-enter-active, .modal-leave-active { transition: all .25s cubic-bezier(.16,1,.3,1); }
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card, .modal-leave-to .modal-card {
  transform: translateY(100%);
}
</style>
