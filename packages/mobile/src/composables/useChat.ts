import { ref, computed, onUnmounted } from "vue"
import * as protobuf from "protobufjs"

const root = protobuf.Root.fromJSON({
  nested: {
    turbo_chat: {
      nested: {
        Envelope: {
          fields: {
            message:  { id: 1, type: "ChatMessage",   oneof: "kind" } as any,
            ack:      { id: 2, type: "Ack",            oneof: "kind" } as any,
            typing:   { id: 3, type: "Typing",         oneof: "kind" } as any,
            presence: { id: 4, type: "Presence",       oneof: "kind" } as any,
            edit:     { id: 5, type: "EditMessage",    oneof: "kind" } as any,
            delete:   { id: 6, type: "DeleteMessage",  oneof: "kind" } as any,
          },
          oneofs: { kind: { oneof: ["message", "ack", "typing", "presence", "edit", "delete"] } },
        },
        ChatMessage: {
          fields: {
            id:        { id: 1, type: "uint64" },
            room_id:   { id: 2, type: "string" },
            sender_id: { id: 3, type: "string" },
            payload:   { id: 4, type: "bytes"  },
            timestamp: { id: 5, type: "int64"  },
          },
        },
        Ack: {
          fields: {
            message_id: { id: 1, type: "uint64" },
            user_id:    { id: 2, type: "string" },
            room_id:    { id: 3, type: "string" },
          },
        },
        Typing:   { fields: { room_id: { id: 1, type: "string" }, user_id: { id: 2, type: "string" }, is_typing: { id: 3, type: "bool" } } },
        Presence: { fields: { room_id: { id: 1, type: "string" }, user_id: { id: 2, type: "string" }, status:    { id: 3, type: "string" } } },
        EditMessage: {
          fields: {
            message_id:  { id: 1, type: "uint64" },
            new_payload: { id: 2, type: "bytes"  },
            room_id:     { id: 3, type: "string" },
            sender_id:   { id: 4, type: "string" },
          },
        },
        DeleteMessage: {
          fields: {
            message_id: { id: 1, type: "uint64" },
            room_id:    { id: 2, type: "string" },
            sender_id:  { id: 3, type: "string" },
          },
        },
      },
    },
  },
})

const Envelope       = root.lookupType("turbo_chat.Envelope")
const ChatMessage    = root.lookupType("turbo_chat.ChatMessage")
const AckMsg         = root.lookupType("turbo_chat.Ack")
const TypingMsg      = root.lookupType("turbo_chat.Typing")
const EditMsg        = root.lookupType("turbo_chat.EditMessage")
const DeleteMsg      = root.lookupType("turbo_chat.DeleteMessage")

export interface Message {
  id:        string
  senderId:  string
  text:      string
  photoUrl:  string | null
  timestamp: number
  mine:      boolean
  deleted:   boolean
  read:      boolean   // peer has read this (for mine: true messages)
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
const WS_URL  = API_URL.replace(/^http/, "ws")

// Unique message id as a plain number — protobufjs cannot encode native BigInt
// into uint64 fields (it silently becomes 0). Millisecond * 1000 + random keeps
// ids unique across same-millisecond sends and stays safely under 2^53.
function nextId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

export function useChat(roomId: string) {
  const messages    = ref<Message[]>([])
  const onlineUsers = ref<Set<string>>(new Set())
  const typingUsers = ref<Set<string>>(new Set())
  const isConnected = ref(false)

  let ws: WebSocket | null = null
  let typingTimer:   ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 1000
  let myUserId = ""
  let savedToken = ""

  function decodeStr(str: string): { text: string; photoUrl: string | null } {
    try {
      const obj = JSON.parse(str)
      if (obj.type === "photo" && obj.url) return { text: "", photoUrl: obj.url }
    } catch {}
    return { text: str, photoUrl: null }
  }
  function decodePayload(raw: Uint8Array) {
    return decodeStr(new TextDecoder().decode(raw))
  }

  function scheduleReconnect() {
    if (!savedToken || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectWs()
    }, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
  }

  function connectWs() {
    ws?.close()
    ws = new WebSocket(`${WS_URL}/?token=${savedToken}`)
    ws.binaryType = "arraybuffer"

    ws.onopen = () => {
      isConnected.value = true
      reconnectDelay = 1000
      // First frame must be ChatMessage with room_id — server uses it to subscribe to the room
      sendEnvelope({
        message: ChatMessage.create({
          id:        nextId(),
          room_id:   roomId,
          sender_id: myUserId,
          payload:   new TextEncoder().encode("join"),
          timestamp: Date.now(),
        }),
      })
      // Ack all historical messages from others — marks them as read on sender's side
      const toAck = messages.value.filter(m => !m.mine && !m.deleted)
      console.log(`[useChat] onopen: sending ${toAck.length} historical acks, msgs total=${messages.value.length}`)
      for (const msg of toAck) {
        console.log(`[useChat] acking id=${msg.id}`)
        sendEnvelope({ ack: AckMsg.create({ message_id: Number(msg.id), user_id: myUserId, room_id: roomId }) })
      }
    }
    ws.onclose = () => {
      isConnected.value = false
      scheduleReconnect()
    }
    ws.onerror = () => { isConnected.value = false }

    ws.onmessage = (event) => {
      const env = Envelope.decode(new Uint8Array(event.data)) as any

      if (env.message) {
        const { text, photoUrl } = decodePayload(env.message.payload)
        if (text === "join" || text === "leave") return

        // Deduplicate — server echoes our own messages back
        const id = String(env.message.id)
        if (messages.value.some(m => m.id === id)) return

        const mine = env.message.sender_id === myUserId
        messages.value.push({
          id,
          senderId:  env.message.sender_id,
          text,
          photoUrl,
          timestamp: Number(env.message.timestamp),
          mine,
          deleted:   false,
          read:      false,
        })

        // Auto-send Ack for messages from others (signals "read")
        if (!mine) {
          sendEnvelope({ ack: AckMsg.create({ message_id: env.message.id, user_id: myUserId, room_id: roomId }) })
        }
      }

      if (env.ack) {
        // A peer acknowledged one of my messages — mark it as read
        const mid = String(env.ack.message_id)
        console.log(`[useChat] received ack mid=${mid}, searching in ${messages.value.length} msgs`)
        const msg = messages.value.find(m => m.id === mid && m.mine)
        console.log(`[useChat] ack match:`, msg ? `found id=${msg.id}` : `NOT FOUND (sample ids: ${messages.value.slice(0,3).map(m=>m.id).join(',')})`)
        if (msg) msg.read = true
      }

      if (env.edit) {
        const mid = String(env.edit.message_id)
        const msg = messages.value.find(m => m.id === mid)
        if (msg) {
          const { text, photoUrl } = decodePayload(env.edit.new_payload)
          msg.text     = text
          msg.photoUrl = photoUrl
        }
      }

      if (env.delete) {
        const mid = String(env.delete.message_id)
        const msg = messages.value.find(m => m.id === mid)
        if (msg) { msg.deleted = true; msg.text = "" }
      }

      if (env.typing) {
        if (env.typing.user_id === myUserId) return
        env.typing.is_typing
          ? typingUsers.value.add(env.typing.user_id)
          : typingUsers.value.delete(env.typing.user_id)
      }

      if (env.presence) {
        env.presence.status === "online"
          ? onlineUsers.value.add(env.presence.user_id)
          : onlineUsers.value.delete(env.presence.user_id)
      }
    }
  }

  async function connect(chatToken: string, userId: string) {
    myUserId   = userId
    savedToken = chatToken

    try {
      const res = await fetch(`${API_URL}/history/${roomId}?limit=50`)
      const history: any[] = await res.json()
      messages.value = (history ?? [])
        .filter((m) => m.text !== "join" && m.text !== "leave")
        .map((m) => {
          const { text, photoUrl } = decodeStr(m.text ?? "")
          return {
            id:        String(m.id),
            senderId:  m.sender_id,
            text,
            photoUrl,
            timestamp: Number(m.timestamp),
            mine:      m.sender_id === userId,
            deleted:   false,
            read:      m.read_by_peer ?? false,
          }
        })
    } catch {}

    connectWs()
  }

  function send(text: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const id = nextId()
    sendEnvelope({
      message: ChatMessage.create({
        id,
        room_id:   roomId,
        sender_id: myUserId,
        payload:   new TextEncoder().encode(text),
        timestamp: Date.now(),
      }),
    })
    // Optimistically add to messages (will deduplicate on echo)
    messages.value.push({
      id:        String(id),
      senderId:  myUserId,
      text,
      photoUrl:  null,
      timestamp: Date.now(),
      mine:      true,
      deleted:   false,
      read:      false,
    })
    stopTyping()
  }

  function sendPhoto(url: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const id      = nextId()
    const payload = new TextEncoder().encode(JSON.stringify({ type: "photo", url }))
    sendEnvelope({
      message: ChatMessage.create({
        id,
        room_id:   roomId,
        sender_id: myUserId,
        payload,
        timestamp: Date.now(),
      }),
    })
    messages.value.push({
      id:        String(id),
      senderId:  myUserId,
      text:      "",
      photoUrl:  url,
      timestamp: Date.now(),
      mine:      true,
      deleted:   false,
      read:      false,
    })
  }

  function editMessage(messageId: string, newText: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    sendEnvelope({
      edit: EditMsg.create({
        message_id:  Number(messageId),
        new_payload: new TextEncoder().encode(newText),
        room_id:     roomId,
        sender_id:   myUserId,
      }),
    })
  }

  function deleteMessage(messageId: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    sendEnvelope({
      delete: DeleteMsg.create({ message_id: Number(messageId), room_id: roomId, sender_id: myUserId }),
    })
  }

  function sendTyping() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    sendEnvelope({ typing: TypingMsg.create({ room_id: roomId, user_id: myUserId, is_typing: true }) })
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(stopTyping, 3000)
  }

  function stopTyping() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    sendEnvelope({ typing: TypingMsg.create({ room_id: roomId, user_id: myUserId, is_typing: false }) })
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null }
  }

  function sendEnvelope(kind: object) {
    ws!.send(Envelope.encode(Envelope.create(kind)).finish() as unknown as Uint8Array<ArrayBuffer>)
  }

  function disconnect() {
    savedToken = ""
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    stopTyping()
    ws?.close()
  }

  function handleVisibility() {
    if (document.visibilityState === "visible" && !isConnected.value && savedToken) {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      reconnectDelay = 1000
      connectWs()
    }
  }

  function handleLogout() {
    savedToken = ""
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    ws?.close()
  }

  document.addEventListener("visibilitychange", handleVisibility)
  window.addEventListener("chat:logout", handleLogout)

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibility)
    window.removeEventListener("chat:logout", handleLogout)
    disconnect()
  })

  const typingText = computed(() => {
    const users = [...typingUsers.value]
    if (!users.length) return ""
    return users.join(", ") + (users.length === 1 ? " печатает..." : " печатают...")
  })

  return {
    messages, onlineUsers, typingUsers, typingText, isConnected,
    connect, send, sendPhoto, editMessage, deleteMessage, sendTyping, disconnect,
  }
}
