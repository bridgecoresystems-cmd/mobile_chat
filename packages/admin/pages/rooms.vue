<template>
  <div>
    <!-- Page Header & Actions -->
    <div class="page-header">
      <div>
        <h1>Активные Комнаты</h1>
        <span class="subtitle">Управление активными сессиями чатов (Rust Engine API)</span>
      </div>

      <div class="header-actions">
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" placeholder="Поиск по ID или участникам..." class="search-input" />
        </div>
      </div>
    </div>

    <!-- Active Rooms Statistics Panel -->
    <div class="rooms-stats" v-if="!loading && !error && rooms.length">
      <div class="stat-box">
        <span class="stat-num">{{ rooms.length }}</span>
        <span class="stat-lbl">Всего комнат</span>
      </div>
      <div class="stat-box">
        <span class="stat-num">{{ totalParticipants }}</span>
        <span class="stat-lbl">Участников в сети</span>
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>Подключение к Rust Engine и загрузка данных...</span>
      </div>
      
      <div v-else-if="error" class="error-panel">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h4>Ошибка синхронизации</h4>
          <p>{{ error }}</p>
          <span class="error-tip">Убедитесь, что серверный процесс Rust Chat Engine запущен и отвечает по настроенному адресу.</span>
        </div>
      </div>

      <div v-else-if="!filteredRooms.length" class="empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>Активные комнаты не найдены</p>
      </div>

      <!-- Rooms Grid Cards Layout -->
      <div v-else class="rooms-grid">
        <div v-for="r in filteredRooms" :key="r.id ?? r" class="room-card">
          <div class="room-card-header">
            <div class="room-avatar" :style="{ background: avatarColor(r.id ?? r) }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            
            <div class="room-info">
              <h3 class="room-name" :title="r.id ?? r">{{ r.id ?? r }}</h3>
              <span class="room-type">Групповой диалог</span>
            </div>
          </div>

          <div class="room-card-body">
            <div class="participants-section">
              <span class="label">Участники ({{ (r.participants ?? []).length }}):</span>
              <div class="participants-list">
                <div v-for="p in (r.participants ?? [])" :key="p" class="participant-chip" :title="p">
                  <span class="p-dot"></span>
                  <span class="p-name">{{ p }}</span>
                </div>
                <div v-if="!(r.participants ?? []).length" class="no-participants">
                  Участники отсутствуют
                </div>
              </div>
            </div>
          </div>

          <div class="room-card-footer">
            <span class="room-status-badge">
              <span class="badge-dot"></span> Active
            </span>
            <span class="room-engine">Rust Core</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get } = useAdminApi()

const rooms   = ref<any[]>([])
const loading = ref(true)
const error   = ref('')
const search  = ref('')

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#f59e0b','#06b6d4']

function avatarColor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return COLORS[h % COLORS.length]
}

const totalParticipants = computed(() => {
  return rooms.value.reduce((sum, r) => sum + (r.participants ?? []).length, 0)
})

const filteredRooms = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rooms.value
  
  return rooms.value.filter(r => {
    const id = (r.id ?? r).toLowerCase()
    const participants = (r.participants ?? []).join(' ').toLowerCase()
    return id.includes(q) || participants.includes(q)
  })
})

onMounted(async () => {
  try {
    const data = await get<any>('/admin/rooms')
    rooms.value = Array.isArray(data) ? data : (data.rooms ?? [])
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
}

.page-header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
.subtitle { color: var(--muted); font-size: 14px; }

.header-actions {
  display: flex;
  align-items: center;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--muted);
  pointer-events: none;
}

.search-input {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px 9px 36px;
  color: var(--text);
  width: 260px;
  transition: border-color 0.15s;
}

.search-input:focus { border-color: var(--accent); outline: none; }
.search-input::placeholder { color: var(--muted); }

/* Stats Panel */
.rooms-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 28px;
}

.stat-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.stat-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
}

.stat-lbl {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* Content Area */
.content-area {
  min-height: 200px;
}

.loading, .empty {
  padding: 64px;
  color: var(--muted);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  font-weight: 600;
}

.empty svg {
  color: var(--border);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error Panel */
.error-panel {
  display: flex;
  gap: 20px;
  background: var(--danger-dim);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 28px;
  align-items: flex-start;
}

.error-icon {
  font-size: 28px;
  line-height: 1;
}

.error-content h4 {
  font-size: 15px;
  font-weight: 700;
  color: var(--danger);
  margin-bottom: 4px;
}

.error-content p {
  font-size: 13.5px;
  color: var(--text);
  opacity: 0.9;
  margin-bottom: 12px;
}

.error-tip {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Rooms Grid & Cards */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.room-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.12);
}

.room-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.room-info {
  min-width: 0;
  flex: 1;
}

.room-name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-type {
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}

.room-card-body {
  display: flex;
  flex-direction: column;
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.participants-section .label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
}

.participants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 40px;
}

.participant-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface2);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  max-width: 100%;
}

.p-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 4px var(--accent);
}

.p-name {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-participants {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
  padding: 4px 0;
}

.room-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
}

.room-status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--success);
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
  animation: pulse-ring 1.5s infinite;
}

.room-engine {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
