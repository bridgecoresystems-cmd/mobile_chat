<template>
  <div>
    <!-- Page Header & Actions -->
    <div class="page-header">
      <div>
        <h1>Пользователи</h1>
        <span class="subtitle" v-if="total !== null">Всего в базе: {{ total }}</span>
      </div>
      
      <div class="header-actions">
        <!-- Filter Tabs -->
        <div class="filter-tabs">
          <button 
            v-for="f in ['all', 'admins', 'users']" 
            :key="f"
            class="filter-tab"
            :class="{ active: activeFilter === f }"
            @click="activeFilter = f"
          >
            {{ f === 'all' ? 'Все' : f === 'admins' ? 'Админы' : 'Пользователи' }}
          </button>
        </div>

        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" placeholder="Поиск по имени/почте..." class="search-input" />
        </div>

        <button class="add-user-btn" @click="showAddModal = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Создать
        </button>
      </div>
    </div>

    <!-- Table of Users -->
    <div class="table-wrap">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>Загрузка пользователей...</span>
      </div>
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
          <tr v-for="u in filtered" :key="u.id" class="user-row" @click="selectUser(u)">
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
              <!-- Event stop propagation so clicking buttons doesn't trigger drawer opening -->
              <div class="actions" @click.stop>
                <button
                  class="action-btn"
                  :class="u.is_admin ? 'demote' : 'promote'"
                  :title="u.is_admin ? 'Снять права' : 'Назначить админом'"
                  @click="toggleAdmin(u)"
                >
                  <svg v-if="u.is_admin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </button>
                <button
                  class="action-btn delete"
                  title="Удалить"
                  @click="deleteUser(u)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Slide-out Drawer for User Details -->
    <div class="drawer-backdrop" v-if="selectedUser" @click="selectedUser = null">
      <div class="drawer-panel" @click.stop>
        <div class="drawer-header">
          <h3>Детали пользователя</h3>
          <button class="close-btn" @click="selectedUser = null">✕</button>
        </div>

        <div class="drawer-body">
          <div class="drawer-avatar-wrap">
            <div class="drawer-avatar" :style="{ background: avatarColor(selectedUser.id) }">
              {{ initials(selectedUser) }}
            </div>
            <h4 class="drawer-full-name">{{ fullName(selectedUser) }}</h4>
            <span class="drawer-username-label">@{{ selectedUser.username }}</span>
            <span class="chip drawer-chip" :class="selectedUser.is_admin ? 'admin' : 'user'">
              {{ selectedUser.is_admin ? 'Администратор' : 'Пользователь' }}
            </span>
          </div>

          <div class="drawer-details">
            <div class="detail-item">
              <span class="detail-label">ID Пользователя</span>
              <span class="detail-value mono">{{ selectedUser.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email Адрес</span>
              <span class="detail-value">{{ selectedUser.email ?? '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Номер телефона</span>
              <span class="detail-value">{{ selectedUser.phone ?? '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Дата регистрации</span>
              <span class="detail-value">{{ formatDate(selectedUser.created_at) }}</span>
            </div>
          </div>

          <div class="drawer-actions">
            <button 
              class="drawer-btn" 
              :class="selectedUser.is_admin ? 'demote-btn' : 'promote-btn'"
              @click="toggleAdmin(selectedUser)"
            >
              {{ selectedUser.is_admin ? 'Снять права Администратора' : 'Сделать Администратором' }}
            </button>
            
            <button class="drawer-btn danger-btn" @click="deleteUser(selectedUser); selectedUser = null">
              Удалить аккаунт навсегда
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create User Modal Overlay -->
    <div class="modal-backdrop" v-if="showAddModal" @click="showAddModal = false">
      <div class="modal-card" @click.stop>
        <div class="modal-header">
          <h3>Создать нового пользователя</h3>
          <button class="close-btn" @click="showAddModal = false">✕</button>
        </div>

        <form @submit.prevent="createUser" class="modal-form">
          <div class="field">
            <label>Имя пользователя (username) *</label>
            <input v-model="form.username" required placeholder="ivan_groznii" />
          </div>

          <div class="field">
            <label>Email (необязательно)</label>
            <input v-model="form.email" type="email" placeholder="example@mail.com" />
          </div>

          <div class="field">
            <label>Пароль *</label>
            <input v-model="form.password" type="password" required placeholder="Минимум 4 символа" />
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>

          <div class="modal-buttons">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">Отмена</button>
            <button type="submit" class="btn btn-primary" :disabled="creating">
              {{ creating ? '...' : 'Создать пользователя' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get, del, patch, post } = useAdminApi()

const users        = ref<any[]>([])
const total        = ref<number | null>(null)
const loading      = ref(true)
const search       = ref('')
const activeFilter = ref<'all' | 'admins' | 'users'>('all')

// Details drawer state
const selectedUser = ref<any | null>(null)

// Add user modal states
const showAddModal = ref(false)
const creating     = ref(false)
const error        = ref('')
const form         = ref({
  username: '',
  password: '',
  email: '',
})

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
  let list = users.value
  
  // Filter by role
  if (activeFilter.value === 'admins') {
    list = list.filter(u => u.is_admin)
  } else if (activeFilter.value === 'users') {
    list = list.filter(u => !u.is_admin)
  }

  // Filter by query text
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(u =>
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

function selectUser(u: any) {
  selectedUser.value = u
}

async function toggleAdmin(u: any) {
  try {
    await patch(`/admin/users/${u.id}/admin`, { is_admin: !u.is_admin })
    u.is_admin = !u.is_admin
  } catch (e: any) {
    alert('Ошибка изменения роли: ' + e.message)
  }
}

async function deleteUser(u: any) {
  if (!confirm(`Удалить пользователя @${u.username}? Это нельзя отменить.`)) return
  try {
    await del(`/admin/users/${u.id}`)
    users.value = users.value.filter(x => x.id !== u.id)
    if (total.value !== null) total.value--
    if (selectedUser.value?.id === u.id) {
      selectedUser.value = null
    }
  } catch (e: any) {
    alert('Ошибка удаления: ' + e.message)
  }
}

async function createUser() {
  error.value = ''
  creating.value = true
  try {
    const body = {
      username: form.value.username,
      password: form.value.password,
      email: form.value.email || undefined
    }
    // Call the registration route
    await post('/auth/register', body)
    
    // Reset form and reload
    form.value = { username: '', password: '', email: '' }
    showAddModal.value = false
    await load()
  } catch (e: any) {
    error.value = e.message
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;
}

@media (max-width: 950px) {
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
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--surface2);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.filter-tab {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  transition: all 0.15s ease;
}

.filter-tab:hover {
  color: var(--text);
}

.filter-tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
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
  width: 220px;
  transition: border-color 0.15s;
}

.search-input:focus { border-color: var(--accent); outline: none; }
.search-input::placeholder { color: var(--muted); }

.add-user-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  padding: 10px 16px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;
}

.add-user-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

/* Table */
.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.loading, .empty { padding: 48px; color: var(--muted); text-align: center; }

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.table { width: 100%; border-collapse: collapse; }

.table th {
  text-align: left;
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--muted);
  background: rgba(255,255,255,0.01);
  border-bottom: 1.5px solid var(--border);
}

.table td {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  vertical-align: middle;
}

.user-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.user-row:hover td { background: rgba(255,255,255,0.015); }

.user-cell { display: flex; align-items: center; gap: 10px; }

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
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.user-name { font-weight: 600; font-size: 14px; color: var(--text); }
.user-username { font-size: 12px; color: var(--muted); }
.muted { color: var(--muted); font-size: 13.5px; }

.chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chip.admin { background: var(--accent-dim); color: var(--accent); }
.chip.user  { background: rgba(255,255,255,0.03); color: var(--muted); }

.actions { display: flex; gap: 6px; }

.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  background: var(--surface2);
  color: var(--muted);
  border: 1px solid var(--border);
}

.action-btn.promote:hover { background: var(--accent-dim); color: var(--accent); border-color: rgba(99, 102, 241, 0.2); }
.action-btn.demote:hover  { background: rgba(245,158,11,0.12); color: var(--warning); border-color: rgba(245,158,11,0.2); }
.action-btn.delete:hover  { background: var(--danger-dim); color: var(--danger); border-color: rgba(239, 68, 68, 0.2); }

/* Details Drawer */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.2s ease-out;
}

.drawer-panel {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.drawer-header h3 { font-size: 18px; font-weight: 800; }
.close-btn { font-size: 18px; color: var(--muted); transition: color 0.15s; }
.close-btn:hover { color: var(--text); }

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.drawer-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.drawer-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}

.drawer-full-name { font-size: 20px; font-weight: 800; }
.drawer-username-label { font-size: 13px; color: var(--muted); font-weight: 500; }
.drawer-chip { margin-top: 4px; padding: 4px 12px; font-size: 11px; }

.drawer-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface2);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--border);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  word-break: break-all;
}

.detail-value.mono {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent);
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.drawer-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13.5px;
  text-align: center;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.promote-btn {
  background: var(--accent-dim);
  color: var(--accent);
  border-color: rgba(99, 102, 241, 0.15);
}
.promote-btn:hover { background: rgba(99,102,241,0.25); }

.demote-btn {
  background: rgba(245,158,11,0.12);
  color: var(--warning);
  border-color: rgba(245,158,11,0.15);
}
.demote-btn:hover { background: rgba(245,158,11,0.2); }

.danger-btn {
  background: var(--danger-dim);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.15);
}
.danger-btn:hover { background: rgba(239, 68, 68, 0.2); }

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.4);
  overflow: hidden;
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 { font-size: 16px; font-weight: 800; }

.modal-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-form .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-form label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}

.modal-form input {
  background: var(--surface2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text);
  transition: border-color 0.15s;
}

.modal-form input:focus { border-color: var(--accent); outline: none; }

.error-msg {
  color: var(--danger);
  background: var(--danger-dim);
  border-radius: 8px;
  padding: 10px;
  font-size: 12.5px;
  font-weight: 600;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.modal-buttons .btn {
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  transition: opacity 0.15s;
}

.btn-secondary {
  background: var(--surface2);
  color: var(--muted);
  border: 1px solid var(--border);
}
.btn-secondary:hover { color: var(--text); background: rgba(255,255,255,0.02); }

.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-primary:hover { opacity: 0.95; }
.btn-primary:disabled { opacity: 0.5; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
