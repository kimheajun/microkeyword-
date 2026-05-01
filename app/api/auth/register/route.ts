import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, execReturning, User } from "@/lib/db";
import { createSession, setSessionCookie, isValidGraduateCode } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password, graduateCode } = await req.json();

  if (!email || !password || !graduateCode) {
    return NextResponse.json({ error: "이메일·비밀번호·졸업생 코드 모두 필요합니다." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!isValidGraduateCode(graduateCode)) {
    return NextResponse.json({ error: "유효하지 않은 졸업생 코드입니다." }, { status: 403 });
  }

  const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await execReturning<User>(
    `INSERT INTO users (email, password_hash, graduate_code, created_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, password_hash, graduate_code, created_at`,
    [email, hash, graduateCode.toUpperCase(), Date.now()]
  );

  const token = await createSession(user);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, email });
}
