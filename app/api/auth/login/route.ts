import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, User } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "이메일·비밀번호 필요" }, { status: 400 });
  }
  const user = await queryOne<User>("SELECT * FROM users WHERE email = $1", [email]);
  if (!user) {
    return NextResponse.json({ error: "계정이 존재하지 않습니다." }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const token = await createSession(user);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, email: user.email });
}
