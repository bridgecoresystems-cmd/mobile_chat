<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { registerPushNotifications } from './composables/usePushNotifications'

const auth = useAuthStore()

onMounted(() => {
  if (auth.chat_token) {
    registerPushNotifications(auth.chat_token).catch(() => {})
  }
})
</script>
