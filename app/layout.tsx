import type { Metadata } from "next";
import Link from "next/link"; 
import "./globals.css";
import CopyProtection from "./components/CopyProtection";

const siteTitle = "오재미 (OJEMI)";
const siteDescription = "유머, 감동, 지식, 일상이 살아 숨 쉬는 커뮤니티 오재미입니다.";
const siteUrl = "https://www.ojemi.kr";

// 💡 [SEO 수술 완벽 적용] 네이버 서치어드바이저 100점 만점을 위한 풀세트 장착!
export const metadata: Metadata = {
  // 1. 기본 메타데이터 (페이지 제목, 설명)
  title: siteTitle,
  description: siteDescription,
  keywords: ["오재미", "오제미", "ojemi", "커뮤니티", "유머", "감동", "포럼"],
  manifest: "/manifest.json", 
  
  // 2. 구글 & 네이버 소유확인 명찰
  verification: {
    google: "3aIk8mNr5N-uh1qZIVo9F6PUpio0bAh9tsDIMQiTG3o", 
    other: {
      "naver-site-verification": "8c8cd4db2f2b39e98404ffa41a05e2aea08cb455",
    },
  },

  // 3. 🚀 네이버가 가장 좋아하는 오픈 그래프(Open Graph) 정석 문법!
  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: siteTitle,
    locale: "ko_KR",
    images: [
      {
        url: `${siteUrl}/og-image.png`, // 절대 경로로 명시해야 봇이 헷갈리지 않습니다.
        width: 1200,
        height: 630,
        alt: "오재미 커뮤니티 썸네일",
      },
    ],
  },

  // 4. 🐦 덤으로 트위터(X) 카드까지 완벽 셋팅 (이걸 해두면 공유 파급력이 다릅니다)
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [`${siteUrl}/og-image.png`],
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
        <CopyProtection />
        <div id="ad-space-top" className="w-full"></div>
        <div className="flex-grow">
          {children}
        </div>
        <div id="ad-space-bottom" className="w-full mt-10"></div>
        <footer className="bg-[#f8f9fa] border-t border-gray-200 mt-10 py-8 shrink-0">
          <div className="max-w-[1000px] mx-auto px-4 md:px-8">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mb-4 text-[13px] font-bold text-gray-600">
              <Link href="/terms" className="hover:text-[#3b4890] hover:underline transition-colors">이용약관</Link>
              <span className="text-gray-300">|</span>
              <Link href="/privacy" className="text-gray-800 hover:text-[#3b4890] hover:underline transition-colors">개인정보처리방침</Link>
              <span className="text-gray-300">|</span>
              <Link href="/youth" className="hover:text-[#3b4890] hover:underline transition-colors">청소년보호정책</Link>
              <span className="text-gray-300">|</span>
              <Link href="/contact" className="hover:text-[#3b4890] hover:underline transition-colors">버그신고 및 문의</Link>
            </div>
            <div className="text-[12px] text-gray-500 font-medium leading-relaxed text-center md:text-left">
              <p className="mb-2">
                본 사이트(오재미)는 유저가 작성한 게시물에 대한 법적 책임을 지지 않습니다. 모든 게시물의 저작권과 책임은 작성자 본인에게 있습니다.<br className="hidden md:block" />
                권리 침해나 불법 게시물을 발견하셨을 경우, 관리자 메일(<Link href="/contact" className="font-bold hover:underline">ruffian71@naver.com</Link>)로 연락 주시면 신속히 조치하겠습니다.
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