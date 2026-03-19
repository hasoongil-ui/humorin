import type { Metadata } from "next";
import Link from "next/link"; // 💡 [추가] 하단 메뉴 이동을 위한 Link 컴포넌트 불러오기
import "./globals.css";

// 💡 [SEO 수술 완벽 적용] 타이틀, 설명, 그리고 '구글 & 네이버 소유확인 명찰' 완벽 장착!
export const metadata: Metadata = {
  title: "오재미 (OJEMI)",
  description: "유머, 감동, 지식, 일상이 살아 숨 쉬는 커뮤니티 오재미입니다.",
  keywords: ["오재미", "오제미", "ojemi", "커뮤니티", "유머", "감동", "포럼"],
  manifest: "/manifest.json", // 고화질 앱 아이콘을 위한 매니페스트 연결 완료!
  
  // 🛡️ 구글 & 네이버 검색 로봇 전용 소유확인 쌍끌이 명찰
  verification: {
    google: "3aIk8mNr5N-uh1qZIVo9F6PUpio0bAh9tsDIMQiTG3o", // 💡 [추가] 구글 명찰
    other: {
      "naver-site-verification": "8c8cd4db2f2b39e98404ffa41a05e2aea08cb455",
    },
  },
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

        {/* 🛡️ [법적 보호 장착] 클리앙 벤치마킹 & 대표님 전용 이메일이 들어간 전문 Footer */}
        <footer className="bg-[#f8f9fa] border-t border-gray-200 mt-10 py-8 shrink-0">
          <div className="max-w-[1000px] mx-auto px-4 md:px-8">
            
            {/* 링크 메뉴 */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mb-4 text-[13px] font-bold text-gray-600">
              <Link href="/terms" className="hover:text-[#3b4890] hover:underline transition-colors">이용약관</Link>
              <span className="text-gray-300">|</span>
              <Link href="/privacy" className="text-gray-800 hover:text-[#3b4890] hover:underline transition-colors">개인정보처리방침</Link>
              <span className="text-gray-300">|</span>
              <Link href="/youth" className="hover:text-[#3b4890] hover:underline transition-colors">청소년보호정책</Link>
              <span className="text-gray-300">|</span>
              <a href="mailto:ruffian71@naver.com" className="hover:text-[#3b4890] hover:underline transition-colors">버그신고 및 문의</a>
            </div>

            {/* 법적 책임 고지 및 카피라이트 */}
            <div className="text-[12px] text-gray-500 font-medium leading-relaxed text-center md:text-left">
              <p className="mb-2">
                본 사이트(오재미)는 유저가 작성한 게시물에 대한 법적 책임을 지지 않습니다. 모든 게시물의 저작권과 책임은 작성자 본인에게 있습니다.<br className="hidden md:block" />
                권리 침해나 불법 게시물을 발견하셨을 경우, 관리자 메일(<a href="mailto:ruffian71@naver.com" className="font-bold hover:underline">ruffian71@naver.com</a>)로 연락 주시면 신속히 조치하겠습니다.
              </p>
              <p className="font-bold text-gray-400">
                © {new Date().getFullYear()} OJEMI. All Rights Reserved.
              </p>
            </div>

          </div>
        </footer>

      </body>
    </html>
  );
}