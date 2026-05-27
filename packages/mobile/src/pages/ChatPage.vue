<template>
  <div class="page">
    <header>
      <button class="back" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="peer-info">
        <div class="peer-avatar">{{ peerInitials }}</div>
        <div>
          <p class="peer-name">{{ peerName }}</p>
          <span class="status" :class="{ online: peerIsOnline }">
            <span class="dot" />
            {{ peerIsOnline ? 'онлайн' : 'не в сети' }}
          </span>
        </div>
      </div>
    </header>

    <div class="body" ref="bodyEl">
      <div v-if="!messages.length && isConnected" class="empty">
        <div class="empty-icon">✨</div>
        <p>История сообщений пуста</p>
        <span>Напишите первое сообщение</span>
      </div>

      <template v-else>
        <template v-for="msg in annotatedMessages" :key="msg.id">
          <!-- Разделитель по дате -->
          <div v-if="msg.dateSep" class="date-sep">
            <span>{{ msg.dateSep }}</span>
          </div>

          <div
            class="msg-row"
            :class="{
              own:         msg.mine,
              'grp-start': msg.isGroupFirst,
              'grp-end':   msg.isGroupLast,
            }"
          >
            <!-- Слот аватара: всегда резервирует ширину, показывает аватар только в конце группы -->
            <div v-if="!msg.mine" class="avatar-slot">
              <div v-if="msg.showAvatar" class="msg-avatar">{{ peerInitials }}</div>
            </div>

            <div class="bubble-wrap">
              <span v-if="msg.showName" class="sender-name">{{ peerName }}</span>
              <div
                class="bubble"
                :class="{
                  deleted:      msg.deleted,
                  'grp-notlast': !msg.isGroupLast,
                }"
              >
                <!-- Фото -->
                <img
                  v-if="msg.photoUrl && !msg.deleted"
                  :src="msg.photoUrl"
                  class="photo"
                  loading="lazy"
                  @click="openPhoto(msg.photoUrl!)"
                />
                <!-- Текст -->
                <p v-else class="text">{{ msg.deleted ? 'Сообщение удалено' : msg.text }}</p>

                <div class="time">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {{ formatTime(msg.timestamp) }}
                  <span v-if="msg.mine && !msg.deleted" class="read-status" :class="{ read: msg.read }">
                    {{ msg.read ? '✓✓' : '✓' }}
                  </span>
                </div>
              </div>

              <!-- Кнопки редактировать/удалить (только свои, не удалённые) -->
              <div v-if="msg.mine && !msg.deleted" class="msg-actions">
                <button class="act-btn" @click="startEdit(msg)">✏️</button>
                <button class="act-btn" @click="confirmDelete(msg.id)">🗑️</button>
              </div>
            </div>
          </div>
        </template>

        <div v-if="typingText" class="typing">
          <div class="typing-avatar">{{ peerInitials }}</div>
          <div class="typing-bubble">
            <span class="dots"><span /><span /><span /></span>
          </div>
        </div>
      </template>
    </div>

    <!-- Баннер редактирования -->
    <div v-if="editingMsg" class="edit-banner">
      <div class="edit-banner-left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>{{ editingMsg.text.slice(0, 40) }}</span>
      </div>
      <button @click="cancelEdit">✕</button>
    </div>

    <footer>
      <div class="input-row">
        <label class="photo-btn" title="Прикрепить фото">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <input
            type="file"
            accept="image/*"
            class="hidden-input"
            :disabled="!isConnected || uploading"
            @change="onFileChange"
          />
        </label>

        <textarea
          v-model="draft"
          class="textarea"
          :placeholder="editingMsg ? 'Редактировать сообщение...' : 'Написать сообщение...'"
          rows="1"
          :disabled="!isConnected"
          @keydown="onKey"
          @input="onInput"
        />
        <button
          class="send-btn"
          :disabled="!draft.trim() || !isConnected || uploading"
          @click="sendMsg"
        >
          <svg v-if="!uploading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span v-else class="spinner" />
        </button>
      </div>
    </footer>

    <!-- Лайтбокс -->
    <div v-if="lightboxUrl" class="lightbox" @click="lightboxUrl = null">
      <img :src="lightboxUrl" class="lightbox-img" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, bffHeaders } from '../stores/auth'
import { useChat } from '../composables/useChat'
import type { Contact } from '@chat/shared'
import type { Message } from '../composables/useChat'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const roomId = route.params.roomId as string
const chat   = useChat(roomId)
const { messages, onlineUsers, typingUsers, isConnected } = chat

const draft       = ref('')
const bodyEl      = ref<HTMLElement | null>(null)
const contact     = ref<Contact | null>(null)
const uploading   = ref(false)
const lightboxUrl = ref<string | null>(null)
const editingMsg  = ref<Message | null>(null)

const peerId = computed(() => {
  const parts = roomId.split('__')
  if (parts.length !== 2) return null
  return parts.find(p => p !== auth.user?.id) ?? null
})

const peerIsOnline = computed(() =>
  peerId.value ? onlineUsers.value.has(peerId.value) : false
)

const peerName = computed(() => {
  if (!contact.value) return roomId
  const c = contact.value
  if (c.first_name && c.last_name) return `${c.first_name} ${c.last_name}`
  return c.username ?? roomId
})

const peerInitials = computed(() => {
  const name = peerName.value.split(' ')
  return name.length >= 2
    ? (name[0][0] + name[1][0]).toUpperCase()
    : name[0][0].toUpperCase()
})

const typingText = computed(() =>
  typingUsers.value.size > 0 ? `${peerName.value} печатает...` : ''
)

// ── Группировка и разделители по датам ───────────────────────────────────────

function sameDay(ts1: number, ts2: number) {
  const a = new Date(ts1), b = new Date(ts2)
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function formatDateSep(ts: number) {
  const d   = new Date(ts)
  const now = new Date()
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (sameDay(ts, now.getTime()))  return 'Сегодня'
  if (sameDay(ts, yest.getTime())) return 'Вчера'
  return d.toLocaleDateString('ru', {
    day: 'numeric', month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

const annotatedMessages = computed(() => {
  const msgs = messages.value
  return msgs.map((msg, i) => {
    const prev = msgs[i - 1]
    const next = msgs[i + 1]

    const prevSameDay = prev ? sameDay(prev.timestamp, msg.timestamp) : false
    const nextSameDay = next ? sameDay(msg.timestamp, next.timestamp) : false

    const samePrev = prev?.mine === msg.mine && prevSameDay
    const sameNext = next?.mine === msg.mine && nextSameDay

    return {
      ...msg,
      isGroupFirst: !samePrev,
      isGroupLast:  !sameNext,
      showAvatar:   !msg.mine && !sameNext,
      showName:     !msg.mine && !samePrev,
      dateSep:      !prevSameDay ? formatDateSep(msg.timestamp) : null,
    }
  })
})

// ── Форматирование времени ────────────────────────────────────────────────────

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

// ── Отправка / редактирование / удаление ─────────────────────────────────────

function sendMsg() {
  if (!draft.value.trim()) return
  if (editingMsg.value) {
    chat.editMessage(editingMsg.value.id, draft.value.trim())
    const msg = messages.value.find(m => m.id === editingMsg.value!.id)
    if (msg) msg.text = draft.value.trim()
    cancelEdit()
  } else {
    chat.send(draft.value.trim())
  }
  draft.value = ''
}

function startEdit(msg: Message) {
  editingMsg.value = msg
  draft.value = msg.text
}

function cancelEdit() {
  editingMsg.value = null
  draft.value = ''
}

function confirmDelete(msgId: string) {
  if (!confirm('Удалить сообщение?')) return
  chat.deleteMessage(msgId)
  const msg = messages.value.find(m => m.id === msgId)
  if (msg) { msg.deleted = true; msg.text = '' }
}

function openPhoto(url: string) { lightboxUrl.value = url }

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  input.value = ''

  uploading.value = true
  try {
    // Загружаем через BFF-прокси — сервер сам пишет в R2, без CORS на клиенте
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API}/upload`, {
      method:  'POST',
      headers: bffHeaders({ skipContentType: true }),
      body:    form,
    })
    if (!res.ok) throw new Error('upload failed')
    const { file_url } = await res.json()

    chat.sendPhoto(file_url)
  } catch (err) {
    console.error('Photo upload failed:', err)
    alert('Не удалось загрузить фото')
  } finally {
    uploading.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
}

function onInput() {
  if (!editingMsg.value) chat.sendTyping()
}

async function scrollBottom() {
  await nextTick()
  if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
}

watch(messages, scrollBottom, { deep: true })

async function loadContactInfo() {
  try {
    const res = await fetch(`${API}/contacts`, { headers: bffHeaders() })
    const list: Contact[] = await res.json()
    contact.value = list.find(c => c.room_id === roomId) ?? null
  } catch {}
}

onMounted(async () => {
  if (!auth.chat_token || !auth.user) { router.push('/login'); return }
  await loadContactInfo()
  chat.connect(auth.chat_token, auth.user.id)
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }

/* ── Шапка ─────────────────────────────────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 8px rgba(0,0,0,.08);
  flex-shrink: 0;
  z-index: 1;
}

.back {
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0;
}

.peer-info { display: flex; align-items: center; gap: 10px; }

.peer-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
  flex-shrink: 0;
}

.peer-name { font-size: 15px; font-weight: 700; }

.status {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--muted); font-weight: 500;
}

.status.online { color: #22c55e; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* ── Тело чата ─────────────────────────────────────────────────────────────── */
.body {
  flex: 1; overflow-y: auto;
  padding: 12px 16px 16px;
  display: flex; flex-direction: column;
  background: var(--bg);
}

.empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: var(--muted); padding: 40px 0;
}

.empty-icon { font-size: 40px; }
.empty p    { font-size: 15px; font-weight: 600; color: var(--text); }
.empty span { font-size: 13px; }

/* ── Разделитель дат ───────────────────────────────────────────────────────── */
.date-sep {
  display: flex; align-items: center; justify-content: center;
  margin: 10px 0 6px;
}

.date-sep span {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 11px; font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: .2px;
}

/* ── Строки сообщений ──────────────────────────────────────────────────────── */
.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  max-width: 82%;
  margin-top: 2px;
  animation: msgIn .16s ease both;
}

.msg-row.grp-start { margin-top: 10px; }
.date-sep + .msg-row { margin-top: 4px; }

.msg-row.own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Аватар ────────────────────────────────────────────────────────────────── */
.avatar-slot {
  width: 30px; height: 30px;
  flex-shrink: 0;
  display: flex; align-items: flex-end;
}

.msg-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--accent);
}

/* ── Пузырь ────────────────────────────────────────────────────────────────── */
.bubble-wrap { display: flex; flex-direction: column; gap: 2px; }

.sender-name { font-size: 11px; font-weight: 700; color: var(--accent); margin-left: 4px; }

.bubble {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px 16px 16px 16px; /* хвостик слева-снизу для последнего */
  padding: 8px 11px;
  box-shadow: var(--shadow);
}

/* Не последнее в группе — убираем хвостик */
.bubble.grp-notlast {
  border-radius: 4px 16px 16px 16px;
}
/* Последнее (или одиночное) для чужих — хвостик слева-снизу */
.bubble:not(.grp-notlast) {
  border-radius: 4px 16px 16px 16px;
}

/* Свои сообщения */
.own .bubble {
  background: linear-gradient(135deg, var(--accent), #4f46e5);
  border: none;
  border-radius: 16px 4px 4px 16px; /* хвостик справа-снизу */
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,.35);
}

.own .bubble.grp-notlast {
  border-radius: 16px 4px 4px 16px;
}

.bubble.deleted { opacity: .5; font-style: italic; }

.photo {
  max-width: 220px; max-height: 220px;
  border-radius: 10px; display: block;
  cursor: pointer; object-fit: cover;
}

.text { font-size: 14px; line-height: 1.45; word-break: break-word; }

.time {
  display: flex; align-items: center; gap: 3px;
  font-size: 10px; color: var(--muted);
  justify-content: flex-end; margin-top: 4px;
}

.own .time { color: rgba(255,255,255,.6); }

.read-status { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.5); margin-left: 2px; }
.read-status.read { color: #86efac; }

/* ── Кнопки редактирования ────────────────────────────────────────────────── */
.msg-actions { display: flex; gap: 4px; margin-top: 2px; justify-content: flex-end; }

.act-btn {
  font-size: 12px; padding: 2px 5px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 6px; cursor: pointer;
  opacity: .6; transition: opacity .15s;
}

.act-btn:hover { opacity: 1; }

/* ── Индикатор печатания ─────────────────────────────────────────────────────*/
.typing {
  display: flex; align-items: flex-end; gap: 7px;
  margin-top: 8px;
}

.typing-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--accent);
  flex-shrink: 0;
}

.typing-bubble {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px 16px 16px 16px;
  padding: 10px 14px;
  display: flex; align-items: center; gap: 4px;
}

.dots { display: flex; gap: 4px; }
.dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--muted);
  animation: blink 1.4s infinite both;
}
.dots span:nth-child(2) { animation-delay: .2s; }
.dots span:nth-child(3) { animation-delay: .4s; }

@keyframes blink { 0%,100% { opacity: .2; } 20% { opacity: 1; } }

/* ── Баннер редактирования ───────────────────────────────────────────────────*/
.edit-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 16px;
  background: var(--accent); color: #fff; font-size: 12px;
  gap: 8px;
}

.edit-banner-left { display: flex; align-items: center; gap: 7px; opacity: .9; }
.edit-banner button { background: none; color: #fff; font-size: 16px; opacity: .8; }

/* ── Подвал ────────────────────────────────────────────────────────────────── */
footer {
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  box-shadow: 0 -1px 8px rgba(0,0,0,.06);
}

.input-row { display: flex; align-items: center; gap: 8px; }

.photo-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; flex-shrink: 0;
  color: var(--muted); cursor: pointer; transition: color .15s;
}

.photo-btn:hover { color: var(--accent); }
.hidden-input { display: none; }

.textarea {
  flex: 1; background: var(--bg); border: 1.5px solid var(--border);
  border-radius: 20px; padding: 9px 14px; color: var(--text);
  font-size: 14px; resize: none; max-height: 100px; line-height: 1.4;
  transition: border-color .15s;
}

.textarea:focus { border-color: var(--accent); }

.send-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .15s, transform .1s;
}

.send-btn:not(:disabled):active { transform: scale(.92); }
.send-btn:disabled { opacity: .4; }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  display: inline-block;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Лайтбокс ────────────────────────────────────────────────────────────────*/
.lightbox {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,.92);
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-out;
}

.lightbox-img {
  max-width: 95vw; max-height: 90vh;
  border-radius: 12px; object-fit: contain;
}
</style>
