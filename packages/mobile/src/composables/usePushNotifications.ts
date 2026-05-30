import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export async function registerPushNotifications(chatToken: string) {
  if (!Capacitor.isNativePlatform()) return

  // Android 8+: create a high-priority channel so notifications play sound
  // and appear as heads-up banners (must be created before register())
  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id:          "messages",
      name:        "Messages",
      description: "New message and contact request notifications",
      importance:  5,      // IMPORTANCE_HIGH — sound + heads-up banner
      sound:       "default",
      vibration:   true,
      visibility:  1,      // VISIBILITY_PUBLIC
      lights:      true,
      lightColor:  "#6366F1",
    })
  }

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== "granted") return

  await PushNotifications.register()

  PushNotifications.addListener("registration", async ({ value: fcmToken }) => {
    try {
      const res = await fetch(`${API}/register-fcm-token`, {
        method:  "POST",
        headers: {
          "content-type": "application/json",
          "x-chat-token": chatToken,
        },
        body: JSON.stringify({ token: fcmToken }),
      })
      if (!res.ok) console.error("[FCM] register-fcm-token failed:", res.status, await res.text())
    } catch (e) {
      console.error("[FCM] registration fetch error:", e)
    }
  })

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[FCM] registration error:", err.error)
  })

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push received:", notification.title)
  })

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const roomId = action.notification.data?.room_id
    if (roomId) {
      window.location.hash = `/chat/${roomId}`
    }
  })
}
