<template>
  <div class="page">
    <header>
      <span class="logo">💬 Чаты</span>
      <button class="icon-btn" @click="showCreate = true" title="Новый чат">＋</button>
    </header>

    <div v-if="loading" class="center muted">Загрузка...</div>
    <div v-else-if="!rooms.length" class="center muted">Нет чатов. Создай первый!</div>

    <ul v-else class="room-list">
      <li v-for="room in rooms" :key="room.id" @click="goToChat(room.id)">
        <div class="room-avatar">{{ room.name[0].toUpperCase() }}</div>
        <div class="room-info">
          <span class="room-name">{{ room.name }}</span>
        </div>
        <button class="icon-btn small" @click.stop="deleteRoom(room.id)" title="Удалить">✕</button>
      </li>
    </ul>

    <!-- Create room modal -->
    <div v-if="showCreate" class="overlay" @click.self="showCreate = false">
      <div class="modal">
        <h2>Новый чат</h2>
        <input v-model="newRoomName" placeholder="Название" @keyup.enter="createRoom" />
        <p class="hint">Участники могут подключиться по ID комнаты</p>
        <div class="modal-actions">
          <button @click="showCreate = false">Отмена</button>
          <button class="btn-primary" @click="createRoom" :disabled="!newRoomName.trim()">Создать</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore, bffHeaders } from "../stores/auth"
import type { Room } from "@chat/shared"

const API    = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
const router = useRouter()
const auth   = useAuthStore()

const rooms       = ref<Room[]>([])
const loading     = ref(true)
const showCreate  = ref(false)
const newRoomName = ref("")

async function fetchRooms() {
  loading.value = true
  try {
    const res = await fetch(`${API}/rooms`, { headers: bffHeaders() })
    rooms.value = await res.json()
  } finally {
    loading.value = false
  }
}

async function createRoom() {
  if (!newRoomName.value.trim()) return
  const res = await fetch(`${API}/rooms`, {
    method:  "POST",
    headers: bffHeaders(),
    body:    JSON.stringify({ name: newRoomName.value.trim(), members: [] }),
  })
  if (res.ok) {
    newRoomName.value = ""
    showCreate.value  = false
    await fetchRooms()
  }
}

async function deleteRoom(id: string) {
  await fetch(`${API}/rooms/${id}`, { method: "DELETE", headers: bffHeaders() })
  await fetchRooms()
}

function goToChat(roomId: string) {
  router.push(`/chat/${roomId}`)
}

onMounted(fetchRooms)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.logo { font-size: 17px; font-weight: 700; }

.center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.muted { color: var(--muted); font-size: 14px; }

.room-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
}

.room-list li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}

.room-list li:hover { background: var(--surface); }

.room-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 17px;
  flex-shrink: 0;
}

.room-info { flex: 1; }
.room-name  { font-weight: 600; }

.icon-btn {
  color: var(--muted);
  font-size: 20px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all .1s;
}

.icon-btn:hover { color: var(--text); background: var(--border); }
.icon-btn.small { font-size: 13px; }

.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  width: calc(100% - 48px);
  max-width: 360px;
  display: flex; flex-direction: column; gap: 16px;
}

.modal h2 { font-size: 17px; font-weight: 700; }

.modal input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text);
}

.hint { color: var(--muted); font-size: 12px; }

.modal-actions {
  display: flex; gap: 8px; justify-content: flex-end;
}

.modal-actions button {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--muted);
}

.btn-primary {
  background: var(--accent);
  color: #fff !important;
}

.btn-primary:disabled { opacity: .5; }
</style>
