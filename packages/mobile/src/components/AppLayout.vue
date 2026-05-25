<template>
  <div class="layout">
    <div class="content">
      <slot />
    </div>

    <nav class="navbar">
      <router-link to="/contacts" class="nav-item" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Контакты</span>
      </router-link>

      <router-link to="/notifications" class="nav-item" active-class="active">
        <div class="icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="notifCount > 0" class="badge">{{ notifCount > 9 ? '9+' : notifCount }}</span>
        </div>
        <span>Уведомления</span>
      </router-link>

      <router-link to="/profile" class="nav-item" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Профиль</span>
      </router-link>

      <button class="nav-item theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
        <!-- Луна — сейчас тёмная, нажать чтобы включить светлую -->
        <svg v-if="theme === 'dark'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <!-- Солнце — сейчас светлая, нажать чтобы включить тёмную -->
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <span>Тема</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { bffHeaders } from '../stores/auth'
import { useTheme } from '../composables/useTheme'

const API        = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const notifCount = ref(0)
const { theme, toggleTheme } = useTheme()

let interval: ReturnType<typeof setInterval> | null = null

async function fetchCount() {
  try {
    const res = await fetch(`${API}/notifications/count`, { headers: bffHeaders() })
    if (res.ok) {
      const d = await res.json()
      notifCount.value = d.count ?? 0
    }
  } catch {}
}

onMounted(() => {
  fetchCount()
  interval = setInterval(fetchCount, 10_000)
})

onUnmounted(() => { if (interval) clearInterval(interval) })
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  padding: 4px 0;
  color: var(--muted);
  text-decoration: none;
  transition: color .15s;
  font-size: 10px;
  font-weight: 500;
  background: none;
  border: none;
}

.nav-item.active { color: var(--accent); }

.theme-toggle:hover { color: var(--accent); }

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: -6px; right: -8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px;
  line-height: 1;
}
</style>
