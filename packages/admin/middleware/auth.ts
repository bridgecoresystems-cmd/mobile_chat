export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  const token = useCookie('admin_token')
  if (!token.value) return navigateTo('/login')
})
