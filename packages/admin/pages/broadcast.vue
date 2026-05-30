<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Рассылка уведомлений</h1>
        <span class="subtitle">Push-уведомления всем пользователям</span>
      </div>
    </div>

    <div class="broadcast-layout">
      <!-- Compose form -->
      <div class="card compose-card">
        <h2 class="card-title">Новое уведомление</h2>

        <form @submit.prevent="sendBroadcast" class="compose-form">
          <div class="field">
            <label>Заголовок *</label>
            <input v-model="form.title" required maxlength="100" placeholder="Например: Обновление приложения" />
            <span class="char-count">{{ form.title.length }}/100</span>
          </div>

          <div class="field">
            <label>Текст уведомления *</label>
            <textarea
              v-model="form.body"
              required
              maxlength="300"
              rows="4"
              placeholder="Текст который увидит пользователь..."
            />
            <span class="char-count">{{ form.body.length }}/300</span>
          </div>

          <div class="preview-block" v-if="form.title || form.body">
            <span class="preview-label">Предпросмотр</span>
            <div class="notification-preview">
              <div class="notif-icon">🔔</div>
              <div class="notif-content">
                <div class="notif-title">{{ form.title || 'Заголовок' }}</div>
                <div class="notif-body">{{ form.body || 'Текст уведомления' }}</div>
              </div>
            </div>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>
          <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>

          <div class="form-footer">
            <button type="submit" class="btn btn-primary" :disabled="sending">
              <svg v-if="!sending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              <span v-if="sending" class="spinner" />
              {{ sending ? 'Отправляем...' : 'Отправить всем' }}
            </button>
          </div>
        </form>
      </div>

      <!-- History -->
      <div class="card history-card">
        <h2 class="card-title">История рассылок</h2>
        <div v-if="history.length === 0" class="empty-history">
          Рассылок пока не было
        </div>
        <ul class="history-list" v-else>
          <li v-for="h in history" :key="h.id" class="history-item">
            <div class="hi-header">
              <span class="hi-title">{{ h.title }}</span>
              <span class="hi-recipients">👤 {{ h.recipients }}</span>
            </div>
            <div class="hi-body">{{ h.body }}</div>
            <div class="hi-time">{{ formatDate(h.sentAt) }}</div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { post } = useAdminApi()

const form = ref({ title: '', body: '' })
const sending    = ref(false)
const error      = ref('')
const successMsg = ref('')

interface HistoryItem {
  id: string
  title: string
  body: string
  recipients: number
  sentAt: number
}
const history = ref<HistoryItem[]>([])

async function sendBroadcast() {
  error.value      = ''
  successMsg.value = ''
  sending.value    = true
  try {
    const res = await post<{ ok: boolean; recipients: number }>('/admin/broadcast', {
      title: form.value.title,
      body:  form.value.body,
    })
    history.value.unshift({
      id:         crypto.randomUUID(),
      title:      form.value.title,
      body:       form.value.body,
      recipients: res.recipients,
      sentAt:     Date.now(),
    })
    successMsg.value = `Отправлено ${res.recipients} устройствам`
    form.value = { title: '', body: '' }
  } catch (e: any) {
    error.value = e.message ?? 'Ошибка отправки'
  } finally {
    sending.value = false
  }
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.broadcast-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 900px) {
  .broadcast-layout { grid-template-columns: 1fr; }
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 20px;
}

.compose-form { display: flex; flex-direction: column; gap: 20px; }

.field { display: flex; flex-direction: column; gap: 6px; position: relative; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.field input,
.field textarea {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  transition: border-color .15s;
  resize: vertical;
}
.field input:focus,
.field textarea:focus { outline: none; border-color: var(--accent); }
.char-count {
  align-self: flex-end;
  font-size: 11px;
  color: var(--text-muted, #888);
}

.preview-block {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
}
.preview-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .5px; }
.notification-preview {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 10px;
}
.notif-icon { font-size: 22px; }
.notif-title { font-size: 14px; font-weight: 700; color: var(--text); }
.notif-body  { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.form-footer { display: flex; justify-content: flex-end; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity .15s;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:not(:disabled):hover { opacity: .88; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg   { color: #ef4444; font-size: 13px; margin: 0; }
.success-msg { color: #10b981; font-size: 13px; margin: 0; }

/* History */
.empty-history { color: var(--text-secondary); font-size: 14px; text-align: center; padding: 24px 0; }
.history-list  { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.history-item  {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
}
.hi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.hi-title  { font-size: 14px; font-weight: 700; color: var(--text); }
.hi-recipients { font-size: 12px; color: var(--text-secondary); }
.hi-body   { font-size: 13px; color: var(--text-secondary); }
.hi-time   { font-size: 11px; color: var(--text-muted, #888); margin-top: 6px; }
</style>
