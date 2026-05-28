<template>
  <div class="page">
    <header>
      <button class="back" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="search-wrap">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref="inputRef"
          v-model="query"
          :placeholder="t('search_ph')"
          @input="onInput"
        />
        <button v-if="query" class="clear" @click="query = ''; results = []">✕</button>
      </div>
    </header>

    <div v-if="loading" class="center"><div class="spinner" /></div>

    <div v-else-if="query.length >= 2 && !results.length" class="empty">
      <p>{{ t('search_nf') }}</p>
      <span>{{ t('search_nf_sub') }}</span>
    </div>

    <div v-else-if="!query" class="empty">
      <div class="empty-icon">🔍</div>
      <p>{{ t('search_title') }}</p>
      <span>{{ t('search_title_sub') }}</span>
    </div>

    <ul v-else class="list">
      <li v-for="user in results" :key="user.id">
        <div class="avatar">{{ userInitials(user) }}</div>
        <div class="info">
          <span class="name">{{ userName(user) }}</span>
          <span class="sub">{{ user.phone ?? user.username }}</span>
        </div>
        <button
          class="add-btn"
          :class="{ added: added.has(user.id) }"
          :disabled="adding.has(user.id)"
          @click="addContact(user)"
        >
          {{ added.has(user.id) ? '✓' : adding.has(user.id) ? '...' : t('search_add') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { bffHeaders } from '../stores/auth'
import { useI18n } from '../composables/useI18n'
import type { SearchUser } from '@chat/shared'

const router  = useRouter()
const API     = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const { t }   = useI18n()
const inputRef = ref<HTMLInputElement | null>(null)
const query    = ref('')
const results  = ref<SearchUser[]>([])
const loading  = ref(false)
const added    = ref<Set<string>>(new Set())
const adding   = ref<Set<string>>(new Set())

let debounce: ReturnType<typeof setTimeout> | null = null

function onInput() {
  if (debounce) clearTimeout(debounce)
  if (query.value.length < 2) { results.value = []; return }
  debounce = setTimeout(search, 350)
}

async function search() {
  loading.value = true
  try {
    const res = await fetch(`${API}/users/search?q=${encodeURIComponent(query.value)}`, {
      headers: bffHeaders(),
    })
    results.value = await res.json()
  } finally {
    loading.value = false
  }
}

async function addContact(user: SearchUser) {
  adding.value.add(user.id)
  try {
    const res = await fetch(`${API}/contacts/${user.id}`, {
      method:  'POST',
      headers: bffHeaders(),
    })
    if (res.ok) added.value.add(user.id)
  } finally {
    adding.value.delete(user.id)
  }
}

function userName(u: SearchUser) {
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`
  return u.username
}

function userInitials(u: SearchUser) {
  const n = userName(u).split(' ')
  return n.length >= 2 ? (n[0][0] + n[1][0]).toUpperCase() : n[0][0].toUpperCase()
}

onMounted(() => inputRef.value?.focus())
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }

header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.back {
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  flex-shrink: 0;
}

.search-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute; left: 12px;
  color: var(--muted);
  pointer-events: none;
}

.search-wrap input {
  flex: 1;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 36px;
  color: var(--text);
  font-size: 14px;
  width: 100%;
}

.search-wrap input:focus { border-color: var(--accent); }

.clear {
  position: absolute; right: 10px;
  color: var(--muted); font-size: 13px;
  padding: 4px;
}

.center, .empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: var(--muted);
}

.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon { font-size: 48px; }
.empty p    { font-size: 16px; font-weight: 600; color: var(--text); }
.empty span { font-size: 13px; }

.list { flex: 1; overflow-y: auto; list-style: none; }

.list li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}

.avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700;
  flex-shrink: 0;
}

.info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.name { font-weight: 700; font-size: 15px; }
.sub  { font-size: 12px; color: var(--muted); }

.add-btn {
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all .15s;
}

.add-btn.added {
  background: #22c55e;
}

.add-btn:disabled {
  opacity: .6;
}
</style>
