import { Queue } from "bullmq"
import IORedis from "ioredis"

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379"

// maxRetriesPerRequest: null is required by BullMQ
export const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

export const broadcastQueue = new Queue("broadcasts", { connection: redis })
