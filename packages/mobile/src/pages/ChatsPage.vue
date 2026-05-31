<template>
  <AppLayout>
    <div class="page">
      <header>
        <h1>{{ t('chats_title') }}</h1>
      </header>

      <!-- Поиск -->
      <div class="search-wrap">
        <div class="search-box" :class="{ focused: searchFocused }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="query"
            :placeholder="t('chats_search_ph')"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
          <button v-if="query" class="clear-btn" @click="query = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Загрузка -->
      <div v-if="loading" class="center"><div class="spinner" /></div>

      <!-- Нет контактов вообще -->
      <div v-else-if="!contacts.length" class="empty">
        <div class="empty-icon">💬</div>
        <p>{{ t('chats_empty') }}</p>
        <span>{{ t('chats_empty_sub') }}</span>
      </div>

      <!-- Поиск ничего не нашёл -->
      <div v-else-if="query && !filtered.length" class="empty">
        <div class="empty-icon">🔍</div>
        <p>{{ t('chats_nf') }}</p>
        <span>{{ t('chats_nf_sub', { q: query }) }}</span>
      </div>

      <!-- Список чатов -->
      <ul v-else class="list" ref="listEl">
        <li
          v-for="c in visible"
          :key="c.contact_id"
          class="chat-item"
          @click="openChat(c)"
        >
          <div class="avatar-wrap">
            <div class="avatar" :style="{ background: avatarColor(c.contact_id) }">
              {{ contactInitials(c) }}
            </div>
            <span v-if="c.unread_count > 0" class="unread-badge">
              {{ c.unread_count > 99 ? '99+' : c.unread_count }}
            </span>
          </div>
          <div class="info">
            <div class="top-row">
              <span class="name" :class="{ bold: c.unread_count > 0 }">{{ contactName(c) }}</span>
              <span class="time" :class="{ accent: c.unread_count > 0 }">
                {{ formatTime(Number(c.last_message_at) || c.created_at) }}
              </span>
            </div>
            <span class="sub" :class="{ unread: c.unread_count > 0 }">{{ lastMessagePreview(c) }}</span>
          </div>
        </li>

        <!-- Сентинел для lazy load -->
        <li v-if="hasMore" ref="sentinel" class="sentinel" />

        <!-- Конец списка -->
        <li v-if="!hasMore && visible.length > PAGE_SIZE" class="end-mark">
          <span>{{ t('chats_end') }}</span>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { useAuthStore, bffHeaders } from '../stores/auth'
import { useI18n } from '../composables/useI18n'
import { db, type ChatSummary } from '../db/cache'

const router    = useRouter()
const auth      = useAuthStore()
const API       = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const { t, locale } = useI18n()

const contacts     = ref<ChatSummary[]>([])
const loading      = ref(true)
const query        = ref('')
const searchFocused = ref(false)
const page         = ref(1)
const listEl       = ref<HTMLElement | null>(null)
const sentinel     = ref<HTMLElement | null>(null)

const PAGE_SIZE = 20

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f97316',
  '#10b981','#3b82f6','#f59e0b','#06b6d4',
]

function avatarColor(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return COLORS[h % COLORS.length]
}

function contactName(c: ChatSummary): string {
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`
  return c.username ?? c.contact_id
}

function contactInitials(c: ChatSummary): string {
  const n = contactName(c).split(' ')
  return n.length >= 2
    ? (n[0][0] + n[1][0]).toUpperCase()
    : n[0][0].toUpperCase()
}

function lastMessagePreview(c: ChatSummary): string {
  if (!c.last_message) return c.phone ?? c.username ?? ' '
  const text = c.last_message
  const isPhoto = text.startsWith('{"type":"photo"')
  const preview = isPhoto ? '📷 Фото' : (text.length > 45 ? text.slice(0, 45) + '…' : text)
  const isMine  = c.last_sender_id === auth.user?.id
  return isMine ? `Вы: ${preview}` : preview
}

function formatTime(ts: number): string {
  const d    = new Date(ts)
  const now  = new Date()
  const diff = Date.now() - ts
  const lc   = locale()
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString(lc, { hour: '2-digit', minute: '2-digit' })
  if (diff < 604_800_000)
    return d.toLocaleDateString(lc, { weekday: 'short' })
  return d.toLocaleDateString(lc, { day: 'numeric', month: 'short' })
}

// Server already sorts by last_message_at DESC — keep order
const sorted = computed(() => contacts.value)

// Фильтрация по поисковому запросу
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sorted.value
  return sorted.value.filter(c =>
    contactName(c).toLowerCase().includes(q) ||
    (c.username ?? '').toLowerCase().includes(q)
  )
})

const hasMore = computed(() => page.value * PAGE_SIZE < filtered.value.length)

const visible = computed(() => filtered.value.slice(0, page.value * PAGE_SIZE))

// Сброс пагинации при новом поиске
watch(query, () => { page.value = 1 })

// IntersectionObserver для lazy load
let observer: IntersectionObserver | null = null

function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting && hasMore.value) page.value++ },
    { threshold: 0.1 }
  )
  observer.observe(sentinel.value)
}

watch(sentinel, (el) => { if (el) setupObserver() })
watch(visible, async () => { await nextTick(); if (sentinel.value) setupObserver() })

async function fetchContacts() {
  // Show from cache immediately
  const cached = await db.chats.orderBy('room_id').toArray()
  if (cached.length) {
    contacts.value = cached
    loading.value  = false
  }

  try {
    const res = await fetch(`${API}/chats`, { headers: bffHeaders() })
    if (res.ok) {
      const fresh: ChatSummary[] = await res.json()
      contacts.value = fresh
      await db.chats.bulkPut(fresh)
    }
  } catch {}

  loading.value = false
}

function openChat(c: ChatSummary) {
  router.push(`/chat/${c.room_id}`)
}

onMounted(fetchContacts)
onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
  animation: fadeIn 0.3s ease;
}

/* ── Шапка ─────────────────────────────────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 10;
}

h1 {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.8px;
  background: linear-gradient(135deg, var(--text), var(--muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.compose-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(var(--accent-rgb), 0.3);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.compose-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 18px rgba(var(--accent-rgb), 0.4);
}

.compose-btn:active {
  transform: scale(0.95);
}

/* ── Поиск ─────────────────────────────────────────────────────────────────── */
.search-wrap {
  padding: 12px 18px 8px;
  background: transparent;
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 10px 14px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-sm);
}

.search-box.focused {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.1);
}

.search-icon {
  color: var(--muted);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  background: none;
  font-weight: 500;
}

.search-box input::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.clear-btn {
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  transition: color 0.15s;
}

.clear-btn:hover {
  color: var(--text);
}

/* ── Состояния ─────────────────────────────────────────────────────────────── */
.center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.1));
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty p {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.empty span {
  font-size: 13px;
  opacity: 0.8;
}

/* ── Список чатов ──────────────────────────────────────────────────────────── */
.list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border-bottom: none;
}

.chat-item:hover {
  background: var(--surface);
}

.chat-item:active {
  transform: scale(0.98);
  background: var(--surface);
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.unread-badge {
  position: absolute;
  bottom: -2px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 99px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid var(--bg);
  line-height: 1;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.name.bold { font-weight: 800; }

.time {
  font-size: 11px;
  color: var(--muted);
  flex-shrink: 0;
  font-weight: 600;
}
.time.accent { color: var(--accent); font-weight: 700; }

.sub {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}
.sub.unread { color: var(--text); font-weight: 600; }

.sentinel {
  height: 1px;
}

.end-mark {
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}
</style>
