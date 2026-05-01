/**
 * AES-256-GCM 암호화 (BYOK 키 보관용)
 *  - KEY_ENCRYPTION_KEY 환경변수에서 32바이트 키 derive
 *  - IV(12바이트) + AuthTag(16바이트) + Ciphertext 합쳐서 base64
 */

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.KEY_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("KEY_ENCRYPTION_KEY 환경변수 없음 — .env.local에 설정 필요");
  }
  // 어떤 길이의 secret이든 32바이트로 derive
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv + tag + ciphertext
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(b64: string): string {
  const data = Buffer.from(b64, "base64");
  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = data.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
