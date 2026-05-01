/**
 * GET /api/keys → 등록된 키 메타 (값은 안 보냄)
 * POST /api/keys → 키 저장 + 검증
 * DELETE /api/keys → 키 삭제
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { queryOne, exec } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const row = await queryOne<{ naver_customer_id: string | null; verified_at: number | null }>(
    "SELECT naver_customer_id, verified_at FROM user_keys WHERE user_id = $1",
    [session.userId]
  );
  if (!row) return NextResponse.json({ hasKeys: false });
  return NextResponse.json({
    hasKeys: !!(row.naver_customer_id),
    customerId: row.naver_customer_id,
    verifiedAt: row.verified_at,
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  await exec("DELETE FROM user_keys WHERE user_id = $1", [session.userId]);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const { accessLicense, secretKey, customerId } = await req.json();
  if (!accessLicense || !secretKey || !customerId) {
    return NextResponse.json({ error: "3개 키 모두 필요합니다." }, { status: 400 });
  }
  const verifyOk = await verifyKeys(accessLicense, secretKey, customerId);
  if (!verifyOk.ok) {
    return NextResponse.json({ error: `키 검증 실패: ${verifyOk.error}` }, { status: 400 });
  }
  await exec(
    `INSERT INTO user_keys (user_id, naver_access_license_enc, naver_secret_key_enc, naver_customer_id, verified_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       naver_access_license_enc = EXCLUDED.naver_access_license_enc,
       naver_secret_key_enc = EXCLUDED.naver_secret_key_enc,
       naver_customer_id = EXCLUDED.naver_customer_id,
       verified_at = EXCLUDED.verified_at`,
    [
      session.userId,
      encrypt(accessLicense),
      encrypt(secretKey),
      customerId,
      Date.now(),
    ]
  );
  return NextResponse.json({ ok: true, verifiedAt: Date.now() });
}

async function verifyKeys(
  accessLicense: string,
  secretKey: string,
  customerId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const uri = "/keywordstool";
    const timestamp = Date.now().toString();
    const message = `${timestamp}.GET.${uri}`;
    const signature = crypto.createHmac("sha256", secretKey).update(message).digest("base64");
    const url = `https://api.searchad.naver.com${uri}?hintKeywords=${encodeURIComponent("테스트")}&showDetail=1`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": accessLicense,
        "X-Customer": customerId,
        "X-Signature": signature,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 100)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "네트워크 오류" };
  }
}
