import { Worker } from "bullmq"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"
import { eq } from "drizzle-orm"
import { redis } from "../lib/queue"
import { db } from "../db"
import { broadcasts, deviceTokens } from "../db/schema"

function getMessagingClient() {
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(JSON.parse(process.env.FCM_SERVICE_ACCOUNT ?? "{}")) })
  return getMessaging(app)
}

export function startBroadcastWorker() {
  const worker = new Worker(
    "broadcasts",
    async (job) => {
      const { broadcastId, title, body, data = {} } = job.data as {
        broadcastId: string
        title:       string
        body:        string
        data?:       Record<string, string>
      }

      await db.update(broadcasts).set({ status: "sending" }).where(eq(broadcasts.id, broadcastId))

      const messaging = getMessagingClient()
      const rows      = await db.select({ fcm_token: deviceTokens.fcm_token }).from(deviceTokens)
      const tokens    = rows.map(r => r.fcm_token)

      let sent = 0
      const BATCH = 500

      for (let i = 0; i < tokens.length; i += BATCH) {
        const batch = tokens.slice(i, i + BATCH)
        try {
          const result = await messaging.sendEachForMulticast({
            tokens: batch,
            notification: { title, body },
            data,
            android: { priority: "high" },
          })
          sent += result.successCount
        } catch (e) {
          console.error("[broadcast] batch error:", e)
        }
        await job.updateProgress(Math.round(((i + batch.length) / Math.max(tokens.length, 1)) * 100))
      }

      await db.update(broadcasts)
        .set({ status: "sent", recipients: sent })
        .where(eq(broadcasts.id, broadcastId))

      console.log(`[broadcast] ${broadcastId} → sent to ${sent}/${tokens.length}`)
      return { sent }
    },
    {
      connection:  redis,
      concurrency: 1,
    }
  )

  worker.on("failed", async (job, err) => {
    console.error(`[broadcast] job ${job?.id} failed:`, err.message)
    if (job?.data?.broadcastId) {
      await db.update(broadcasts)
        .set({ status: "failed" })
        .where(eq(broadcasts.id, job.data.broadcastId))
        .catch(() => {})
    }
  })

  console.log("[broadcast] worker started")
  return worker
}
