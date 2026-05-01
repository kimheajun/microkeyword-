"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface KeyStatus {
  hasKeys: boolean;
  customerId?: string;
  verifiedAt?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [accessLicense, setAccessLicense] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/keys").then(r => r.json()).then(setKeyStatus);
  }, []);

  async function saveKeys(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLicense, secretKey, customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: "ok", text: "키 저장 + 검증 완료. 이제 키워드 추출 가능." });
      setAccessLicense("");
      setSecretKey("");
      setKeyStatus({ hasKeys: true, customerId, verifiedAt: data.verifiedAt });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function deleteKeys() {
    if (!confirm("키를 삭제하시겠습니까?")) return;
    await fetch("/api/keys", { method: "DELETE" });
    setKeyStatus({ hasKeys: false });
    setMsg({ type: "ok", text: "키가 삭제되었습니다." });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 계정</h1>
        <p className="text-sm text-gray-600 mt-1">네이버 검색광고 API 키를 등록하면 키워드 추출에서 본인 한도를 사용합니다.</p>
      </div>

      {/* 현재 키 상태 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">네이버 검색광고 API 상태</h2>
        {keyStatus === null ? (
          <div className="text-sm text-gray-400">로딩...</div>
        ) : keyStatus.hasKeys ? (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Customer ID:</span> <span className="font-mono">{keyStatus.customerId}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">검증 완료:</span> <span className="text-emerald-600">✓ {keyStatus.verifiedAt ? new Date(keyStatus.verifiedAt).toLocaleString() : ""}</span>
            </div>
            <button onClick={deleteKeys} className="text-xs text-red-600 hover:underline mt-2">키 삭제</button>
            <div className="pt-3">
              <Link href="/" className="inline-block bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-2 rounded-md text-sm">
                키워드 추출 시작 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            아직 키가 등록되지 않았습니다. 아래 폼에서 등록 후 사용하세요.
          </div>
        )}
      </div>

      {/* 키 입력 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-1">키 등록 / 변경</h2>
        <p className="text-sm text-gray-500 mb-4">
          발급 위치: <a href="https://searchad.naver.com" target="_blank" className="text-blue-600 underline">searchad.naver.com</a> → 도구 → API 사용 관리 → 라이센스 발급
        </p>
        <p className="text-xs text-gray-500 mb-4">
          <Link href="/guide" className="underline">📘 키 발급 가이드 보기 (스크린샷 포함)</Link>
        </p>

        <form onSubmit={saveKeys} className="space-y-4">
          <Field label="Access License">
            <input type="text" value={accessLicense} onChange={(e) => setAccessLicense(e.target.value)} required
              placeholder="0100000000..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
          </Field>
          <Field label="Secret Key">
            <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required
              placeholder="AQAAAAB..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
          </Field>
          <Field label="Customer ID">
            <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required
              placeholder="1234567"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
          </Field>
          <button type="submit" disabled={loading}
            className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold px-5 py-2 rounded-md text-sm">
            {loading ? "검증 중..." : "저장 + 검증"}
          </button>
          {msg && (
            <div className={`p-3 rounded text-sm ${msg.type === "ok" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {msg.text}
            </div>
          )}
        </form>

        <div className="text-xs text-gray-500 mt-4 space-y-1 border-t border-gray-100 pt-4">
          <div>🔒 키는 AES-256-GCM 으로 암호화되어 저장됩니다.</div>
          <div>📊 분석 시 본인 키로 호출 → 본인 한도 사용 (분당 60회).</div>
          <div>💸 네이버 측 비용: 보통 무료 한도 내 (광고비 충전 불필요).</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
