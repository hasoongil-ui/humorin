import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OJEMI - 오재미",
  description: "최고의 명품 청정 커뮤니티",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-100 font-sans flex flex-col min-h-screen">
        
        {/* 💰 [미래를 위한 투명 구조] 상단 광고 자리 (지금은 높이가 0이라 유저 눈에 절대 안 보입니다) */}
        <div id="ad-space-top" className="w-full"></div>
        
        {/* 진짜 사이트 내용이 들어가는 곳 */}
        <div className="flex-grow">
          {children}
        </div>
        
        {/* 💰 [미래를 위한 투명 구조] 하단 광고 자리 (지금은 투명 상태입니다) */}
        <div id="ad-space-bottom" className="w-full mt-10"></div>

        {/* 광고 티 안 나는 깔끔하고 순수한 하단 카피라이트 */}
        <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-200">
          © 2026 OJEMI. All rights reserved.
        </footer>

      </body>
    </html>
  );
}