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
            {{ peerIsOnline ? t('chat_online') : t('chat_offline') }}
          </span>
        </div>
      </div>
    </header>

    <div class="body" ref="bodyEl">
      <div v-if="!messages.length && isConnected" class="empty">
        <div class="empty-icon">✨</div>
        <p>{{ t('chat_empty') }}</p>
        <span>{{ t('chat_empty_sub') }}</span>
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
                  @load="onImageLoad"
                  @click="openPhoto(msg.photoUrl!)"
                />
                <!-- Текст -->
                <p v-else class="text">{{ msg.deleted ? t('chat_deleted') : msg.text }}</p>

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

    <!-- Превью выбранных фото -->
    <div v-if="pendingPhotos.length" class="photo-strip">
      <div class="photo-strip-scroll">
        <div v-for="(p, i) in pendingPhotos" :key="i" class="strip-thumb">
          <img :src="p.previewUrl" />
          <button class="strip-remove" @click="removePhoto(i)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div v-if="uploadingIndex === i" class="strip-progress">
            <span class="strip-spinner" />
          </div>
        </div>
        <button
          v-if="pendingPhotos.length < 5"
          class="strip-add"
          @click="onPhotoBtn"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <span class="photo-count">{{ pendingPhotos.length }}/5</span>
    </div>

    <footer>
      <div class="input-row">
        <button
          class="photo-btn"
          :disabled="!isConnected || uploading || pendingPhotos.length >= 5"
          @click="onPhotoBtn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <!-- browser fallback: hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden-input"
          @change="onFileChange"
        />

        <textarea
          v-model="draft"
          class="textarea"
          :placeholder="editingMsg ? t('chat_edit_ph') : t('chat_placeholder')"
          rows="1"
          :disabled="!isConnected"
          @keydown="onKey"
          @input="onInput"
        />
        <button
          class="send-btn"
          :disabled="(!draft.trim() && !pendingPhotos.length) || !isConnected || uploading"
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
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, bffHeaders } from '../stores/auth'
import { useChat } from '../composables/useChat'
import { useI18n } from '../composables/useI18n'
import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import type { Contact } from '@chat/shared'
import type { Message } from '../composables/useChat'
import { db } from '../db/cache'

const { t, locale } = useI18n()

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const roomId = route.params.roomId as string
const chat   = useChat(roomId)
const { messages, onlineUsers, typingUsers, isConnected } = chat

interface PendingPhoto { file: File; previewUrl: string }

const draft          = ref('')
const bodyEl         = ref<HTMLElement | null>(null)
const contact        = ref<Contact | null>(null)
const uploading      = ref(false)
const uploadingIndex = ref(-1)
const lightboxUrl    = ref<string | null>(null)
const editingMsg     = ref<Message | null>(null)
const fileInputRef   = ref<HTMLInputElement | null>(null)
const pendingPhotos  = ref<PendingPhoto[]>([])

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
  typingUsers.value.size > 0 ? t('chat_typing', { name: peerName.value }) : ''
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
  if (sameDay(ts, now.getTime()))  return t('chat_today')
  if (sameDay(ts, yest.getTime())) return t('chat_yesterday')
  return d.toLocaleDateString(locale(), {
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
  return new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
}

// ── Отправка / редактирование / удаление ─────────────────────────────────────

async function sendMsg() {
  const hasText   = !!draft.value.trim()
  const hasPhotos = pendingPhotos.value.length > 0
  if (!hasText && !hasPhotos) return

  if (editingMsg.value) {
    chat.editMessage(editingMsg.value.id, draft.value.trim())
    const msg = messages.value.find(m => m.id === editingMsg.value!.id)
    if (msg) msg.text = draft.value.trim()
    cancelEdit()
    draft.value = ''
    return
  }

  uploading.value = true
  try {
    for (let i = 0; i < pendingPhotos.value.length; i++) {
      uploadingIndex.value = i
      const p   = pendingPhotos.value[i]
      const url = await uploadFile(p.file)
      chat.sendPhoto(url)
      URL.revokeObjectURL(p.previewUrl)
    }
    pendingPhotos.value  = []
    uploadingIndex.value = -1
    if (hasText) { chat.send(draft.value.trim()); draft.value = '' }
  } catch {
    alert(t('chat_photo_err'))
  } finally {
    uploading.value      = false
    uploadingIndex.value = -1
  }
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
  if (!confirm(t('chat_del_confirm'))) return
  chat.deleteMessage(msgId)
  const msg = messages.value.find(m => m.id === msgId)
  if (msg) { msg.deleted = true; msg.text = '' }
}

function openPhoto(url: string) { lightboxUrl.value = url }

const MAX_PHOTOS   = 5
const MAX_SIZE_MB  = 10

function removePhoto(index: number) {
  URL.revokeObjectURL(pendingPhotos.value[index].previewUrl)
  pendingPhotos.value.splice(index, 1)
}

function addToPending(files: File[]) {
  for (const file of files) {
    if (pendingPhotos.value.length >= MAX_PHOTOS) break
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`${file.name}: максимальный размер ${MAX_SIZE_MB} МБ`)
      continue
    }
    pendingPhotos.value.push({ file, previewUrl: URL.createObjectURL(file) })
  }
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload`, {
    method:  'POST',
    headers: bffHeaders({ skipContentType: true }),
    body:    form,
  })
  if (!res.ok) throw new Error('upload failed')
  const { file_url } = await res.json()
  return file_url
}

async function onPhotoBtn() {
  if (Capacitor.isNativePlatform()) {
    try {
      const limit  = MAX_PHOTOS - pendingPhotos.value.length
      const result = await Camera.pickImages({ quality: 85, limit })
      for (const photo of result.photos) {
        if (pendingPhotos.value.length >= MAX_PHOTOS) break
        const blob = await fetch(photo.webPath!).then(r => r.blob())
        const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          alert(`Файл слишком большой (макс ${MAX_SIZE_MB} МБ)`)
          continue
        }
        pendingPhotos.value.push({ file, previewUrl: photo.webPath! })
      }
    } catch (err: any) {
      if (err?.message !== 'User cancelled photos app') alert(t('chat_photo_err'))
    }
  } else {
    fileInputRef.value?.click()
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  addToPending(Array.from(input.files))
  input.value = ''
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
}

function onInput() {
  if (!editingMsg.value) chat.sendTyping()
}

function isNearBottom(): boolean {
  if (!bodyEl.value) return true
  const { scrollTop, scrollHeight, clientHeight } = bodyEl.value
  return scrollHeight - scrollTop - clientHeight < 150
}

async function scrollBottom() {
  await nextTick()
  if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
}

// Когда картинка загрузилась — подскролливаем если были внизу
function onImageLoad() {
  if (isNearBottom()) {
    if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  }
}

watch(messages, scrollBottom, { deep: true })
watch(typingText, (val) => { if (val) scrollBottom() })

// When the keyboard opens on mobile the visual viewport shrinks.
// Scroll to bottom so the last message stays visible above the input.
function onViewportResize() {
  if (isNearBottom()) scrollBottom()
}

async function loadContactInfo() {
  // Show name immediately from cache — no UID flash on slow internet
  const cached = await db.contacts.toArray()
  contact.value = cached.find(c => c.room_id === roomId) ?? null

  try {
    const res = await fetch(`${API}/contacts`, { headers: bffHeaders() })
    if (res.ok) {
      const list: Contact[] = await res.json()
      contact.value = list.find(c => c.room_id === roomId) ?? null
      await db.contacts.bulkPut(list)
    }
  } catch {}
}

onMounted(async () => {
  if (!auth.chat_token || !auth.user) { router.push('/login'); return }
  window.visualViewport?.addEventListener('resize', onViewportResize)
  await loadContactInfo()
  chat.connect(auth.chat_token, auth.user.id)
})

onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', onViewportResize)
  pendingPhotos.value.forEach(p => URL.revokeObjectURL(p.previewUrl))
})
</script>

<style scoped>
.page { 
  display: flex; 
  flex-direction: column; 
  height: 100dvh; 
  overflow: hidden; 
  background: var(--bg);
  animation: fadeIn 0.25s ease;
}

/* ── Шапка ─────────────────────────────────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
  z-index: 10;
}

.back {
  color: var(--accent);
  display: flex; 
  align-items: center; 
  justify-content: center;
  width: 36px; 
  height: 36px; 
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.back:active {
  background: var(--surface);
  transform: scale(0.9);
}

.peer-info { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}

.peer-avatar {
  width: 40px; 
  height: 40px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 14px; 
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(var(--accent-rgb), 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.peer-name { 
  font-size: 15px; 
  font-weight: 700; 
  color: var(--text);
}

.status {
  display: flex; 
  align-items: center; 
  gap: 5px;
  font-size: 11px; 
  color: var(--muted); 
  font-weight: 600;
}

.status.online { 
  color: #10b981; 
}

.dot { 
  width: 6px; 
  height: 6px; 
  border-radius: 50%; 
  background: currentColor; 
}

/* ── Тело чата ─────────────────────────────────────────────────────────────── */
.body {
  flex: 1; 
  overflow-y: auto;
  padding: 16px 20px 24px;
  display: flex; 
  flex-direction: column;
  background: var(--bg);
}

.empty {
  flex: 1; 
  display: flex; 
  flex-direction: column;
  align-items: center; 
  justify-content: center;
  gap: 10px; 
  color: var(--muted); 
  padding: 40px 0;
}

.empty-icon { 
  font-size: 48px; 
  animation: pulse 2s infinite;
}

.empty p { 
  font-size: 15px; 
  font-weight: 700; 
  color: var(--text); 
}

.empty span { 
  font-size: 13px; 
  opacity: 0.8;
}

/* ── Разделитель дат ───────────────────────────────────────────────────────── */
.date-sep {
  display: flex; 
  align-items: center; 
  justify-content: center;
  margin: 16px 0 12px;
}

.date-sep span {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 11px; 
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 99px;
  letter-spacing: .2px;
  box-shadow: var(--shadow-sm);
}

/* ── Строки сообщений ──────────────────────────────────────────────────────── */
.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 85%;
  margin-top: 3px;
  animation: msgIn .22s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.msg-row.grp-start { margin-top: 14px; }
.date-sep + .msg-row { margin-top: 6px; }

.msg-row.own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Аватар ────────────────────────────────────────────────────────────────── */
.avatar-slot {
  width: 32px; 
  height: 32px;
  flex-shrink: 0;
  display: flex; 
  align-items: flex-end;
}

.msg-avatar {
  width: 32px; 
  height: 32px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 11px; 
  font-weight: 800; 
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

/* ── Пузырь ────────────────────────────────────────────────────────────────── */
.bubble-wrap { 
  display: flex; 
  flex-direction: column; 
  gap: 3px; 
  position: relative;
}

.sender-name { 
  font-size: 11px; 
  font-weight: 700; 
  color: var(--accent); 
  margin-left: 6px; 
  margin-bottom: 2px;
}

.bubble {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 6px 18px 18px 18px;
  padding: 10px 14px;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  position: relative;
  transition: background-color 0.2s;
}

.own .bubble {
  background: var(--accent-gradient);
  border: none;
  border-radius: 18px 6px 18px 18px;
  color: var(--text-inverse);
  box-shadow: 0 6px 18px rgba(var(--accent-rgb), 0.2);
}

.bubble.deleted { 
  opacity: 0.55; 
  font-style: italic; 
}

.photo {
  max-width: 240px; 
  max-height: 240px;
  min-height: 100px;
  border-radius: 12px; 
  display: block;
  cursor: pointer; 
  object-fit: cover;
  background: var(--border);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

.photo:hover {
  transform: scale(1.02);
}

.text { 
  font-size: 14.5px; 
  line-height: 1.5; 
  word-break: break-word; 
  font-weight: 500;
}

.time {
  display: flex; 
  align-items: center; 
  gap: 4px;
  font-size: 10px; 
  color: var(--muted);
  justify-content: flex-end; 
  margin-top: 6px;
  font-weight: 600;
}

.own .time { 
  color: rgba(255, 255, 255, 0.7); 
}

.read-status { 
  font-size: 10px; 
  font-weight: 800; 
  color: rgba(255, 255, 255, 0.6); 
  margin-left: 2px; 
}

.read-status.read { 
  color: #86efac; 
}

/* ── Кнопки редактирования ────────────────────────────────────────────────── */
.msg-actions { 
  display: flex; 
  gap: 6px; 
  margin-top: 4px; 
  justify-content: flex-end; 
}

.act-btn {
  font-size: 11px; 
  padding: 4px 8px;
  background: var(--surface); 
  border: 1px solid var(--border);
  border-radius: 8px; 
  cursor: pointer;
  opacity: 0; 
  transition: all 0.2s ease;
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.msg-row:hover .act-btn {
  opacity: 0.75;
}

.act-btn:hover { 
  opacity: 1 !important; 
  transform: translateY(-1px);
}

/* ── Индикатор печатания ─────────────────────────────────────────────────────*/
.typing {
  display: flex; 
  align-items: flex-end; 
  gap: 8px;
  margin-top: 10px;
  animation: fadeIn 0.2s ease;
}

.typing-avatar {
  width: 32px; 
  height: 32px;
  border-radius: 50%;
  background: var(--surface); 
  border: 1px solid var(--border);
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 11px; 
  font-weight: 800; 
  color: var(--accent);
  flex-shrink: 0;
}

.typing-bubble {
  background: var(--surface); 
  border: 1.5px solid var(--border);
  border-radius: 6px 18px 18px 18px;
  padding: 12px 16px;
  display: flex; 
  align-items: center; 
  gap: 4px;
  box-shadow: var(--shadow-sm);
}

.dots { display: flex; gap: 4px; }
.dots span {
  width: 6px; 
  height: 6px; 
  border-radius: 50%;
  background: var(--muted);
  animation: blink 1.4s infinite both;
}
.dots span:nth-child(2) { animation-delay: .2s; }
.dots span:nth-child(3) { animation-delay: .4s; }

@keyframes blink { 0%,100% { opacity: .2; } 20% { opacity: 1; } }

/* ── Баннер редактирования ───────────────────────────────────────────────────*/
.edit-banner {
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--accent); 
  color: var(--text-inverse); 
  font-size: 13px;
  font-weight: 600;
  gap: 8px;
  border-top: 1px solid var(--border);
  animation: fadeIn 0.2s ease;
}

.edit-banner-left { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  opacity: .95; 
}

.edit-banner button { 
  background: none; 
  color: currentColor; 
  font-size: 16px; 
  cursor: pointer;
}

/* ── Превью фото ─────────────────────────────────────────────────────────── */
.photo-strip {
  border-top: 1px solid var(--border);
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 10px 16px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.photo-strip-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.photo-strip-scroll::-webkit-scrollbar { display: none; }

.strip-thumb {
  position: relative;
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.strip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.strip-remove {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: background 0.15s;
}

.strip-remove:active { background: rgba(239, 68, 68, 0.85); }

.strip-progress {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.strip-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  display: inline-block;
}

.strip-add {
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  background: var(--surface);
  transition: all 0.2s ease;
}

.strip-add:active {
  border-color: var(--accent);
  color: var(--accent);
  transform: scale(0.95);
}

.photo-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
}

/* ── Подвал ────────────────────────────────────────────────────────────────── */
footer {
  border-top: 1px solid var(--border);
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.03);
}

.input-row { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
}

.photo-btn {
  display: flex; 
  align-items: center; 
  justify-content: center;
  width: 40px; 
  height: 40px; 
  border-radius: 50%;
  flex-shrink: 0;
  color: var(--muted); 
  cursor: pointer; 
  transition: all 0.2s ease;
  border: 1.5px solid var(--border);
  background: var(--surface);
}

.photo-btn:hover { 
  color: var(--accent); 
  border-color: var(--accent);
}

.hidden-input { display: none; }

.textarea {
  flex: 1; 
  background: var(--surface); 
  border: 1.5px solid var(--border);
  border-radius: 20px; 
  padding: 10px 16px; 
  color: var(--text);
  font-size: 14.5px; 
  resize: none; 
  max-height: 120px; 
  line-height: 1.4;
  transition: all 0.2s ease;
  font-weight: 500;
}

.textarea:focus { 
  border-color: var(--accent); 
  background: var(--surface);
}

.send-btn {
  width: 40px; 
  height: 40px; 
  border-radius: 50%;
  background: var(--accent-gradient); 
  color: var(--text-inverse);
  display: flex; 
  align-items: center; 
  justify-content: center;
  flex-shrink: 0; 
  box-shadow: 0 4px 10px rgba(var(--accent-rgb), 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.send-btn:not(:disabled):active { 
  transform: scale(.9); 
}

.send-btn:disabled { 
  opacity: 0.5; 
  box-shadow: none;
}

.spinner {
  width: 18px; 
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  display: inline-block;
}

/* ── Лайтбокс ────────────────────────────────────────────────────────────────*/
.lightbox {
  position: fixed; 
  inset: 0; 
  z-index: 999;
  background: rgba(0, 0, 0, 0.95);
  display: flex; 
  align-items: center; 
  justify-content: center;
  cursor: zoom-out;
  animation: fadeIn 0.2s ease;
}

.lightbox-img {
  max-width: 95vw; 
  max-height: 92vh;
  border-radius: 16px; 
  object-fit: contain;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
