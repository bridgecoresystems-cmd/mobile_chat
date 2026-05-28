<template>
  <AppLayout>
    <div class="page">
      <header>
        <h1>{{ t('profile_title') }}</h1>
        <button class="edit-btn" @click="editing = !editing">
          {{ editing ? t('profile_cancel') : t('profile_edit') }}
        </button>
      </header>

      <!-- Аватар -->
      <div class="avatar-section">
        <label class="avatar-wrap" :class="{ uploading: uploadingAvatar }">
          <!-- Фото с устройства (кэш) -->
          <img v-if="myAvatarDataUrl" :src="myAvatarDataUrl" class="avatar-img" alt="Аватар" />
          <!-- Инициалы (фолбэк) -->
          <div v-else class="avatar-initials">{{ initials }}</div>
          <!-- Оверлей "сменить" -->
          <div class="avatar-overlay">
            <span v-if="uploadingAvatar" class="spinner-sm" />
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <input
            type="file"
            accept="image/*"
            class="hidden-input"
            :disabled="uploadingAvatar"
            @change="onAvatarChange"
          />
        </label>

        <div>
          <p class="display-name">{{ displayName }}</p>
          <p class="username">@{{ auth.user?.username }}</p>
        </div>
      </div>

      <p v-if="avatarError" class="avatar-error">{{ avatarError }}</p>

      <!-- Форма редактирования -->
      <form v-if="editing" class="form" @submit.prevent="save">
        <div class="field">
          <label>{{ t('profile_fname') }}</label>
          <input v-model="form.first_name" :placeholder="t('profile_fname')" />
        </div>
        <div class="field">
          <label>{{ t('profile_lname') }}</label>
          <input v-model="form.last_name" :placeholder="t('profile_lname')" />
        </div>
        <div class="field">
          <label>{{ t('profile_phone') }}</label>
          <input v-model="form.phone" placeholder="+993 65 000000" type="tel" />
        </div>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? '...' : t('profile_save') }}
        </button>
      </form>

      <!-- Просмотр профиля -->
      <div v-else class="info-list">
        <div class="info-row">
          <span class="label">{{ t('profile_fname') }}</span>
          <span>{{ profile?.first_name ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ t('profile_lname') }}</span>
          <span>{{ profile?.last_name ?? '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ t('profile_phone') }}</span>
          <span>{{ profile?.phone ?? '—' }}</span>
        </div>
      </div>

      <!-- Настройки -->
      <div class="settings-section">
        <p class="section-title">{{ t('profile_settings') }}</p>

        <!-- Тема -->
        <div class="settings-row" @click="toggleTheme">
          <div class="settings-icon">
            <svg v-if="theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
          <div class="settings-label">
            <span class="settings-name">{{ t('profile_theme') }}</span>
            <span class="settings-value">{{ theme === 'dark' ? t('profile_dark') : t('profile_light') }}</span>
          </div>
          <svg class="settings-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>

        <!-- Язык -->
        <div class="settings-row lang-row">
          <div class="settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <div class="settings-label">
            <span class="settings-name">{{ t('profile_lang') }}</span>
            <span class="settings-value">{{ LANGS.find(l => l.code === lang)?.label }}</span>
          </div>
          <div class="lang-pills">
            <button
              v-for="l in LANGS"
              :key="l.code"
              class="lang-pill"
              :class="{ active: lang === l.code }"
              @click.stop="setLang(l.code)"
            >{{ l.short }}</button>
          </div>
        </div>
      </div>

      <div class="footer">
        <button class="logout-btn" @click="logout">{{ t('profile_logout') }}</button>

        <!-- Брендинг -->
        <button class="brand-btn" @click="showAbout = true">
          <span class="brand-name">BridgeCore <strong>SYSTEMS</strong></span>
          <span class="brand-version">v{{ APP_VERSION }}</span>
        </button>
      </div>
    </div>

    <!-- Модалка «О приложении» -->
    <div v-if="showAbout" class="about-overlay" @click.self="showAbout = false">
      <div class="about-modal">
        <div class="about-logo">💬</div>
        <h2>BridgeCore Chat</h2>
        <p class="about-tagline">Свободное общение без границ</p>

        <div class="about-desc">
          <p>Мессенджер для тех, кто ценит приватность и скорость. Мгновенная доставка сообщений, обмен фото, групповые чаты — всё это работает на открытом протоколе, без лишних посредников.</p>
        </div>

        <div class="about-meta">
          <div class="about-row">
            <span>Версия</span>
            <span>{{ APP_VERSION }}</span>
          </div>
          <div class="about-row">
            <span>Разработчик</span>
            <span>BridgeCore SYSTEMS</span>
          </div>
          <div class="about-row">
            <span>Протокол</span>
            <span>WebSocket + Protobuf</span>
          </div>
        </div>

        <button class="about-close" @click="showAbout = false">Закрыть</button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { useAuthStore, bffHeaders } from '../stores/auth'
import { useTheme } from '../composables/useTheme'
import { useAvatarCache } from '../composables/useAvatarCache'
import { useI18n } from '../composables/useI18n'
import type { Lang } from '../composables/useI18n'
import type { Profile } from '@chat/shared'

const router  = useRouter()
const auth    = useAuthStore()
const API     = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const { theme, toggleTheme } = useTheme()
const { myAvatarDataUrl, loadLocalAvatar, syncAvatar, saveLocalAvatar } = useAvatarCache()
const { lang, t, setLang } = useI18n()

const APP_VERSION = '1.0.0'

const profile        = ref<Profile | null>(null)
const editing        = ref(false)
const saving         = ref(false)
const saveError      = ref('')
const uploadingAvatar = ref(false)
const avatarError    = ref('')
const showAbout      = ref(false)
const form           = ref({ first_name: '', last_name: '', phone: '' })

const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'tk', label: 'Türkmen', short: 'TK' },
]

const displayName = computed(() => {
  if (profile.value?.first_name) return `${profile.value.first_name} ${profile.value.last_name}`
  return auth.user?.username ?? ''
})

const initials = computed(() => {
  if (profile.value?.first_name)
    return (profile.value.first_name[0] + profile.value.last_name[0]).toUpperCase()
  return (auth.user?.username?.[0] ?? '?').toUpperCase()
})

// ── Аватар ────────────────────────────────────────────────────────────────────

async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  input.value = ''

  uploadingAvatar.value = true
  avatarError.value     = ''
  try {
    // 1. Загружаем через BFF-прокси (сервер сам пишет в R2, без CORS на клиенте)
    const form = new FormData()
    form.append('file', file)
    const uploadRes = await fetch(`${API}/upload`, {
      method:  'POST',
      headers: bffHeaders({ skipContentType: true }),
      body:    form,
    })
    if (!uploadRes.ok) throw new Error(t('profile_photo_err'))
    const { file_url } = await uploadRes.json()

    // 2. Сохраняем avatar_url в БД
    const patchRes = await fetch(`${API}/profile/avatar`, {
      method:  'PATCH',
      headers: bffHeaders(),
      body:    JSON.stringify({ avatar_url: file_url }),
    })
    if (!patchRes.ok) throw new Error(t('profile_avatar_err'))

    // 3. Кэшируем фото на устройство
    await saveLocalAvatar(file_url)

    if (profile.value) profile.value.avatar_url = file_url
  } catch (err: any) {
    avatarError.value = err.message ?? 'Ошибка'
  } finally {
    uploadingAvatar.value = false
  }
}

// ── Профиль ───────────────────────────────────────────────────────────────────

async function load() {
  const res = await fetch(`${API}/profile`, { headers: bffHeaders() })
  if (res.ok) {
    const d = await res.json()
    profile.value = d.profile
    if (d.profile) {
      form.value = { first_name: d.profile.first_name, last_name: d.profile.last_name, phone: d.profile.phone }
      // Синхронизируем кэш аватара (скачивает только если URL изменился)
      await syncAvatar(d.profile.avatar_url ?? null)
    }
  }
}

async function save() {
  saving.value    = true
  saveError.value = ''
  try {
    const res = await fetch(`${API}/profile`, {
      method: 'POST', headers: bffHeaders(),
      body: JSON.stringify(form.value),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
    await load()
    editing.value = false
  } catch (e: any) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(async () => {
  // Сначала показываем кэш (мгновенно), потом синхронизируем
  await loadLocalAvatar()
  await load()
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }

/* ── Шапка ─────────────────────────────────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

h1 { font-size: 22px; font-weight: 800; letter-spacing: -.3px; }
.edit-btn { font-size: 14px; color: var(--accent); font-weight: 600; }

/* ── Аватар ────────────────────────────────────────────────────────────────── */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--border);
}

.avatar-wrap {
  position: relative;
  width: 72px; height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  display: block;
}

.avatar-img {
  width: 72px; height: 72px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-initials {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; font-weight: 800;
  color: #fff;
}

/* Оверлей с иконкой камеры */
.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity .18s;
}

.avatar-wrap:hover .avatar-overlay,
.avatar-wrap.uploading .avatar-overlay { opacity: 1; }

.spinner-sm {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  display: inline-block;
}

@keyframes spin { to { transform: rotate(360deg); } }

.hidden-input { display: none; }

.avatar-error {
  font-size: 12px;
  color: #f87171;
  padding: 4px 20px 0;
  text-align: center;
}

.display-name { font-size: 18px; font-weight: 700; }
.username     { font-size: 13px; color: var(--muted); margin-top: 2px; }

/* ── Форма ─────────────────────────────────────────────────────────────────── */
.form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 12px; font-weight: 600;
  color: var(--muted); text-transform: uppercase; letter-spacing: .5px;
}

input {
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 11px 14px; color: var(--text);
  width: 100%; transition: border-color .15s;
}
input:focus { border-color: var(--accent); }

.error {
  font-size: 13px; color: #f87171;
  background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3);
  border-radius: 8px; padding: 10px 12px;
}

.btn-primary {
  background: var(--accent); color: #fff;
  border-radius: 10px; padding: 13px;
  font-weight: 700; font-size: 15px; width: 100%;
  transition: opacity .15s;
}
.btn-primary:disabled { opacity: .45; }

/* ── Инфо-список ───────────────────────────────────────────────────────────── */
.info-list { padding: 8px 0; border-bottom: 1px solid var(--border); }

.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 15px;
}
.info-row:last-child { border-bottom: none; }
.label { color: var(--muted); font-size: 14px; }

/* ── Настройки ─────────────────────────────────────────────────────────────── */
.settings-section { padding: 0; border-bottom: 1px solid var(--border); }

.section-title {
  font-size: 12px; font-weight: 700; color: var(--muted);
  text-transform: uppercase; letter-spacing: .6px; padding: 16px 20px 8px;
}

.settings-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 20px; border-top: 1px solid var(--border);
  cursor: pointer; transition: background .1s;
}
.settings-row:active { background: var(--surface); }

.settings-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent); flex-shrink: 0;
}

.settings-label { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.settings-name  { font-size: 15px; font-weight: 600; }
.settings-value { font-size: 12px; color: var(--muted); }
.settings-chevron { color: var(--muted); flex-shrink: 0; }

.lang-row { cursor: default; }
.lang-row:active { background: transparent; }

.lang-pills { display: flex; gap: 6px; flex-shrink: 0; }

.lang-pill {
  padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 700;
  border: 1.5px solid var(--border); color: var(--muted); background: var(--bg);
  transition: all .15s;
}
.lang-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ── Выход и брендинг ──────────────────────────────────────────────────────── */
.footer { padding: 24px 20px; margin-top: auto; display: flex; flex-direction: column; gap: 16px; }

.logout-btn {
  width: 100%; padding: 13px; border-radius: 10px;
  border: 1.5px solid rgba(239,68,68,.4); color: #ef4444;
  font-weight: 600; font-size: 15px; transition: background .15s;
}
.logout-btn:active { background: rgba(239,68,68,.08); }

.brand-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 8px;
  opacity: .45; transition: opacity .15s;
}
.brand-btn:active { opacity: .7; }

.brand-name {
  font-size: 12px; letter-spacing: .4px; color: var(--muted);
}
.brand-name strong { font-weight: 800; color: var(--accent); }

.brand-version {
  font-size: 11px; color: var(--muted);
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 6px; padding: 1px 6px;
}

/* ── Модалка «О приложении» ────────────────────────────────────────────────── */
.about-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.6);
  display: flex; align-items: flex-end; justify-content: center;
  padding-bottom: env(safe-area-inset-bottom);
}

.about-modal {
  width: 100%; max-width: 480px;
  background: var(--surface);
  border-radius: 24px 24px 0 0;
  padding: 32px 24px 28px;
  display: flex; flex-direction: column; align-items: center;
  gap: 12px;
  animation: slideUp .25s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.about-logo { font-size: 52px; line-height: 1; }

.about-modal h2 {
  font-size: 22px; font-weight: 900; letter-spacing: -.4px;
  color: var(--accent);
}

.about-tagline {
  font-size: 14px; color: var(--muted); font-weight: 500;
  margin-top: -4px;
}

.about-desc {
  background: var(--bg); border-radius: 12px; padding: 14px 16px;
  width: 100%; margin-top: 4px;
}
.about-desc p {
  font-size: 13px; line-height: 1.6; color: var(--muted); text-align: center;
}

.about-meta {
  width: 100%;
  border: 1px solid var(--border); border-radius: 12px;
  overflow: hidden;
}

.about-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 11px 16px; font-size: 13px;
  border-bottom: 1px solid var(--border);
}
.about-row:last-child { border-bottom: none; }
.about-row span:first-child { color: var(--muted); }
.about-row span:last-child  { font-weight: 600; }

.about-close {
  width: 100%; padding: 14px; border-radius: 12px;
  background: var(--accent); color: #fff;
  font-weight: 700; font-size: 15px;
  margin-top: 4px; transition: opacity .15s;
}
.about-close:active { opacity: .8; }
</style>
