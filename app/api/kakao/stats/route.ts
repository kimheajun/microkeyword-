/**
 * GET /api/kakao/stats
 *
 * 관리자(로그인 + JA0000 코드) — 카카오 봇 메시지 누적 통계
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryAll } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.graduateCode !== "JA0000") {
    return NextResponse.json({ error: "관리자 전용" }, { status: 403 });
  }

  const rooms = await queryAll<{
    room_name: string;
    msg_count: string;
    last_msg: string;
    first_msg: string;
  }>(
    `SELECT r.room_name,
            COUNT(m.id)::text AS msg_count,
            MAX(m.sent_at)::text AS last_msg,
            MIN(m.sent_at)::text AS first_msg
       FROM kakao_room r
       LEFT JOIN kakao_message m ON m.room_id = r.id
       WHERE r.active = TRUE
       GROUP BY r.id, r.room_name
       ORDER BY MAX(m.sent_at) DESC NULLS LAST`
  );

  return NextResponse.json({
    rooms: rooms.map((r) => ({
      room_name: r.room_name,
      msg_count: parseInt(r.msg_count, 10) || 0,
      last_msg: r.last_msg ? Number(r.last_msg) : null,
      first_msg: r.first_msg ? Number(r.first_msg) : null,
    })),
  });
}
