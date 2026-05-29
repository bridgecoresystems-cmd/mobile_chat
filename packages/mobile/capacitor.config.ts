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
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e1e2e",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    },
  },
}

export default config
