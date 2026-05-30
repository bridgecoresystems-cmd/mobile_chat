<template>
  <div>
    <NuxtLink to="/broadcasts" class="back-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Рассылки
    </NuxtLink>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Загрузка...</span>
    </div>

    <div v-else-if="!item" class="empty-state">Рассылка не найдена</div>

    <template v-else>
      <!-- Hero -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="notif-icon">🔔</div>
          <div class="hero-info">
            <h1 class="hero-title">{{ item.title }}</h1>
            <div class="hero-meta">
              <span class="recipients-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {{ item.recipients }} получателей
              </span>
              <span class="meta-date">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <button class="btn btn-accent" @click="resend">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Повторить
          </button>
          <button class="btn btn-danger" @click="handleDelete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Удалить
          </button>
        </div>
      </div>

      <div class="content-grid">
        <!-- Details -->
        <div class="card">
          <div class="card-header"><h3>Данные рассылки</h3></div>
          <div class="detail-list">
            <div class="detail-row">
              <span class="detail-label">ID</span>
              <span class="detail-value mono">{{ item.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Заголовок</span>
              <span class="detail-value">{{ item.title }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Текст</span>
              <span class="detail-value body-text">{{ item.body }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Получатели</span>
              <span class="detail-value">{{ item.recipients }} устройств</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Отправил</span>
              <span class="detail-value">{{ item.created_by_username ?? '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Дата</span>
              <span class="detail-value">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="card">
          <div class="card-header"><h3>Предпросмотр</h3></div>
          <div class="preview-body">
            <div class="phone-mock">
              <div class="phone-status">9:41</div>
              <div class="notif-card">
                <div class="notif-app-row">
                  <span class="notif-app-icon">🔔</span>
                  <span class="notif-app-name">konekt</span>
                  <span class="notif-time">сейчас</span>
                </div>
                <div class="notif-content-title">{{ item.title }}</div>
                <div class="notif-content-body">{{ item.body }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { get, del, post } = useAdminApi()

const item    = ref<any | null>(null)
const loading = ref(true)

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('ru', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  try {
    item.value = await get<any>(`/admin/broadcasts/${route.params.id}`)
  } catch {
    item.value = null
  } finally {
    loading.value = false
  }
}

async function resend() {
  if (!confirm(`Повторно отправить рассылку "${item.value.title}" всем пользователям?`)) return
  try {
    await post('/admin/broadcast', { title: item.value.title, body: item.value.body })
    alert('Рассылка отправлена повторно')
  } catch (e: any) {
    alert('Ошибка: ' + e.message)
  }
}

async function handleDelete() {
  if (!confirm('Удалить эту запись из истории рассылок?')) return
  try {
    await del(`/admin/broadcasts/${item.value.id}`)
    await navigateTo('/broadcasts')
  } catch (e: any) {
    alert('Ошибка: ' + e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--muted); font-size: 13.5px; font-weight: 600;
  margin-bottom: 28px; transition: color 0.15s; text-decoration: none;
}
.back-btn:hover { color: var(--text); }

.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 80px; color: var(--muted); text-align: center;
}
.spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Hero */
.hero-card {
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; flex-wrap: wrap;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 28px 32px; margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.hero-left { display: flex; align-items: center; gap: 20px; }
.notif-icon { font-size: 48px; line-height: 1; }
.hero-info { display: flex; flex-direction: column; gap: 8px; }
.hero-title { font-size: 22px; font-weight: 800; margin: 0; }
.hero-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.recipients-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--accent-dim); color: var(--accent);
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
}
.meta-date { font-size: 13px; color: var(--muted); }
.hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px; align-items: start;
}
@media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

/* Cards */
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.card-header { padding: 18px 24px; border-bottom: 1px solid var(--border); }
.card-header h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin: 0; }

/* Detail table */
.detail-list { padding: 0; }
.detail-row {
  display: grid; grid-template-columns: 150px 1fr;
  border-bottom: 1px solid var(--border);
}
.detail-row:last-child { border-bottom: none; }
.detail-label {
  padding: 14px 20px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted);
  border-right: 1px solid var(--border);
  display: flex; align-items: flex-start; padding-top: 15px;
  background: rgba(255,255,255,0.01);
}
.detail-value {
  padding: 14px 20px; font-size: 14px; font-weight: 500;
  color: var(--text); word-break: break-word;
}
.detail-value.mono { font-family: monospace; font-size: 12px; color: var(--accent); }
.detail-value.body-text { white-space: pre-wrap; line-height: 1.6; }

/* Phone preview */
.preview-body { padding: 24px; display: flex; justify-content: center; }
.phone-mock {
  width: 240px;
  background: #1a1a2e;
  border-radius: 24px;
  padding: 16px 12px;
  border: 2px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.phone-status {
  text-align: center; font-size: 13px; font-weight: 700;
  color: rgba(255,255,255,0.7); margin-bottom: 12px;
}
.notif-card {
  background: rgba(255,255,255,0.08);
  border-radius: 14px; padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.notif-app-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.notif-app-icon { font-size: 14px; }
.notif-app-name { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); flex: 1; text-transform: uppercase; letter-spacing: 0.5px; }
.notif-time { font-size: 11px; color: rgba(255,255,255,0.3); }
.notif-content-title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 3px; }
.notif-content-body  { font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  transition: all 0.15s; white-space: nowrap;
  border: 1px solid transparent; cursor: pointer;
}
.btn-accent { background: var(--accent); color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.2); }
.btn-accent:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-danger { background: var(--danger-dim); color: var(--danger); border-color: rgba(239,68,68,0.15); }
.btn-danger:hover { background: rgba(239,68,68,0.2); }
</style>
