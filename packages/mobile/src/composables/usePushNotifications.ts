import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"
import { useAuthStore } from "../stores/auth"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) return

  const auth = useAuthStore()

  // Android 8+: create notification channel before registering
  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id:          "messages",
      name:        "Messages",
      description: "New message and contact request notifications",
      importance:  5,
      sound:       "default",
      vibration:   true,
      visibility:  1,
      lights:      true,
      lightColor:  "#6366F1",
    })
  }

  // Check first, request only if needed (matches tmgo pattern)
  let perm = await PushNotifications.checkPermissions()
  if (perm.receive === "prompt") {
    perm = await PushNotifications.requestPermissions()
  }
  if (perm.receive !== "granted") return

  // Set up listeners BEFORE register() to avoid missing the event
  await PushNotifications.addListener("registration", async ({ value: fcmToken }) => {
    try {
      const res = await fetch(`${API}/register-fcm-token`, {
        method:  "POST",
        headers: {
          "content-type":  "application/json",
          "authorization": `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ token: fcmToken }),
      })
      if (!res.ok) console.error("[FCM] register-fcm-token failed:", res.status, await res.text())
      else console.log("[FCM] token registered ok")
    } catch (e) {
      console.error("[FCM] registration fetch error:", e)
    }
  })

  await PushNotifications.addListener("registrationError", (err) => {
    console.error("[FCM] registration error:", err.error)
  })

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[FCM] Push received:", notification.title)
  })

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const roomId = action.notification.data?.room_id
    if (roomId) window.location.hash = `/chat/${roomId}`
  })

  await PushNotifications.register()
}
