import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import HeaderUser from "./components/HeaderUser";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "마이크로키워드추출기",
  description: "사장님 업체용 키워드 200~500개를 5분만에",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-gray-900 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center h-14">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-mono">μ</span>
              마이크로키워드추출기
            </Link>
            <nav className="hidden md:flex items-center gap-6 ml-10 text-sm text-gray-300">
              <Link href="/" className="hover:text-white">키워드 추출</Link>
              <Link href="/dashboard" className="hover:text-white">내 계정</Link>
              <Link href="/guide" className="hover:text-white">가이드</Link>
            </nav>
            <div className="ml-auto">
              <HeaderUser />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-gray-100 border-t border-gray-200 py-4 text-xs text-gray-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>마이크로키워드추출기 · 강의 졸업생 영업 활동용 무료 도구</span>
            <span className="text-gray-400">·</span>
            <Link href="/privacy" className="hover:text-gray-900">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-900">이용약관</Link>
            <Link href="/guide" className="hover:text-gray-900">사용 가이드</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
