<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Пользователи</h1>
        <span class="subtitle" v-if="total !== null">Всего: {{ total }}</span>
      </div>
      <input v-model="search" placeholder="Поиск..." class="search-input" />
    </div>

    <div class="table-wrap">
      <div v-if="loading" class="loading">Загрузка...</div>
      <div v-else-if="!filtered.length" class="empty">Пользователи не найдены</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Email</th>
            <th>Телефон</th>
            <th>Дата регистрации</th>
            <th>Роль</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id">
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
            <td>
              <div class="actions">
                <button
                  class="action-btn"
                  :class="u.is_admin ? 'demote' : 'promote'"
                  :title="u.is_admin ? 'Снять права' : 'Назначить админом'"
                  @click="toggleAdmin(u)"
                >
                  {{ u.is_admin ? '↓' : '↑' }}
                </button>
                <button
                  class="action-btn delete"
                  title="Удалить"
                  @click="deleteUser(u)"
                >
                  ✕
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get, del, patch } = useAdminApi()

const users   = ref<any[]>([])
const total   = ref<number | null>(null)
const loading = ref(true)
const search  = ref('')

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

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    fullName(u).toLowerCase().includes(q) ||
    u.username.toLowerCase().includes(q) ||
    (u.email ?? '').toLowerCase().includes(q)
  )
})

async function load() {
  loading.value = true
  try {
    const data  = await get<any>('/admin/users?limit=200')
    users.value = data.users
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function toggleAdmin(u: any) {
  await patch(`/admin/users/${u.id}/admin`, { is_admin: !u.is_admin })
  u.is_admin = !u.is_admin
}

async function deleteUser(u: any) {
  if (!confirm(`Удалить пользователя @${u.username}? Это нельзя отменить.`)) return
  await del(`/admin/users/${u.id}`)
  users.value = users.value.filter(x => x.id !== u.id)
  if (total.value !== null) total.value--
}

onMounted(load)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
.subtitle { color: var(--muted); font-size: 14px; }

.search-input {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 9px 14px;
  color: var(--text);
  width: 240px;
  transition: border-color 0.15s;
}

.search-input:focus { border-color: var(--accent); outline: none; }
.search-input::placeholder { color: var(--muted); }

.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.loading, .empty { padding: 32px; color: var(--muted); text-align: center; }

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

.table tr:hover td { background: rgba(255,255,255,0.02); }

.user-cell { display: flex; align-items: center; gap: 10px; }

.avatar {
  width: 36px;
  height: 36px;
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

.actions { display: flex; gap: 6px; }

.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  background: var(--surface2);
  color: var(--muted);
}

.action-btn.promote:hover { background: var(--accent-dim); color: var(--accent); }
.action-btn.demote:hover  { background: rgba(245,158,11,0.12); color: var(--warning); }
.action-btn.delete:hover  { background: var(--danger-dim); color: var(--danger); }
</style>
