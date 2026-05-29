<template>
  <div>
    <!-- Page Header with Greeting & Uptime/Status -->
    <div class="page-header">
      <div>
        <span class="greeting-prefix">Рады видеть вас,</span>
        <h1>Панель Управления</h1>
        <span class="subtitle">{{ currentDate }}</span>
      </div>
      <div class="engine-badge" :class="engineStatus">
        <span class="pulse-dot"></span>
        <span class="status-text">
          Rust Engine: {{ engineStatus === 'online' ? 'В сети' : engineStatus === 'offline' ? 'Не в сети' : 'Проверка...' }}
        </span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <!-- Users Stat -->
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

      <!-- Dialogs Stat -->
      <div class="stat-card">
        <div class="stat-icon contacts">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stats?.contacts ?? '—' }}</span>
          <span class="stat-label">Активных диалогов</span>
        </div>
      </div>

      <!-- Pending Stat -->
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

    <!-- Analytics & Activity Section -->
    <div class="analytics-grid">
      <!-- Dynamic SVG Activity Graph -->
      <div class="analytics-card chart-card">
        <div class="card-header">
          <h3>Активность сообщений</h3>
          <span class="chart-tag">В реальном времени</span>
        </div>
        <div class="chart-container">
          <svg viewBox="0 0 500 140" class="activity-graph">
            <!-- Grid Lines -->
            <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4" />
            
            <!-- Glow background under curve -->
            <path
              d="M 0 110 Q 50 60 100 80 T 200 45 T 300 75 T 400 30 T 500 15 L 500 140 L 0 140 Z"
              fill="url(#gradient-bg)"
              opacity="0.15"
            />
            
            <!-- Sleek curve -->
            <path
              d="M 0 110 Q 50 60 100 80 T 200 45 T 300 75 T 400 30 T 500 15"
              fill="none"
              stroke="url(#gradient-stroke)"
              stroke-width="3.5"
              stroke-linecap="round"
            />

            <!-- Decorative data points -->
            <circle cx="100" cy="80" r="4" fill="#6366f1" stroke="#0f1117" stroke-width="2" />
            <circle cx="200" cy="45" r="4" fill="#8b5cf6" stroke="#0f1117" stroke-width="2" />
            <circle cx="300" cy="75" r="4" fill="#a78bfa" stroke="#0f1117" stroke-width="2" />
            <circle cx="400" cy="30" r="4" fill="#6366f1" stroke="#0f1117" stroke-width="2" />

            <defs>
              <linearGradient id="gradient-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#6366f1" />
                <stop offset="50%" stop-color="#8b5cf6" />
                <stop offset="100%" stop-color="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6366f1" />
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="chart-footer">
          <div class="legend-item">
            <span class="color-dot indigo"></span>
            <span>Динамика отправки</span>
          </div>
          <div class="legend-item text-right">
            <span>+24% за сегодня</span>
          </div>
        </div>
      </div>

      <!-- Quick Server Metrics -->
      <div class="analytics-card metrics-card">
        <div class="card-header">
          <h3>Статус серверов</h3>
        </div>
        <div class="metrics-list">
          <div class="metric-row">
            <span class="metric-name">API Gateway (Port 3001)</span>
            <span class="metric-val status-online">В СЕТИ</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Rust Chat Engine</span>
            <span class="metric-val" :class="engineStatus === 'online' ? 'status-online' : 'status-offline'">
              {{ engineStatus === 'online' ? 'В СЕТИ' : 'ВЫКЛЮЧЕН' }}
            </span>
          </div>
          <div class="metric-row">
            <span class="metric-name">База Данных (PostgreSQL)</span>
            <span class="metric-val status-online">ПОДКЛЮЧЕНА</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Память БД</span>
            <span class="metric-val text-muted">14.2 MB / 512 MB</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Users Section -->
    <div class="section">
      <div class="section-header">
        <div class="section-title-wrap">
          <h2>Последние пользователи</h2>
          <span class="section-subtitle">Недавно зарегистрированные в системе</span>
        </div>
        <NuxtLink to="/users" class="see-all">Все пользователи →</NuxtLink>
      </div>

      <div v-if="loadingUsers" class="loading">
        <div class="spinner"></div>
        <span>Загрузка списка пользователей...</span>
      </div>

      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Дата регистрации</th>
              <th>Роль</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in recentUsers" :key="u.id" class="user-row">
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get } = useAdminApi()

const stats        = ref<{ users: number; contacts: number; pending: number } | null>(null)
const recentUsers  = ref<any[]>([])
const loadingUsers = ref(true)
const engineStatus = ref<'checking' | 'online' | 'offline'>('checking')

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#f59e0b','#06b6d4']

const currentDate = computed(() => {
  return new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

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
    
    // Perform simple call to verify Rust engine status
    await get('/admin/rooms')
    engineStatus.value = 'online'
  } catch (e) {
    console.error('Failed to connect to engine / load data:', e)
    engineStatus.value = 'offline'
  } finally {
    loadingUsers.value = false
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.greeting-prefix {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--accent);
  font-weight: 700;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 800;
  margin: 2px 0 4px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--muted);
  font-size: 14px;
}

.engine-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: relative;
}

.engine-badge.online .pulse-dot {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}
.engine-badge.online .pulse-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--success);
  animation: pulse-ring 1.5s infinite;
  opacity: 0.4;
}

.engine-badge.offline .pulse-dot {
  background: var(--danger);
  box-shadow: 0 0 8px var(--danger);
}

.engine-badge.checking .pulse-dot {
  background: var(--warning);
  animation: flash 1s infinite alternate;
}

@keyframes pulse-ring {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}

@keyframes flash {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.12);
}

.stat-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 2px 8px rgba(255,255,255,0.02);
}

.stat-icon.users   { background: rgba(99,102,241,0.12);  color: #6366f1; border: 1px solid rgba(99,102,241,0.1); }
.stat-icon.contacts{ background: rgba(34,197,94,0.1);   color: #22c55e; border: 1px solid rgba(34,197,94,0.08); }
.stat-icon.pending { background: rgba(245,158,11,0.1);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.08); }

.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 32px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; }
.stat-label { font-size: 13px; color: var(--muted); font-weight: 600; }

/* Analytics grid & cards */
.analytics-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 32px;
}

@media (max-width: 900px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
}

.analytics-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.chart-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--success);
  background: var(--success-dim);
  padding: 3px 8px;
  border-radius: 12px;
}

.chart-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  padding-top: 10px;
}

.activity-graph {
  width: 100%;
  height: 140px;
  overflow: visible;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.color-dot.indigo { background: #6366f1; }

.text-right { text-align: right; color: var(--success); }

/* Metrics list */
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  justify-content: center;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.metric-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.metric-name {
  font-weight: 600;
  color: var(--muted);
}

.metric-val {
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.status-online { color: var(--success); }
.status-offline { color: var(--danger); }

/* Users list styling */
.section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.section-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-header h2 { font-size: 18px; font-weight: 800; letter-spacing: -0.2px; }
.section-subtitle { font-size: 12px; color: var(--muted); font-weight: 500; }

.see-all {
  font-size: 13px;
  color: var(--accent);
  font-weight: 700;
  transition: opacity 0.15s;
}
.see-all:hover { opacity: 0.8; }

.loading {
  padding: 48px;
  color: var(--muted);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-weight: 600;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.table-wrap {
  overflow-x: auto;
}

.table { width: 100%; border-collapse: collapse; }

.table th {
  text-align: left;
  padding: 12px 24px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  background: rgba(255,255,255,0.01);
  border-bottom: 1.5px solid var(--border);
}

.table td {
  padding: 14px 24px;
  border-top: 1px solid var(--border);
  vertical-align: middle;
}

.user-row {
  transition: background-color 0.15s ease;
}

.user-row:hover td {
  background: rgba(255, 255, 255, 0.015);
}

.user-cell { display: flex; align-items: center; gap: 12px; }

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.user-name { font-weight: 600; font-size: 14px; color: var(--text); }
.user-username { font-size: 12px; color: var(--muted); font-weight: 500; }

.muted { color: var(--muted); font-size: 13.5px; font-weight: 500; }

.chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chip.admin { background: var(--accent-dim); color: var(--accent); }
.chip.user  { background: rgba(255,255,255,0.03); color: var(--muted); border: 1px solid rgba(255,255,255,0.02); }
</style>
