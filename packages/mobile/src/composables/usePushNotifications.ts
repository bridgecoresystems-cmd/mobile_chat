import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export async function registerPushNotifications(chatToken: string) {
  // Only works on native (Android/iOS), skip in browser
  if (!Capacitor.isNativePlatform()) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== "granted") return

  await PushNotifications.register()

  PushNotifications.addListener("registration", async ({ value: fcmToken }) => {
    try {
      await fetch(`${API}/register-fcm-token`, {
        method:  "POST",
        headers: {
          "content-type": "application/json",
          "x-chat-token": chatToken,
        },
        body: JSON.stringify({ token: fcmToken }),
      })
    } catch {}
  })

  // Foreground notification — show as alert (simple approach)
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push received:", notification.title)
  })

  // User tapped notification
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const roomId = action.notification.data?.room_id
    if (roomId) {
      window.location.hash = `/chat/${roomId}`
    }
  })
}
