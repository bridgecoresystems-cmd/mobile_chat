<template>
  <div class="layout">
    <div class="content">
      <slot />
    </div>

    <nav class="navbar">
      <!-- Чаты -->
      <router-link to="/chats" class="nav-item" active-class="active">
        <div class="icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span v-if="chatUnreadCount > 0" class="badge">{{ chatUnreadCount > 9 ? '9+' : chatUnreadCount }}</span>
        </div>
        <span>{{ t('nav_chats') }}</span>
      </router-link>

      <!-- Контакты -->
      <router-link to="/contacts" class="nav-item" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>{{ t('nav_contacts') }}</span>
      </router-link>

      <!-- Уведомления -->
      <router-link to="/notifications" class="nav-item" active-class="active">
        <div class="icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="notifCount > 0" class="badge">{{ notifCount > 9 ? '9+' : notifCount }}</span>
        </div>
        <span>{{ t('nav_calls') }}</span>
      </router-link>

      <!-- Профиль -->
      <router-link to="/profile" class="nav-item" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>{{ t('nav_profile') }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { bffHeaders } from '../stores/auth'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const API             = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const notifCount      = ref(0)
const chatUnreadCount = ref(0)

let interval: ReturnType<typeof setInterval> | null = null

async function fetchCounts() {
  try {
    const [notifRes, chatRes] = await Promise.all([
      fetch(`${API}/notifications/count`, { headers: bffHeaders() }),
      fetch(`${API}/chats/unread-total`,  { headers: bffHeaders() }),
    ])
    if (notifRes.ok) notifCount.value      = (await notifRes.json()).count ?? 0
    if (chatRes.ok)  chatUnreadCount.value = (await chatRes.json()).total ?? 0
  } catch {}
}

onMounted(() => {
  fetchCounts()
  interval = setInterval(fetchCounts, 10_000)
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
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  padding: 10px 0;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  flex-shrink: 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.03);
  z-index: 10;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 4px 0;
  color: var(--muted);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 11px;
  font-weight: 600;
  background: none;
  border: none;
  position: relative;
}

.nav-item svg {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-item:active svg {
  transform: scale(0.85);
}

.nav-item.active { 
  color: var(--accent);
}

.nav-item.active svg {
  transform: translateY(-2px);
  filter: drop-shadow(0 2px 8px rgba(var(--accent-rgb), 0.3));
}

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: -5px; 
  right: -8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  min-width: 16px;
  height: 16px;
  border-radius: 99px;
  display: flex; 
  align-items: center; 
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
  box-shadow: 0 0 0 2px var(--surface);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}
</style>
