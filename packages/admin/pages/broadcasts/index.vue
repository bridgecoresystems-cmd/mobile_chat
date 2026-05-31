<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Рассылки</h1>
        <span class="subtitle" v-if="total !== null">Всего отправлено: {{ total }}</span>
      </div>

      <div class="header-actions">
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" placeholder="Поиск по заголовку..." class="search-input" />
        </div>

        <button class="add-btn" @click="showModal = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Новая рассылка
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>Загрузка рассылок...</span>
      </div>
      <div v-else-if="!filtered.length" class="empty">Рассылок пока не было</div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>Заголовок</th>
            <th>Текст</th>
            <th>Статус</th>
            <th>Получатели</th>
            <th>Отправил</th>
            <th>Дата</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="b in paginated"
            :key="b.id"
            class="row"
            @click="navigateTo('/broadcasts/' + b.id)"
          >
            <td>
              <div class="title-cell">
                <div class="notif-icon">🔔</div>
                <span class="title-text">{{ b.title }}</span>
              </div>
            </td>
            <td class="muted body-cell">{{ truncate(b.body, 60) }}</td>
            <td>
              <span class="status-badge" :class="b.status ?? 'sent'">{{ statusLabel(b.status) }}</span>
            </td>
            <td>
              <span class="recipients-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {{ b.recipients }}
              </span>
            </td>
            <td class="muted">{{ b.created_by_username ?? '—' }}</td>
            <td class="muted">{{ formatDate(b.created_at) }}</td>
            <td @click.stop>
              <button class="action-btn delete" title="Удалить" @click="deleteBroadcast(b)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination-container" v-if="filtered.length > 0">
      <div class="pagination-info">
        Показано с <strong>{{ (currentPage - 1) * itemsPerPage + 1 }}</strong> по <strong>{{ Math.min(currentPage * itemsPerPage, filtered.length) }}</strong> из <strong>{{ filtered.length }}</strong>
      </div>

      <div class="pagination-controls">
        <div class="per-page-select">
          <span>Показывать по:</span>
          <select v-model="itemsPerPage" class="pagination-select">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="pagination-buttons">
          <button class="page-btn nav-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button
            v-for="p in pagesToShow"
            :key="p"
            class="page-btn"
            :class="{ active: currentPage === p, ellipsis: p === '...' }"
            :disabled="p === '...'"
            @click="typeof p === 'number' ? currentPage = p : null"
          >{{ p }}</button>
          <button class="page-btn nav-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Create / Send modal -->
    <div class="modal-backdrop" v-if="showModal" @click="showModal = false">
      <div class="modal-card" @click.stop>
        <div class="modal-header">
          <h3>Новая рассылка</h3>
          <button class="close-btn" @click="showModal = false">✕</button>
        </div>

        <form @submit.prevent="sendBroadcast" class="modal-form">
          <div class="field">
            <label>Заголовок *</label>
            <input v-model="form.title" required maxlength="100" placeholder="Например: Обновление приложения" />
            <span class="char-count">{{ form.title.length }}/100</span>
          </div>

          <div class="field">
            <label>Текст уведомления *</label>
            <textarea v-model="form.body" required maxlength="300" rows="4" placeholder="Текст который увидит пользователь..." />
            <span class="char-count">{{ form.body.length }}/300</span>
          </div>

          <div class="field">
            <label>Запланировать на (необязательно)</label>
            <input v-model="form.scheduled_at" type="datetime-local" :min="minDatetime" />
            <span class="field-hint">Оставьте пустым — отправится немедленно</span>
          </div>

          <div class="preview-block" v-if="form.title || form.body">
            <span class="preview-label">Предпросмотр</span>
            <div class="notif-preview">
              <div class="notif-emoji">🔔</div>
              <div>
                <div class="notif-title">{{ form.title || 'Заголовок' }}</div>
                <div class="notif-body">{{ form.body || 'Текст уведомления' }}</div>
              </div>
            </div>
          </div>

          <p v-if="sendError" class="error-msg">{{ sendError }}</p>

          <div class="modal-buttons">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="sending">
              <svg v-if="!sending" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {{ sending ? 'Ставим в очередь...' : (form.scheduled_at ? '📅 Запланировать' : '🚀 Отправить всем') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get, post, del } = useAdminApi()

const items       = ref<any[]>([])
const total       = ref<number | null>(null)
const loading     = ref(true)
const search      = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const showModal   = ref(false)
const sending     = ref(false)
const sendError   = ref('')
const form        = ref({ title: '', body: '', scheduled_at: '' })

const minDatetime = computed(() => {
  const d = new Date(Date.now() + 60_000) // at least 1 min in future
  return d.toISOString().slice(0, 16)
})

function statusLabel(s: string) {
  return { pending: '⏳ В очереди', scheduled: '📅 Запланирована', sending: '📤 Отправляется', sent: '✅ Отправлена', failed: '❌ Ошибка' }[s] ?? s
}

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('ru', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(b => b.title.toLowerCase().includes(q) || b.body.toLowerCase().includes(q))
})

const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filtered.value.slice(start, start + itemsPerPage.value)
})

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage.value) || 1)

const pagesToShow = computed(() => {
  const t = totalPages.value
  const c = currentPage.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const pages: (number | string)[] = [1]
  if (c > 3) pages.push('...')
  for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) pages.push(i)
  if (c < t - 2) pages.push('...')
  pages.push(t)
  return pages
})

watch(itemsPerPage, (v) => {
  localStorage.setItem('broadcasts_items_per_page', v.toString())
  currentPage.value = 1
})
watch(search, () => { currentPage.value = 1 })

async function load() {
  loading.value = true
  try {
    const data = await get<any>('/admin/broadcasts?limit=1000')
    items.value = data.broadcasts
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function sendBroadcast() {
  sendError.value = ''
  sending.value = true
  try {
    await post('/admin/broadcast', {
      title:        form.value.title,
      body:         form.value.body,
      scheduled_at: form.value.scheduled_at || null,
    })
    form.value = { title: '', body: '', scheduled_at: '' }
    showModal.value = false
    await load()
  } catch (e: any) {
    sendError.value = e.message ?? 'Ошибка отправки'
  } finally {
    sending.value = false
  }
}

async function deleteBroadcast(b: any) {
  if (!confirm(`Удалить запись рассылки "${b.title}"?`)) return
  try {
    await del(`/admin/broadcasts/${b.id}`)
    items.value = items.value.filter(x => x.id !== b.id)
    if (total.value !== null) total.value--
  } catch (e: any) {
    alert('Ошибка: ' + e.message)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('broadcasts_items_per_page')
  if (saved) {
    const parsed = parseInt(saved, 10)
    if (!isNaN(parsed) && [5, 10, 25, 50].includes(parsed)) itemsPerPage.value = parsed
  }
  load()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;
}
@media (max-width: 768px) { .page-header { flex-direction: column; align-items: stretch; } }
.page-header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
.subtitle { color: var(--muted); font-size: 14px; }

.header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: var(--muted); pointer-events: none; }
.search-input {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 9px 12px 9px 36px;
  color: var(--text); width: 220px; transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--accent); outline: none; }
.search-input::placeholder { color: var(--muted); }

.add-btn {
  display: flex; align-items: center; gap: 7px;
  background: var(--accent); color: #fff;
  font-weight: 700; font-size: 13px;
  padding: 10px 16px; border-radius: 10px;
  box-shadow: 0 4px 12px rgba(99,102,241,0.2);
  transition: all 0.2s;
}
.add-btn:hover { opacity: 0.95; transform: translateY(-1px); }

.table-wrap {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.loading, .empty { padding: 48px; color: var(--muted); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.spinner {
  width: 24px; height: 24px;
  border: 3px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left; padding: 12px 20px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--muted); border-bottom: 1.5px solid var(--border);
}
.table td { padding: 13px 20px; border-top: 1px solid var(--border); vertical-align: middle; }
.row { cursor: pointer; transition: background-color 0.15s; }
.row:hover td { background: rgba(255,255,255,0.015); }

.title-cell { display: flex; align-items: center; gap: 10px; }
.notif-icon { font-size: 20px; flex-shrink: 0; }
.title-text { font-weight: 700; font-size: 14px; }
.body-cell { font-size: 13px; max-width: 300px; }
.muted { color: var(--muted); font-size: 13.5px; }

.recipients-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--accent-dim); color: var(--accent);
  padding: 4px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
}

.status-badge {
  display: inline-block;
  padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 600;
  background: var(--surface2); color: var(--muted);
}
.status-badge.sent      { background: rgba(34,197,94,.12); color: #22c55e; }
.status-badge.scheduled { background: rgba(99,102,241,.12); color: var(--accent); }
.status-badge.sending   { background: rgba(251,191,36,.12); color: #f59e0b; }
.status-badge.failed    { background: rgba(239,68,68,.12);  color: #ef4444; }

.field-hint { font-size: 11px; color: var(--muted); margin-top: 2px; }

.action-btn {
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  background: var(--surface2); color: var(--muted);
  border: 1px solid var(--border);
}
.action-btn.delete:hover { background: var(--danger-dim); color: var(--danger); border-color: rgba(239,68,68,0.2); }

/* Pagination */
.pagination-container {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 16px; margin-top: 24px; padding: 16px 20px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.pagination-info { font-size: 13px; color: var(--muted); }
.pagination-info strong { color: var(--text); font-weight: 700; }
.pagination-controls { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.per-page-select { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
.pagination-select {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 8px; color: var(--text); font-weight: 600; outline: none;
}
.pagination-select:focus { border-color: var(--accent); }
.pagination-buttons { display: flex; align-items: center; gap: 6px; }
.page-btn {
  min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; background: var(--surface2); border: 1px solid var(--border);
  color: var(--muted); font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.page-btn:hover:not(:disabled):not(.ellipsis) { background: rgba(255,255,255,0.05); color: var(--text); }
.page-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 0 10px rgba(99,102,241,0.3); }
.page-btn:disabled:not(.ellipsis) { opacity: 0.4; cursor: not-allowed; }
.page-btn.ellipsis { background: none; border: none; cursor: default; }
.nav-btn { font-size: 16px; }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  z-index: 200; display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease-out;
}
.modal-card {
  width: 100%; max-width: 500px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.4);
  overflow: hidden; animation: scaleUp 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 16px; font-weight: 800; }
.close-btn { font-size: 18px; color: var(--muted); transition: color 0.15s; }
.close-btn:hover { color: var(--text); }
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); }
.field input, .field textarea {
  background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 10px 14px; color: var(--text);
  font-size: 14px; font-family: inherit; resize: vertical; transition: border-color 0.15s;
}
.field input:focus, .field textarea:focus { border-color: var(--accent); outline: none; }
.char-count { align-self: flex-end; font-size: 11px; color: var(--muted); }
.preview-block {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px;
}
.preview-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px; }
.notif-preview { display: flex; align-items: flex-start; gap: 12px; margin-top: 10px; }
.notif-emoji { font-size: 22px; }
.notif-title { font-size: 14px; font-weight: 700; }
.notif-body  { font-size: 13px; color: var(--muted); margin-top: 3px; }
.error-msg { color: var(--danger); background: var(--danger-dim); border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; }
.modal-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; transition: all 0.15s; cursor: pointer; border: 1px solid transparent; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--surface2); color: var(--muted); border-color: var(--border); }
.btn-secondary:hover { color: var(--text); }
</style>
