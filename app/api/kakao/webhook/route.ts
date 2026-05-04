/**
 * POST /api/kakao/webhook
 *
 * 안드로이드 봇이 단톡방 메시지를 수신할 때마다 호출.
 *
 * 인증: X-Bot-Token 헤더 (env BOT_WEBHOOK_TOKEN)
 *
 * 요청 형식:
 *   {
 *     "room": "운영진 단톡",
 *     "sender": "김재준",
 *     "content": "내일 미팅 어디서 할까요",
 *     "sent_at": 1714723200000   // (선택) ms epoch, 없으면 서버 now
 *   }
 *
 * 또는 배치:
 *   { "messages": [{...}, {...}] }
 */

import { NextResponse } from "next/server";
import { queryOne, exec, execReturning } from "@/lib/db";

interface IncomingMessage {
  room: string;
  sender: string;
  content: string;
  sent_at?: number;
}

export async function POST(req: Request) {
  const token = req.headers.get("x-bot-token");
  const expected = process.env.BOT_WEBHOOK_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const messages: IncomingMessage[] = Array.isArray(body.messages)
    ? body.messages
    : [body];

  let saved = 0;
  for (const m of messages) {
    if (!m.room || !m.sender || !m.content) continue;
    if (m.content.length > 5000) m.content = m.content.slice(0, 5000);

    // 방 upsert
    let room = await queryOne<{ id: number }>(
      "SELECT id FROM kakao_room WHERE room_name = $1",
      [m.room]
    );
    if (!room) {
      room = await execReturning<{ id: number }>(
        "INSERT INTO kakao_room (room_name, created_at) VALUES ($1, $2) RETURNING id",
        [m.room, Date.now()]
      );
    }

    await exec(
      "INSERT INTO kakao_message (room_id, sender, content, sent_at, received_at) VALUES ($1, $2, $3, $4, $5)",
      [room.id, m.sender, m.content, m.sent_at || Date.now(), Date.now()]
    );
    saved++;
  }

  return NextResponse.json({ ok: true, saved });
}

// 헬스체크용 GET (안드로이드 봇이 연결 확인할 때)
export async function GET(req: Request) {
  const token = req.headers.get("x-bot-token");
  if (token !== process.env.BOT_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, timestamp: Date.now() });
}
