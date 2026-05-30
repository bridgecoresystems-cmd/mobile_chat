<template>
  <div>
    <NuxtLink to="/users" class="back-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Пользователи
    </NuxtLink>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Загрузка...</span>
    </div>

    <div v-else-if="!user" class="empty-state">
      Пользователь не найден
    </div>

    <template v-else>
      <!-- Hero card -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="big-avatar" :style="{ background: avatarColor(user.id) }">
            {{ initials(user) }}
          </div>
          <div class="hero-info">
            <h1 class="hero-name">{{ fullName(user) }}</h1>
            <span class="hero-username">@{{ user.username }}</span>
            <span class="chip" :class="user.is_admin ? 'admin' : 'user'">
              {{ user.is_admin ? 'Администратор' : 'Пользователь' }}
            </span>
          </div>
        </div>

        <div class="hero-actions">
          <button
            class="btn"
            :class="editing ? 'btn-secondary' : 'btn-accent'"
            @click="toggleEdit"
          >
            <svg v-if="!editing" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            {{ editing ? 'Отмена' : 'Редактировать' }}
          </button>
          <button class="btn btn-danger" @click="handleDelete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Удалить
          </button>
        </div>
      </div>

      <div class="content-grid">
        <!-- Details / Edit form -->
        <div class="card">
          <div class="card-header">
            <h3>{{ editing ? 'Редактирование' : 'Данные профиля' }}</h3>
          </div>

          <form v-if="editing" @submit.prevent="saveEdit" class="edit-form">
            <div class="field">
              <label>Имя</label>
              <input v-model="editForm.first_name" placeholder="Имя" />
            </div>
            <div class="field">
              <label>Фамилия</label>
              <input v-model="editForm.last_name" placeholder="Фамилия" />
            </div>
            <div class="field">
              <label>Email</label>
              <input v-model="editForm.email" type="email" placeholder="email@example.com" />
            </div>
            <div class="field">
              <label>Телефон</label>
              <input v-model="editForm.phone" placeholder="+7 999 000 00 00" />
            </div>
            <p v-if="editError" class="error-msg">{{ editError }}</p>
            <div class="form-footer">
              <button type="button" class="btn btn-secondary" @click="toggleEdit">Отмена</button>
              <button type="submit" class="btn btn-accent" :disabled="saving">
                {{ saving ? 'Сохранение...' : 'Сохранить' }}
              </button>
            </div>
          </form>

          <div v-else class="detail-list">
            <div class="detail-row">
              <span class="detail-label">ID</span>
              <span class="detail-value mono">{{ user.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Имя</span>
              <span class="detail-value">{{ user.first_name ?? '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Фамилия</span>
              <span class="detail-value">{{ user.last_name ?? '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-value">{{ user.email ?? '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Телефон</span>
              <span class="detail-value">{{ user.phone ?? '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Дата регистрации</span>
              <span class="detail-value">{{ formatDate(user.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Role management -->
        <div class="card">
          <div class="card-header">
            <h3>Управление ролью</h3>
          </div>
          <div class="role-body">
            <div class="role-row">
              <div>
                <div class="role-title">{{ user.is_admin ? 'Администратор' : 'Пользователь' }}</div>
                <div class="role-desc">
                  {{ user.is_admin
                    ? 'Полный доступ к панели администратора'
                    : 'Обычный пользователь мобильного приложения' }}
                </div>
              </div>
              <span class="chip" :class="user.is_admin ? 'admin' : 'user'">
                {{ user.is_admin ? 'Admin' : 'User' }}
              </span>
            </div>
            <button
              class="btn"
              :class="user.is_admin ? 'btn-warning' : 'btn-accent'"
              style="width: 100%; margin-top: 16px;"
              @click="toggleAdmin"
            >
              {{ user.is_admin ? 'Снять права администратора' : 'Назначить администратором' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { get, del, patch } = useAdminApi()

const user    = ref<any | null>(null)
const loading = ref(true)
const editing = ref(false)
const saving  = ref(false)
const editError = ref('')

const editForm = ref({ first_name: '', last_name: '', email: '', phone: '' })

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
  return new Date(ts).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toggleEdit() {
  editing.value = !editing.value
  editError.value = ''
  if (editing.value && user.value) {
    editForm.value = {
      first_name: user.value.first_name ?? '',
      last_name:  user.value.last_name  ?? '',
      email:      user.value.email      ?? '',
      phone:      user.value.phone      ?? '',
    }
  }
}

async function load() {
  loading.value = true
  try {
    user.value = await get<any>(`/admin/users/${route.params.id}`)
  } catch {
    user.value = null
  } finally {
    loading.value = false
  }
}

async function saveEdit() {
  editError.value = ''
  saving.value = true
  try {
    await patch(`/admin/users/${user.value.id}/profile`, {
      first_name: editForm.value.first_name || undefined,
      last_name:  editForm.value.last_name  || undefined,
      email:      editForm.value.email      || null,
      phone:      editForm.value.phone      || undefined,
    })
    user.value.first_name = editForm.value.first_name || null
    user.value.last_name  = editForm.value.last_name  || null
    user.value.email      = editForm.value.email      || null
    user.value.phone      = editForm.value.phone      || null
    editing.value = false
  } catch (e: any) {
    editError.value = e.message
  } finally {
    saving.value = false
  }
}

async function toggleAdmin() {
  try {
    await patch(`/admin/users/${user.value.id}/admin`, { is_admin: !user.value.is_admin })
    user.value.is_admin = !user.value.is_admin
  } catch (e: any) {
    alert('Ошибка: ' + e.message)
  }
}

async function handleDelete() {
  if (!confirm(`Удалить пользователя @${user.value.username}? Это нельзя отменить.`)) return
  try {
    await del(`/admin/users/${user.value.id}`)
    await navigateTo('/users')
  } catch (e: any) {
    alert('Ошибка удаления: ' + e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 28px;
  transition: color 0.15s;
  text-decoration: none;
}
.back-btn:hover { color: var(--text); }

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px;
  color: var(--muted);
  text-align: center;
}
.spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Hero */
.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 20px; }
.big-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 800; color: #fff; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.hero-info { display: flex; flex-direction: column; gap: 4px; }
.hero-name { font-size: 22px; font-weight: 800; margin: 0; }
.hero-username { font-size: 13px; color: var(--muted); font-weight: 500; }
.chip { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; width: fit-content; }
.chip.admin { background: var(--accent-dim); color: var(--accent); }
.chip.user  { background: rgba(255,255,255,0.05); color: var(--muted); }

.hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* Content grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.card-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}
.card-header h3 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin: 0; }

/* Detail list — two-column table */
.detail-list { padding: 0; }
.detail-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-bottom: 1px solid var(--border);
}
.detail-row:last-child { border-bottom: none; }
.detail-label {
  padding: 14px 20px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--muted);
  border-right: 1px solid var(--border);
  display: flex; align-items: center;
  background: rgba(255,255,255,0.01);
}
.detail-value {
  padding: 14px 20px;
  font-size: 14px; font-weight: 500;
  color: var(--text);
  word-break: break-all;
  display: flex; align-items: center;
}
.detail-value.mono { font-family: monospace; font-size: 12px; color: var(--accent); }

/* Edit form */
.edit-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); }
.field input {
  background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 10px 14px; color: var(--text); font-size: 14px;
  transition: border-color 0.15s;
}
.field input:focus { border-color: var(--accent); outline: none; }
.form-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.error-msg { color: var(--danger); background: var(--danger-dim); border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; }

/* Role card */
.role-body { padding: 20px 24px; }
.role-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.role-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.role-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.15s;
  white-space: nowrap;
  border: 1px solid transparent;
  cursor: pointer;
}
.btn-accent { background: var(--accent); color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.2); }
.btn-accent:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-accent:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-secondary { background: var(--surface2); color: var(--muted); border-color: var(--border); }
.btn-secondary:hover { color: var(--text); }
.btn-danger { background: var(--danger-dim); color: var(--danger); border-color: rgba(239,68,68,0.15); }
.btn-danger:hover { background: rgba(239,68,68,0.2); }
.btn-warning { background: rgba(245,158,11,0.12); color: var(--warning); border-color: rgba(245,158,11,0.15); }
.btn-warning:hover { background: rgba(245,158,11,0.2); }
</style>
