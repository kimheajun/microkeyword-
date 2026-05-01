"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HeaderUser() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoaded(true));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (!loaded) return null;

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/dashboard" className="text-gray-300 hover:text-white">
          {user.email}
        </Link>
        <button onClick={logout} className="text-gray-400 hover:text-white text-xs">
          로그아웃
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/login" className="text-gray-300 hover:text-white">로그인</Link>
      <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium">
        졸업생 가입
      </Link>
    </div>
  );
}
