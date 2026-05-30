import Dexie, { type Table } from "dexie"
import type { Contact } from "@chat/shared"
import type { Message } from "../composables/useChat"

interface CachedMessage extends Message {
  room_id: string
}

class KonektCache extends Dexie {
  contacts!: Table<Contact, string>
  messages!: Table<CachedMessage, string>

  constructor() {
    super("konekt_v1")
    this.version(1).stores({
      contacts: "contact_id",
      messages: "id, room_id, [room_id+timestamp]",
    })
  }
}

export const db = new KonektCache()
