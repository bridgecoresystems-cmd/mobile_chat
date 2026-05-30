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
          <span class="brand-name">konekt</span>
          <span class="brand-version">v{{ APP_VERSION }}</span>
        </button>
      </div>
    </div>

    <!-- Модалка «О приложении» -->
    <div v-if="showAbout" class="about-overlay" @click.self="showAbout = false">
      <div class="about-modal">
        <div class="about-logo">💬</div>
        <h2>konekt</h2>
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
            <span>konekt</span>
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

async function logout() {
  await auth.logout()
  router.push('/login')
}

onMounted(async () => {
  // Сначала показываем кэш (мгновенно), потом синхронизируем
  await loadLocalAvatar()
  await load()
})
</script>

<style scoped>
.page { 
  display: flex; 
  flex-direction: column; 
  height: 100%; 
  overflow-y: auto; 
  background: var(--bg);
  animation: fadeIn 0.3s ease;
}

/* ── Шапка ─────────────────────────────────────────────────────────────────── */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 10;
}

h1 {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.8px;
  background: linear-gradient(135deg, var(--text), var(--muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.edit-btn { 
  font-size: 14px; 
  color: var(--accent); 
  font-weight: 700; 
  transition: opacity 0.15s;
}

.edit-btn:active {
  opacity: 0.7;
}

/* ── Аватар ────────────────────────────────────────────────────────────────── */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--border);
  background: transparent;
}

.avatar-wrap {
  position: relative;
  width: 72px; 
  height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  display: block;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.avatar-img {
  width: 72px; 
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-initials {
  width: 72px; 
  height: 72px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 28px; 
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
}

/* Оверлей с иконкой камеры */
.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,.5);
  display: flex; 
  align-items: center; 
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity .2s ease;
}

.avatar-wrap:hover .avatar-overlay,
.avatar-wrap.uploading .avatar-overlay { 
  opacity: 1; 
}

.spinner-sm {
  width: 20px; 
  height: 20px;
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
  color: #ef4444;
  padding: 8px 20px 0;
  text-align: center;
  font-weight: 500;
}

.display-name { 
  font-size: 20px; 
  font-weight: 800; 
  color: var(--text);
  letter-spacing: -0.3px;
}

.username { 
  font-size: 13px; 
  color: var(--muted); 
  margin-top: 3px; 
  font-weight: 600;
}

/* ── Форма ─────────────────────────────────────────────────────────────────── */
.form { 
  padding: 24px 20px; 
  display: flex; 
  flex-direction: column; 
  gap: 18px; 
}

.field { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
}

.field label {
  font-size: 11px; 
  font-weight: 700;
  color: var(--muted); 
  text-transform: uppercase; 
  letter-spacing: .8px;
}

input {
  background: var(--surface); 
  border: 1.5px solid var(--border);
  border-radius: 12px; 
  padding: 12px 16px; 
  color: var(--text);
  width: 100%; 
  transition: all 0.2s ease;
  font-weight: 500;
}

input:focus { 
  border-color: var(--accent); 
  box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.1);
}

.error {
  font-size: 13px; 
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08); 
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px; 
  padding: 12px 14px;
  font-weight: 500;
}

.btn-primary {
  background: var(--accent-gradient); 
  color: var(--text-inverse);
  border-radius: 12px; 
  padding: 14px;
  font-weight: 700; 
  font-size: 15px; 
  width: 100%;
  box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled { opacity: .45; box-shadow: none; }

/* ── Инфо-список ───────────────────────────────────────────────────────────── */
.info-list { 
  padding: 8px 0; 
  border-bottom: 1px solid var(--border); 
}

.info-row {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding: 16px 20px; 
  border-bottom: 1px solid var(--border); 
  font-size: 15px;
  font-weight: 600;
}

.info-row:last-child { border-bottom: none; }

.info-row span:last-child {
  color: var(--text);
}

.label { 
  color: var(--muted); 
  font-size: 14px; 
  font-weight: 500;
}

/* ── Настройки ─────────────────────────────────────────────────────────────── */
.settings-section { 
  padding: 0; 
  border-bottom: 1px solid var(--border); 
}

.section-title {
  font-size: 11px; 
  font-weight: 800; 
  color: var(--muted);
  text-transform: uppercase; 
  letter-spacing: 1px; 
  padding: 20px 20px 10px;
}

.settings-row {
  display: flex; 
  align-items: center; 
  gap: 16px;
  padding: 14px 20px; 
  border-top: 1px solid var(--border);
  cursor: pointer; 
  transition: background 0.2s;
}

.settings-row:active { 
  background: var(--surface); 
}

.settings-icon {
  width: 40px; 
  height: 40px; 
  border-radius: 12px;
  background: var(--surface); 
  border: 1.5px solid var(--border);
  display: flex; 
  align-items: center; 
  justify-content: center;
  color: var(--accent); 
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.settings-row:active .settings-icon {
  transform: scale(0.92);
}

.settings-label { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  gap: 2px; 
}

.settings-name { 
  font-size: 15px; 
  font-weight: 700; 
  color: var(--text);
}

.settings-value { 
  font-size: 12px; 
  color: var(--muted); 
  font-weight: 500;
}

.settings-chevron { 
  color: var(--muted); 
  flex-shrink: 0; 
}

.lang-row { cursor: default; }
.lang-row:active { background: transparent; }

.lang-pills { 
  display: flex; 
  gap: 6px; 
  flex-shrink: 0; 
}

.lang-pill {
  padding: 6px 12px; 
  border-radius: 10px; 
  font-size: 12px; 
  font-weight: 800;
  border: 1.5px solid var(--border); 
  color: var(--muted); 
  background: var(--surface);
  transition: all .2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-sm);
}

.lang-pill.active { 
  background: var(--accent-gradient); 
  border-color: transparent; 
  color: var(--text-inverse);
  box-shadow: 0 4px 10px rgba(var(--accent-rgb), 0.25);
}

/* ── Выход и брендинг ──────────────────────────────────────────────────────── */
.footer { 
  padding: 24px 20px; 
  margin-top: auto; 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
}

.logout-btn {
  width: 100%; 
  padding: 14px; 
  border-radius: 12px;
  border: 1.5px solid rgba(239, 68, 68, 0.35); 
  color: #ef4444;
  font-weight: 700; 
  font-size: 15px; 
  transition: all 0.2s ease;
  background: transparent;
}

.logout-btn:active { 
  background: rgba(239, 68, 68, 0.08); 
  border-color: rgba(239, 68, 68, 0.5);
  transform: scale(0.98);
}

.brand-btn {
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 8px;
  width: 100%; 
  padding: 8px;
  opacity: .5; 
  transition: opacity .15s;
}

.brand-btn:active { opacity: .8; }

.brand-name {
  font-size: 12px; 
  letter-spacing: .6px; 
  color: var(--muted);
  font-weight: 600;
}

.brand-name strong { 
  font-weight: 800; 
  color: var(--accent); 
}

.brand-version {
  font-size: 11px; 
  color: var(--muted);
  background: var(--surface); 
  border: 1px solid var(--border);
  border-radius: 6px; 
  padding: 2px 8px;
  font-weight: 700;
}

/* ── Модалка «О приложении» ────────────────────────────────────────────────── */
.about-overlay {
  position: fixed; 
  inset: 0; 
  z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; 
  align-items: flex-end; 
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom);
}

.about-modal {
  width: 100%; 
  max-width: 480px;
  background: var(--surface);
  border-radius: 28px 28px 0 0;
  padding: 40px 24px 32px;
  display: flex; 
  flex-direction: column; 
  align-items: center;
  gap: 16px;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
  animation: slideUp .35s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.about-logo { 
  font-size: 64px; 
  line-height: 1; 
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15));
}

.about-modal h2 {
  font-size: 26px; 
  font-weight: 800; 
  letter-spacing: -0.6px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

.about-tagline {
  font-size: 14px; 
  color: var(--muted); 
  font-weight: 600;
  margin-top: -6px;
}

.about-desc {
  background: var(--bg); 
  border-radius: 16px; 
  padding: 16px 20px;
  width: 100%; 
  border: 1px solid var(--border);
}

.about-desc p {
  font-size: 13.5px; 
  line-height: 1.6; 
  color: var(--muted); 
  text-align: center;
  font-weight: 500;
}

.about-meta {
  width: 100%;
  border: 1px solid var(--border); 
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg);
}

.about-row {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding: 14px 20px; 
  font-size: 13.5px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}

.about-row:last-child { border-bottom: none; }
.about-row span:first-child { color: var(--muted); font-weight: 500; }
.about-row span:last-child  { font-weight: 700; color: var(--text); }

.about-close {
  width: 100%; 
  padding: 15px; 
  border-radius: 14px;
  background: var(--accent-gradient); 
  color: var(--text-inverse);
  font-weight: 700; 
  font-size: 15.5px;
  margin-top: 8px; 
  box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.25);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.about-close:hover {
  transform: translateY(-1px);
}

.about-close:active {
  transform: translateY(0);
}
</style>
