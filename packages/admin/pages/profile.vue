<template>
  <div class="profile-page">
    <!-- Page Title -->
    <div class="page-header">
      <div>
        <span class="greeting-prefix">Параметры учетной записи</span>
        <h1>Мой Профиль</h1>
        <span class="subtitle">Управление личными данными и настройками безопасности</span>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="profile-grid">
      <!-- Left Card: Profile Summary -->
      <div class="profile-card summary-card">
        <div class="avatar-glow-wrap">
          <div class="profile-avatar" :style="{ background: avatarColor }">{{ initials }}</div>
          <span class="avatar-pulse"></span>
        </div>
        
        <h2 class="display-name">{{ fullName }}</h2>
        <span class="username-label">@{{ adminData?.username }}</span>
        
        <div class="role-badge">
          <span class="shield-icon">🛡️</span>
          <span>Главный Администратор</span>
        </div>

        <div class="meta-list">
          <div class="meta-item">
            <span class="label">ID аккаунта</span>
            <span class="value mono" :title="adminData?.id">{{ adminData?.id?.slice(0, 18) }}...</span>
          </div>
          <div class="meta-item">
            <span class="label">Дата регистрации</span>
            <span class="value">{{ registrationDate }}</span>
          </div>
        </div>
      </div>

      <!-- Right Card: Form -->
      <div class="profile-card form-card">
        <form @submit.prevent="saveProfile" class="profile-form">
          
          <!-- Personal Information Section -->
          <div class="form-section">
            <h3 class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Личная информация
            </h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">Имя *</label>
                <input 
                  id="firstName" 
                  v-model="form.firstName" 
                  required 
                  placeholder="Иван" 
                  class="form-input" 
                />
              </div>

              <div class="form-group">
                <label for="lastName">Фамилия *</label>
                <input 
                  id="lastName" 
                  v-model="form.lastName" 
                  required 
                  placeholder="Иванов" 
                  class="form-input" 
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="phone">Номер телефона *</label>
                <input 
                  id="phone" 
                  v-model="form.phone" 
                  required 
                  placeholder="+7 (999) 123-45-67" 
                  class="form-input" 
                />
              </div>

              <div class="form-group">
                <label for="email">Электронная почта</label>
                <input 
                  id="email" 
                  v-model="form.email" 
                  type="email" 
                  placeholder="admin@konekt.ru" 
                  class="form-input" 
                />
              </div>
            </div>
          </div>

          <!-- Security Section -->
          <div class="form-section">
            <h3 class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Безопасность (Изменение пароля)
            </h3>
            <p class="section-desc">Оставьте поля пароля пустыми, если не хотите его менять</p>

            <div class="form-row">
              <!-- New Password field -->
              <div class="form-group password-group">
                <label for="newPassword">Новый пароль</label>
                <div class="password-wrapper">
                  <input 
                    id="newPassword" 
                    v-model="form.newPassword" 
                    :type="showPassword ? 'text' : 'password'" 
                    placeholder="Минимум 4 символа" 
                    class="form-input" 
                  />
                  <button 
                    type="button" 
                    class="toggle-visibility" 
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                  >
                    <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Confirm Password field -->
              <div class="form-group password-group">
                <label for="confirmPassword">Подтвердите пароль</label>
                <div class="password-wrapper">
                  <input 
                    id="confirmPassword" 
                    v-model="form.confirmPassword" 
                    :type="showConfirmPassword ? 'text' : 'password'" 
                    placeholder="Повторите пароль" 
                    class="form-input" 
                    :class="{ 'mismatch': passwordMismatch }"
                  />
                  <button 
                    type="button" 
                    class="toggle-visibility" 
                    @click="showConfirmPassword = !showConfirmPassword"
                    tabindex="-1"
                  >
                    <svg v-if="showConfirmPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
                <span v-if="passwordMismatch" class="error-inline">Пароли не совпадают</span>
              </div>
            </div>
          </div>

          <!-- Alert & Actions Block -->
          <div class="actions-wrapper">
            <div class="alerts-container">
              <transition name="fade">
                <div v-if="success" class="alert success-alert">
                  <span class="icon">✅</span>
                  <span>{{ success }}</span>
                </div>
              </transition>
              <transition name="fade">
                <div v-if="error" class="alert error-alert">
                  <span class="icon">⚠️</span>
                  <span>{{ error }}</span>
                </div>
              </transition>
            </div>

            <button type="submit" class="submit-btn" :disabled="saving || passwordMismatch">
              <div v-if="saving" class="btn-spinner"></div>
              <span>{{ saving ? 'Сохранение...' : 'Сохранить изменения' }}</span>
            </button>
          </div>
          
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get, post } = useAdminApi()

const adminData = ref<any>(null)
const saving    = ref(false)
const success   = ref('')
const error     = ref('')

const showPassword        = ref(false)
const showConfirmPassword = ref(false)

const form = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  newPassword: '',
  confirmPassword: '',
})

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#f59e0b','#06b6d4']

// Computes background color for avatar from user ID
const avatarColor = computed(() => {
  if (!adminData.value) return '#6366f1'
  const id = adminData.value.id
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff
  return COLORS[h % COLORS.length]
})

const fullName = computed(() => {
  if (form.value.firstName || form.value.lastName) {
    return `${form.value.firstName} ${form.value.lastName}`.trim()
  }
  return adminData.value?.username ?? 'Администратор'
})

const initials = computed(() => {
  if (form.value.firstName) {
    const f = form.value.firstName[0]
    const l = form.value.lastName ? form.value.lastName[0] : ''
    return (f + l).toUpperCase()
  }
  return adminData.value?.username?.slice(0, 2).toUpperCase() ?? 'A'
})

const registrationDate = computed(() => {
  if (!adminData.value?.created_at) return '—'
  return new Date(adminData.value.created_at).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

const passwordMismatch = computed(() => {
  if (!form.value.newPassword && !form.value.confirmPassword) return false
  return form.value.newPassword !== form.value.confirmPassword
})

async function fetchProfile() {
  try {
    const data = await get<any>('/profile')
    adminData.value = data
    
    // Prefill form
    form.value.email = data.email ?? ''
    if (data.profile) {
      form.value.firstName = data.profile.first_name ?? ''
      form.value.lastName  = data.profile.last_name ?? ''
      form.value.phone     = data.profile.phone ?? ''
    }
  } catch (err: any) {
    console.error('Failed to load profile:', err)
    error.value = 'Не удалось загрузить данные профиля'
  }
}

async function saveProfile() {
  if (passwordMismatch.value) return
  
  error.value   = ''
  success.value = ''
  saving.value  = true
  
  try {
    const payload: any = {
      first_name: form.value.firstName,
      last_name:  form.value.lastName,
      phone:      form.value.phone,
      email:      form.value.email || undefined,
    }

    if (form.value.newPassword) {
      payload.password = form.value.newPassword
    }

    await post('/profile', payload)
    
    success.value = 'Профиль успешно обновлен!'
    form.value.newPassword = ''
    form.value.confirmPassword = ''
    
    // Reload user data to update sidebar and local computations
    await fetchProfile()
    
    // Clear success message after 4s
    setTimeout(() => {
      success.value = ''
    }, 4000)
  } catch (err: any) {
    console.error('Failed to save profile:', err)
    error.value = err.message === 'email already taken' 
      ? 'Этот Email адрес уже занят другим пользователем'
      : err.message || 'Ошибка обновления профиля'
  } finally {
    saving.value = false
  }
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile-page {
  animation: fadeIn 0.3s ease-out;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.greeting-prefix {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--accent);
  font-weight: 700;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 800;
  margin: 2px 0 4px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--muted);
  font-size: 14px;
}

/* Layout Grid */
.profile-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 28px;
  align-items: start;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
}

/* Left Card Styling */
.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  text-align: center;
}

.avatar-glow-wrap {
  position: relative;
  margin-bottom: 20px;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3);
  z-index: 2;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.08);
}

.avatar-pulse {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  animation: pulse-avatar 2s infinite;
  opacity: 0.3;
  z-index: 1;
}

@keyframes pulse-avatar {
  0% { transform: scale(0.95); opacity: 0.5; }
  100% { transform: scale(1.08); opacity: 0; }
}

.display-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 2px;
  line-height: 1.2;
}

.username-label {
  font-size: 13.5px;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 16px;
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--accent-dim);
  color: var(--accent);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 28px;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.meta-list {
  width: 100%;
  border-top: 1px solid var(--border);
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.meta-item .label {
  color: var(--muted);
  font-weight: 600;
}

.meta-item .value {
  color: var(--text);
  font-weight: 700;
}

.meta-item .value.mono {
  font-family: monospace;
  color: var(--accent);
  background: rgba(99, 102, 241, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Right Card: Form Styling */
.form-card {
  padding: 32px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  border-bottom: 1.5px solid var(--border);
  padding-bottom: 10px;
}

.section-title svg {
  color: var(--accent);
}

.section-desc {
  font-size: 13px;
  color: var(--muted);
  margin-top: -6px;
  font-weight: 500;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 650px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  background: var(--surface2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: var(--accent);
  outline: none;
  background: rgba(255, 255, 255, 0.01);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.05);
}

.form-input.mismatch {
  border-color: var(--danger);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.05);
}

.error-inline {
  font-size: 11.5px;
  color: var(--danger);
  font-weight: 700;
  margin-top: 2px;
}

/* Password Visibility Button inside Input wrapper */
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-wrapper .form-input {
  width: 100%;
  padding-right: 44px;
}

.toggle-visibility {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.toggle-visibility:hover {
  color: var(--text);
}

/* Actions Wrapper */
.actions-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid var(--border);
  padding-top: 24px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.alerts-container {
  flex: 1;
  min-width: 250px;
}

.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-weight: 700;
}

.success-alert {
  background: var(--success-dim);
  color: var(--success);
  border: 1px solid rgba(34, 197, 94, 0.1);
}

.error-alert {
  background: var(--danger-dim);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.1);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 28px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
