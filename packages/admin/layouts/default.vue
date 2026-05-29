<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-logo">konekt</span>
        <span class="brand-tag">admin</span>
      </div>

      <nav class="nav">
        <NuxtLink to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Dashboard
        </NuxtLink>

        <NuxtLink to="/users" class="nav-item" :class="{ active: route.path.startsWith('/users') }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Пользователи
        </NuxtLink>

        <NuxtLink to="/rooms" class="nav-item" :class="{ active: route.path.startsWith('/rooms') }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Комнаты
        </NuxtLink>
      </nav>

      <button class="logout-btn" @click="logout">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Выйти
      </button>
    </aside>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { token } = useAdminApi()

function logout() {
  token.value = null
  navigateTo('/login')
}
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 8px;
  margin-bottom: 32px;
}

.brand-logo {
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  transition: all 0.15s;
}

.nav-item:hover {
  background: var(--surface2);
  color: var(--text);
}

.nav-item.active {
  background: var(--accent-dim);
  color: var(--accent);
}

.nav-item svg { flex-shrink: 0; }

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  transition: all 0.15s;
  width: 100%;
}

.logout-btn:hover {
  background: var(--danger-dim);
  color: var(--danger);
}

.main {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  min-width: 0;
}
</style>
