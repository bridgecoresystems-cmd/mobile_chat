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

        <NuxtLink to="/broadcast" class="nav-item" :class="{ active: route.path.startsWith('/broadcast') }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.11h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.73 2.03z"/>
          </svg>
          Рассылка
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <NuxtLink to="/profile" class="admin-card" v-if="adminProfile">
          <div class="admin-avatar">{{ initials }}</div>
          <div class="admin-info">
            <span class="admin-name">{{ adminName }}</span>
            <span class="admin-role">Администратор</span>
          </div>
        </NuxtLink>

        <button class="logout-btn" @click="logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Выйти
        </button>
      </div>
    </aside>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { get, token } = useAdminApi()
const adminProfile = ref<any>(null)

function logout() {
  token.value = null
  navigateTo('/login')
}

const initials = computed(() => {
  if (!adminProfile.value) return 'A'
  const profile = adminProfile.value.profile
  if (profile && profile.first_name) {
    const f = profile.first_name[0]
    const l = profile.last_name ? profile.last_name[0] : ''
    return (f + l).toUpperCase()
  }
  return adminProfile.value.username.slice(0, 2).toUpperCase()
})

const adminName = computed(() => {
  if (!adminProfile.value) return 'Загрузка...'
  const profile = adminProfile.value.profile
  if (profile && profile.first_name) {
    return `${profile.first_name} ${profile.last_name ?? ''}`.trim()
  }
  return adminProfile.value.username
})

onMounted(async () => {
  if (token.value) {
    try {
      adminProfile.value = await get('/profile')
    } catch (e) {
      console.error('Failed to load admin profile:', e)
    }
  }
})
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: radial-gradient(circle at 10% 20%, rgba(99,102,241,0.02), transparent 50%), var(--bg);
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
  background: rgba(26, 29, 39, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 8px;
  margin-bottom: 32px;
}

.brand-logo {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.brand-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 12px;
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  transform: translateX(2px);
}

.nav-item.active {
  background: var(--accent-dim);
  color: var(--accent);
  box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.05);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3.5px;
  background: var(--accent);
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 8px var(--accent);
}

.nav-item svg {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.nav-item:hover svg {
  transform: scale(1.08);
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.admin-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.admin-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.admin-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
}

.admin-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-name {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-role {
  font-size: 10.5px;
  color: var(--muted);
  font-weight: 500;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--muted);
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
}

.logout-btn:hover {
  background: var(--danger-dim);
  color: var(--danger);
}

.logout-btn svg {
  transition: transform 0.2s ease;
}

.logout-btn:hover svg {
  transform: translateX(2px);
}

.main {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  min-width: 0;
}
</style>
