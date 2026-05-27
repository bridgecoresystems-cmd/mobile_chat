<template>
  <AppLayout>
    <div class="page">
      <header>
        <h1>Чаты</h1>
        <button class="compose-btn" @click="router.push('/search')" title="Новый чат">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </header>

      <!-- Поиск -->
      <div class="search-wrap">
        <div class="search-box" :class="{ focused: searchFocused }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="query"
            placeholder="Поиск чата..."
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
        <p>Нет чатов</p>
        <span>Найди людей через поиск контактов</span>
      </div>

      <!-- Поиск ничего не нашёл -->
      <div v-else-if="query && !filtered.length" class="empty">
        <div class="empty-icon">🔍</div>
        <p>Чат не найден</p>
        <span>«{{ query }}» — нет такого чата</span>
      </div>

      <!-- Список чатов -->
      <ul v-else class="list" ref="listEl">
        <li
          v-for="c in visible"
          :key="c.contact_id"
          class="chat-item"
          @click="openChat(c)"
        >
          <div class="avatar" :style="{ background: avatarColor(c.contact_id) }">
            {{ contactInitials(c) }}
          </div>
          <div class="info">
            <div class="top-row">
              <span class="name">{{ contactName(c) }}</span>
              <span class="time">{{ formatTime(c.created_at) }}</span>
            </div>
            <span class="sub">{{ c.phone ?? c.username ?? '&nbsp;' }}</span>
          </div>
        </li>

        <!-- Сентинел для lazy load -->
        <li v-if="hasMore" ref="sentinel" class="sentinel" />

        <!-- Конец списка -->
        <li v-if="!hasMore && visible.length > PAGE_SIZE" class="end-mark">
          <span>— всё —</span>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { bffHeaders } from '../stores/auth'
import type { Contact } from '@chat/shared'

const router = useRouter()
const API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const contacts     = ref<Contact[]>([])
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

function contactName(c: Contact): string {
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`
  return c.username ?? c.contact_id
}

function contactInitials(c: Contact): string {
  const n = contactName(c).split(' ')
  return n.length >= 2
    ? (n[0][0] + n[1][0]).toUpperCase()
    : n[0][0].toUpperCase()
}

function formatTime(ts: number): string {
  const d    = new Date(ts)
  const now  = new Date()
  const diff = Date.now() - ts
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604_800_000)
    return d.toLocaleDateString('ru', { weekday: 'short' })
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

// Сортируем по created_at убывающе (самые последние вверху)
const sorted = computed(() =>
  [...contacts.value].sort((a, b) => b.created_at - a.created_at)
)

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
onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Шапка ─────────────────────────────────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

h1 { font-size: 22px; font-weight: 800; letter-spacing: -.3px; }

.compose-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .15s;
}
.compose-btn:active { opacity: .7; }

/* ── Поиск ─────────────────────────────────────────────────────────────────── */
.search-wrap {
  padding: 10px 16px 8px;
  background: var(--bg);
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 9px 12px;
  transition: border-color .15s;
}

.search-box.focused { border-color: var(--accent); }

.search-icon { color: var(--muted); flex-shrink: 0; }

.search-box input {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  background: none;
}

.search-box input::placeholder { color: var(--muted); }

.clear-btn {
  color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  padding: 2px;
  transition: color .15s;
}
.clear-btn:hover { color: var(--text); }

/* ── Состояния ─────────────────────────────────────────────────────────────── */
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
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: var(--muted);
  padding: 40px 20px; text-align: center;
}
.empty-icon { font-size: 48px; }
.empty p    { font-size: 16px; font-weight: 600; color: var(--text); }
.empty span { font-size: 13px; }

/* ── Список чатов ──────────────────────────────────────────────────────────── */
.list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}

.chat-item:active { background: var(--surface); }

.avatar {
  width: 50px; height: 50px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time {
  font-size: 11px;
  color: var(--muted);
  flex-shrink: 0;
  font-weight: 500;
}

.sub {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sentinel { height: 1px; }

.end-mark {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--muted);
}
</style>
