<template>
  <div>
    <div class="page-header">
      <h1>Комнаты</h1>
      <span class="subtitle">Активные чаты (из Rust engine)</span>
    </div>

    <div class="table-wrap">
      <div v-if="loading" class="loading">Загрузка...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="!rooms.length" class="empty">Нет активных комнат</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Room ID</th>
            <th>Участники</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rooms" :key="r.id ?? r">
            <td class="room-id">{{ r.id ?? r }}</td>
            <td class="muted">{{ (r.participants ?? []).join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { get } = useAdminApi()

const rooms   = ref<any[]>([])
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    const data = await get<any>('/admin/rooms')
    rooms.value = Array.isArray(data) ? data : (data.rooms ?? [])
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
.subtitle { color: var(--muted); font-size: 14px; }

.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.loading, .empty { padding: 32px; color: var(--muted); text-align: center; }

.error {
  padding: 20px;
  color: var(--danger);
  background: var(--danger-dim);
  margin: 16px;
  border-radius: 10px;
  font-size: 13px;
}

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
}

.table tr:hover td { background: rgba(255,255,255,0.02); }

.room-id {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent);
}

.muted { color: var(--muted); font-size: 13px; }
</style>
