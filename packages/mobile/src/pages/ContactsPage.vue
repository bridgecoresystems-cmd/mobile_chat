<template>
  <AppLayout>
    <div class="page">
      <header>
        <div class="header-left">
          <div class="my-avatar" @click="router.push('/profile')">{{ myInitials }}</div>
          <h1>{{ t('contacts_title') }}</h1>
        </div>
        <button class="add-btn" @click="router.push('/search')" title="Найти пользователя">
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
            :placeholder="t('contacts_search_ph')"
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
        <div class="empty-icon">👥</div>
        <p>{{ t('contacts_empty') }}</p>
        <span>{{ t('contacts_empty_sub') }}</span>
      </div>

      <!-- Поиск ничего не нашёл -->
      <div v-else-if="query && !filtered.length" class="empty">
        <div class="empty-icon">🔍</div>
        <p>{{ t('contacts_nf') }}</p>
        <span>{{ t('contacts_nf_sub', { q: query }) }}</span>
        <button class="add-contact-btn" @click="router.push('/search')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ t('contacts_add') }}
        </button>
      </div>

      <!-- Список -->
      <ul v-else class="list" ref="listEl">
        <li
          v-for="c in visible"
          :key="c.contact_id"
          @click="openChat(c)"
        >
          <div class="avatar" :style="{ background: avatarColor(c.contact_id) }">
            {{ contactInitials(c) }}
          </div>
          <div class="info">
            <span class="name">{{ contactName(c) }}</span>
            <span class="sub">{{ c.phone ?? c.username }}</span>
          </div>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </li>

        <!-- Сентинел для lazy load -->
        <li v-if="hasMore" ref="sentinel" class="sentinel" />

        <li v-if="!hasMore && visible.length > PAGE_SIZE" class="end-mark">
          <span>{{ t('contacts_end') }}</span>
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
import type { Contact } from '@chat/shared'

const router      = useRouter()
const auth        = useAuthStore()
const API         = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const { t } = useI18n()

const contacts     = ref<Contact[]>([])
const loading      = ref(true)
const query        = ref('')
const searchFocused = ref(false)
const page         = ref(1)
const sentinel     = ref<HTMLElement | null>(null)

const PAGE_SIZE = 20

const myInitials = computed(() => (auth.user?.username ?? '?')[0].toUpperCase())

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

// Автосортировка: самые последние контакты (с кем общались) вверху
const sorted = computed(() =>
  [...contacts.value].sort((a, b) => b.created_at - a.created_at)
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sorted.value
  return sorted.value.filter(c =>
    contactName(c).toLowerCase().includes(q) ||
    (c.username ?? '').toLowerCase().includes(q) ||
    (c.phone ?? '').includes(q)
  )
})

const hasMore = computed(() => page.value * PAGE_SIZE < filtered.value.length)

const visible = computed(() => filtered.value.slice(0, page.value * PAGE_SIZE))

watch(query, () => { page.value = 1 })

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
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 10;
}

.header-left { display: flex; align-items: center; gap: 12px; }

.my-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(var(--accent-rgb), 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.my-avatar:active {
  transform: scale(0.9);
}

h1 {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.8px;
  background: linear-gradient(135deg, var(--text), var(--muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.add-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: var(--text-inverse);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(var(--accent-rgb), 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.add-btn:active {
  transform: scale(0.9);
}

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
.search-box input { flex: 1; font-size: 14px; color: var(--text); background: none; }
.search-box input::placeholder { color: var(--muted); }
.clear-btn { color: var(--muted); display: flex; align-items: center; padding: 2px; }

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
.empty span { font-size: 13px; margin-bottom: 8px; }

.add-contact-btn {
  display: flex; align-items: center; gap: 8px;
  background: var(--accent); color: #fff;
  padding: 11px 20px;
  border-radius: 12px;
  font-size: 14px; font-weight: 600;
  margin-top: 4px;
  transition: opacity .15s;
}
.add-contact-btn:active { opacity: .8; }

/* ── Список ────────────────────────────────────────────────────────────────── */
.list { flex: 1; overflow-y: auto; list-style: none; }

.list li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}

.list li:active { background: var(--surface); }

.avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.name { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub  { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.chevron { color: var(--muted); flex-shrink: 0; }

.sentinel { height: 1px; }
.end-mark { text-align: center; padding: 16px; font-size: 12px; color: var(--muted); }
</style>
