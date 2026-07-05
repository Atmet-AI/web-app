import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

export type SealedSecret = {
  algorithm: typeof ALGORITHM
  iv: string
  tag: string
  ciphertext: string
}

function getEncryptionKey() {
  const rawKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY

  if (!rawKey) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY is required to store integration secrets.")
  }

  return createHash("sha256").update(rawKey).digest()
}

export function sealSecretPayload(payload: unknown): SealedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  }
}

export function openSecretPayload<T>(sealed: SealedSecret): T {
  const decipher = createDecipheriv(
    sealed.algorithm,
    getEncryptionKey(),
    Buffer.from(sealed.iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ])

  return JSON.parse(plaintext.toString("utf8")) as T
}
