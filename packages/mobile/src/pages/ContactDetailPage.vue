<template>
  <div class="page">

    <!-- Header -->
    <header>
      <button class="back-btn" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="header-title">Контакт</span>
      <div class="header-placeholder" />
    </header>

    <div v-if="!contact" class="center"><div class="spinner" /></div>

    <div v-else class="body">

      <!-- Avatar hero -->
      <div class="hero">
        <div class="avatar-wrap">
          <div class="avatar" :style="{ background: avatarColor(contact.contact_id) }">
            {{ initials }}
          </div>
        </div>
        <h1 class="full-name">{{ fullName }}</h1>
        <span class="username-sub" v-if="contact.username">@{{ contact.username }}</span>
      </div>

      <!-- Info cards -->
      <div class="cards">
        <div class="card" v-if="contact.phone">
          <div class="card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6 6l.55-.55a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">Телефон</span>
            <span class="card-value">{{ contact.phone }}</span>
          </div>
        </div>

        <div class="card" v-if="contact.username">
          <div class="card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">Имя пользователя</span>
            <span class="card-value">@{{ contact.username }}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">В контактах с</span>
            <span class="card-value">{{ addedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Chat button -->
      <div class="action-area">
        <button class="chat-btn" @click="openChat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Написать сообщение
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db/cache'
import { bffHeaders } from '../stores/auth'
import type { Contact } from '@chat/shared'
import { useI18n } from '../composables/useI18n'

const route  = useRoute()
const router = useRouter()
const { locale } = useI18n()
const API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const contactId = route.params.contactId as string
const contact   = ref<Contact | null>(null)

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f97316',
  '#10b981','#3b82f6','#f59e0b','#06b6d4',
]

function avatarColor(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return COLORS[h % COLORS.length]
}

const fullName = computed(() => {
  const c = contact.value
  if (!c) return ''
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`
  return c.username ?? c.contact_id
})

const initials = computed(() => {
  const parts = fullName.value.split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0][0].toUpperCase()
})

const addedDate = computed(() => {
  if (!contact.value) return ''
  return new Date(contact.value.created_at).toLocaleDateString(locale(), {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

function openChat() {
  if (contact.value) router.push(`/chat/${contact.value.room_id}`)
}

onMounted(async () => {
  // Load from cache immediately
  const cached = await db.contacts.get(contactId)
  if (cached) contact.value = cached

  // Sync from server
  try {
    const res = await fetch(`${API}/contacts`, { headers: bffHeaders() })
    if (res.ok) {
      const list: Contact[] = await res.json()
      const fresh = list.find(c => c.contact_id === contactId)
      if (fresh) {
        contact.value = fresh
        await db.contacts.bulkPut(list)
      }
    }
  } catch {}
})
</script>

<style scoped>
.page {
  display: flex; flex-direction: column;
  height: 100dvh; overflow: hidden;
  background: var(--bg);
  animation: fadeIn .25s ease;
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  padding-top: calc(14px + env(safe-area-inset-top));
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.back-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--surface); color: var(--text);
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border);
  transition: all .15s;
}
.back-btn:active { transform: scale(.9); }

.header-title { font-size: 16px; font-weight: 700; }
.header-placeholder { width: 36px; }

/* ── Body ────────────────────────────────────────────────────────────────────── */
.center { flex: 1; display: flex; align-items: center; justify-content: center; }

.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.body {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

/* ── Hero ────────────────────────────────────────────────────────────────────── */
.hero {
  display: flex; flex-direction: column; align-items: center;
  padding: 36px 24px 28px;
  gap: 10px;
}

.avatar-wrap {
  width: 96px; height: 96px;
  border-radius: 50%;
  padding: 3px;
  background: var(--accent-gradient);
  box-shadow: 0 8px 32px rgba(var(--accent-rgb), .35);
}

.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px; font-weight: 800;
  color: #fff;
  border: 3px solid var(--bg);
}

.full-name {
  font-size: 26px; font-weight: 800; letter-spacing: -.5px;
  text-align: center; line-height: 1.2;
}

.username-sub { font-size: 14px; color: var(--muted); }

/* ── Cards ───────────────────────────────────────────────────────────────────── */
.cards {
  display: flex; flex-direction: column; gap: 10px;
  padding: 0 20px;
}

.card {
  display: flex; align-items: center; gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  transition: background .12s;
}
.card:active { background: var(--other-bg); }

.card-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(var(--accent-rgb), .12);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.card-content { display: flex; flex-direction: column; gap: 3px; }
.card-label   { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.card-value   { font-size: 15px; font-weight: 600; }

/* ── Action ──────────────────────────────────────────────────────────────────── */
.action-area {
  margin-top: auto;
  padding: 28px 20px 0;
}

.chat-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  background: var(--accent-gradient);
  color: #fff;
  border-radius: 16px;
  padding: 16px;
  font-size: 16px; font-weight: 700;
  box-shadow: 0 6px 24px rgba(var(--accent-rgb), .35);
  transition: all .2s cubic-bezier(.16,1,.3,1);
}
.chat-btn:active { transform: scale(.97); box-shadow: 0 2px 8px rgba(var(--accent-rgb), .25); }
</style>
