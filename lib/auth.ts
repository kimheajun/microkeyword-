/**
 * Cookie + JWT 세션 (NextAuth 없이 단순 구현)
 *  - JWT는 jose 라이브러리로 서명/검증
 *  - HTTP-only secure cookie로 저장
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb, User } from "./db";

const COOKIE_NAME = "mk_session";
const SESSION_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET 환경변수 없음");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  email: string;
  graduateCode: string;
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    graduateCode: user.graduate_code,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
  return token;
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      graduateCode: payload.graduateCode as string,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionPayload | null> {
  return await getSession();
}

export function isValidGraduateCode(code: string): boolean {
  const allowed = (process.env.GRADUATE_CODES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (allowed.length === 0) return true; // 코드 미설정 시 모두 허용 (베타)
  return allowed.includes(code.trim().toUpperCase());
}
