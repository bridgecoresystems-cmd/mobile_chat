const SECRET = () => process.env.JWT_SECRET ?? "dev-secret-change-in-production"
const EXPIRES_IN_SEC = 60 * 60 * 24 * 7 // 7 days

// HS256 JWT compatible with Rust engine Claims: { sub, role, exp }
export async function signChatJwt(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + EXPIRES_IN_SEC

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

  const header  = b64url({ alg: "HS256", typ: "JWT" })
  const payload = b64url({ sub: userId, role: "user", exp })
  const signing = `${header}.${payload}`

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signing))
  const sig    = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

  return `${signing}.${sig}`
}

export async function verifyChatJwt(token: string): Promise<{ sub: string; role: string; exp: number } | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [header, payload, sig] = parts
    const signing = `${header}.${payload}`

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))
    const valid  = await crypto.subtle.verify("HMAC", key, sigBuf, new TextEncoder().encode(signing))
    if (!valid) return null

    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    if (claims.exp < Math.floor(Date.now() / 1000)) return null

    return claims
  } catch {
    return null
  }
}
