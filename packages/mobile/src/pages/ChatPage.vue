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
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="{ own: msg.mine }"
        >
          <div v-if="!msg.mine" class="msg-avatar">{{ peerInitials }}</div>
          <div class="bubble-wrap">
            <span v-if="!msg.mine" class="sender-name">{{ peerName }}</span>
            <div class="bubble" :class="{ deleted: msg.deleted }">
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
                <!-- Статус прочтения для своих сообщений -->
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

        <div v-if="typingText" class="typing">
          <span>{{ typingText }}</span>
          <span class="dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      </template>
    </div>

    <!-- Редактирование -->
    <div v-if="editingMsg" class="edit-banner">
      <span>Редактирование: {{ editingMsg.text.slice(0, 40) }}</span>
      <button @click="cancelEdit">✕</button>
    </div>

    <footer>
      <div class="input-row">
        <!-- Кнопка выбора фото -->
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

    <!-- Лайтбокс для просмотра фото -->
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

const draft      = ref('')
const bodyEl     = ref<HTMLElement | null>(null)
const contact    = ref<Contact | null>(null)
const uploading  = ref(false)
const lightboxUrl = ref<string | null>(null)
const editingMsg = ref<Message | null>(null)

// Определяем peer user_id из room_id (формат "id1__id2")
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

// Typing indicator — show the peer's name, not their raw user id (1-on-1 chat)
const typingText = computed(() =>
  typingUsers.value.size > 0 ? `${peerName.value} печатает...` : ''
)

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function sendMsg() {
  if (!draft.value.trim()) return
  if (editingMsg.value) {
    chat.editMessage(editingMsg.value.id, draft.value.trim())
    // Optimistically update local copy
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

function openPhoto(url: string) {
  lightboxUrl.value = url
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  input.value = ""

  uploading.value = true
  try {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `photo_${Date.now()}.${ext}`

    // Получаем presigned URL через BFF
    const res = await fetch(
      `${API}/upload-url?filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(file.type || 'image/jpeg')}`,
      { headers: bffHeaders() }
    )
    if (!res.ok) throw new Error('upload-url failed')
    const { upload_url, file_url } = await res.json()

    // Загружаем напрямую в R2
    await fetch(upload_url, {
      method:  'PUT',
      headers: { 'content-type': file.type || 'image/jpeg' },
      body:    file,
    })

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

header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
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

.body {
  flex: 1; overflow-y: auto;
  padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
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

.msg-row {
  display: flex; align-items: flex-end; gap: 8px; max-width: 80%;
}

.msg-row.own {
  align-self: flex-end; flex-direction: row-reverse;
}

.msg-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0; color: var(--accent);
}

.bubble-wrap { display: flex; flex-direction: column; gap: 3px; }

.sender-name { font-size: 11px; font-weight: 700; color: var(--accent); margin-left: 4px; }

.bubble {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px 16px 16px 4px;
  padding: 9px 12px; box-shadow: 0 1px 2px rgba(0,0,0,.1);
}

.own .bubble {
  background: linear-gradient(135deg, var(--accent), #4f46e5);
  border: none; border-radius: 16px 16px 4px 16px; color: #fff;
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

.read-status {
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,.5);
  margin-left: 2px;
}

.read-status.read { color: #86efac; }

.msg-actions {
  display: flex; gap: 4px;
  margin-top: 2px; justify-content: flex-end;
}

.act-btn {
  font-size: 12px; padding: 2px 4px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 6px; cursor: pointer;
  opacity: .6; transition: opacity .15s;
}

.act-btn:hover { opacity: 1; }

.typing {
  font-size: 13px; color: var(--muted); font-style: italic;
  display: flex; align-items: center; gap: 4px; padding-left: 38px;
}

.dots span { animation: blink 1.4s infinite both; }
.dots span:nth-child(2) { animation-delay: .2s; }
.dots span:nth-child(3) { animation-delay: .4s; }

@keyframes blink { 0%,100% { opacity: .2; } 20% { opacity: 1; } }

.edit-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 16px;
  background: var(--accent); color: #fff; font-size: 12px;
}

.edit-banner button { background: none; color: #fff; font-size: 16px; }

footer {
  border-top: 1px solid var(--border); background: var(--surface);
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
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
  border-radius: 12px; padding: 10px 14px; color: var(--text);
  font-size: 14px; resize: none; max-height: 100px; line-height: 1.4;
}

.textarea:focus { border-color: var(--accent); background: var(--surface); }

.send-btn {
  width: 42px; height: 42px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .15s;
}

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

.lightbox {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,.9);
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-out;
}

.lightbox-img {
  max-width: 95vw; max-height: 90vh;
  border-radius: 12px; object-fit: contain;
}
</style>
