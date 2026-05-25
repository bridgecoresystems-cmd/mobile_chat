import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId:     "com.bridgecore.chat",
  appName:   "BridgeCore Chat",
  webDir:    "dist",
  server: {
    androidScheme: "https",
  },
}

export default config
