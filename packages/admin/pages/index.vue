<template>
  <div>
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="subtitle">Обзор системы</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats?.users ?? '—' }}</span>
          <span class="stat-label">Пользователей</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon contacts">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats?.contacts ?? '—' }}</span>
          <span class="stat-label">Диалогов</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon pending">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats?.pending ?? '—' }}</span>
          <span class="stat-label">Ожидают принятия</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Последние пользователи</h2>
        <NuxtLink to="/users" class="see-all">Все →</NuxtLink>
      </div>
      <div v-if="loadingUsers" class="loading">Загрузка...</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Email</th>
            <th>Телефон</th>
            <th>Дата</th>
            <th>Роль</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in recentUsers" :key="u.id">
            <td>
              <div class="user-cell">
                <div class="avatar" :style="{ background: avatarColor(u.id) }">{{ initials(u) }}</div>
                <div>
                  <div class="user-name">{{ fullName(u) }}</div>
                  <div class="user-username">@{{ u.username }}</div>
                </div>
              </div>
            </td>
            <td class="muted">{{ u.email ?? '—' }}</td>
            <td class="muted">{{ u.phone ?? '—' }}</td>
            <td class="muted">{{ formatDate(u.created_at) }}</td>
            <td>
              <span class="chip" :class="u.is_admin ? 'admin' : 'user'">
                {{ u.is_admin ? 'Admin' : 'User' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get } = useAdminApi()

const stats        = ref<{ users: number; contacts: number; pending: number } | null>(null)
const recentUsers  = ref<any[]>([])
const loadingUsers = ref(true)

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#f59e0b','#06b6d4']

function avatarColor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return COLORS[h % COLORS.length]
}

function fullName(u: any) {
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`
  return u.username
}

function initials(u: any) {
  const n = fullName(u).split(' ')
  return n.length >= 2 ? (n[0][0] + n[1][0]).toUpperCase() : n[0][0].toUpperCase()
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  try {
    stats.value = await get<any>('/admin/stats')
    const data  = await get<any>('/admin/users?limit=8')
    recentUsers.value = data.users
  } finally {
    loadingUsers.value = false
  }
})
</script>

<style scoped>
.page-header { margin-bottom: 28px; }
.page-header h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
.subtitle { color: var(--muted); font-size: 14px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.users   { background: rgba(99,102,241,0.15);  color: #6366f1; }
.stat-icon.contacts{ background: rgba(34,197,94,0.12);   color: #22c55e; }
.stat-icon.pending { background: rgba(245,158,11,0.12);  color: #f59e0b; }

.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
.stat-label { font-size: 13px; color: var(--muted); font-weight: 500; }

.section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.section-header h2 { font-size: 16px; font-weight: 700; }
.see-all { font-size: 13px; color: var(--accent); font-weight: 600; }
.see-all:hover { opacity: 0.8; }

.loading { padding: 24px; color: var(--muted); text-align: center; }

.table { width: 100%; border-collapse: collapse; }

.table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--muted);
  background: var(--surface2);
}

.table td {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  vertical-align: middle;
}

.table tr:hover td { background: var(--surface2); }

.user-cell { display: flex; align-items: center; gap: 10px; }

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-name { font-weight: 600; font-size: 14px; }
.user-username { font-size: 12px; color: var(--muted); }

.muted { color: var(--muted); font-size: 13px; }

.chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}

.chip.admin { background: var(--accent-dim); color: var(--accent); }
.chip.user  { background: var(--surface2); color: var(--muted); }
</style>
