import Dexie, { type Table } from "dexie"
import type { Contact } from "@chat/shared"
import type { Message } from "../composables/useChat"

interface CachedMessage extends Message {
  room_id: string
}

export interface ChatSummary {
  contact_id:      string
  room_id:         string
  created_at:      number
  username:        string | null
  first_name:      string | null
  last_name:       string | null
  phone:           string | null
  last_message:    string | null
  last_message_at: number | null
  last_sender_id:  string | null
  unread_count:    number
}

class KonektCache extends Dexie {
  contacts!: Table<Contact, string>
  messages!: Table<CachedMessage, string>
  chats!:    Table<ChatSummary, string>

  constructor() {
    super("konekt_v1")
    this.version(1).stores({
      contacts: "contact_id",
      messages: "id, room_id, [room_id+timestamp]",
    })
    this.version(2).stores({
      contacts: "contact_id",
      messages: "id, room_id, [room_id+timestamp]",
      chats:    "room_id",
    })
  }
}

export const db = new KonektCache()
