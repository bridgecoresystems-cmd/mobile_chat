import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId:     "com.bridgecore.konekt",
  appName:   "konekt",
  webDir:    "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
}

export default config
