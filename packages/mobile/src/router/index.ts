import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore, bffHeaders } from '../stores/auth'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',              redirect: '/contacts' },
    { path: '/login',         component: () => import('../pages/LoginPage.vue') },
    { path: '/setup',         component: () => import('../pages/ProfileSetupPage.vue'), meta: { auth: true } },
    { path: '/contacts',      component: () => import('../pages/ContactsPage.vue'),     meta: { auth: true, needsProfile: true } },
    { path: '/notifications', component: () => import('../pages/NotificationsPage.vue'),meta: { auth: true, needsProfile: true } },
    { path: '/profile',       component: () => import('../pages/ProfilePage.vue'),      meta: { auth: true, needsProfile: true } },
    { path: '/search',        component: () => import('../pages/SearchPage.vue'),       meta: { auth: true, needsProfile: true } },
    { path: '/chat/:roomId',  component: () => import('../pages/ChatPage.vue'),         meta: { auth: true, needsProfile: true } },
  ],
})

// Хранит токен, для которого уже проверили профиль — сбрасывается при смене токена (logout/login)
let checkedForToken: string | null = null

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.auth && !auth.token) return '/login'

  if (to.meta.needsProfile && auth.token && auth.token !== checkedForToken) {
    try {
      const res = await fetch(`${API}/profile`, { headers: bffHeaders() })
      if (res.ok) {
        const d = await res.json()
        checkedForToken = auth.token   // запоминаем токен, для которого профиль OK
        if (!d.profile) return '/setup'
      }
    } catch {}
  }
})
