import type { Metadata } from "next";
import Link from "next/link"; 
import "./globals.css";
import CopyProtection from "./components/CopyProtection";

const siteTitle = "오재미 - 유머, 이슈, 꿀잼 커뮤니티";
const siteDescription = "코미디보다 더 재밌는 곳! 매일 업데이트되는 유머, 감동, 지식, 최신 이슈가 살아 숨 쉬는 종합 커뮤니티 오재미(OJEMI)입니다. 오늘의 재미를 만나보세요.";
const siteUrl = "https://www.ojemi.kr";

// 💡 [SEO 수술 완벽 적용] 네이버/구글 1페이지 탈환을 위한 극한의 메타데이터!
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), // 💡 [핵심] 봇들이 이미지 경로를 헷갈리지 않게 기준점 세팅
  
  // 1. 기본 메타데이터 (제목과 설명에 '커뮤니티'를 팍팍 강조!)
  title: {
    default: siteTitle,
    template: "%s | 오재미 커뮤니티", // 💡 다른 페이지로 이동 시 "게시글 제목 | 오재미 커뮤니티" 로 예쁘게 뜹니다.
  },
  description: siteDescription,
  
  // 💡 [핵심] 코미디언을 이기기 위한 '연관 검색어(꼬리표)' 폭격!
  keywords: [
    "오재미", "오재미 커뮤니티", "오재미 사이트", "오재미 유머", "ojemi", 
    "오늘의재미", "유머", "이슈", "감동", "포럼", "커뮤니티", "꿀잼", "유머게시판"
  ],
  manifest: "/manifest.json", 
  
  // 2. 검색 로봇 프리패스권 (무조건 다 긁어가라고 명령!)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  // 3. 원본 주소 명시 (유사 문서 공격 방어)
  alternates: {
    canonical: "/",
  },
  
  // 4. 구글 & 네이버 소유확인 명찰 (기존 대장님 세팅 완벽 유지!)
  verification: {
    google: "3aIk8mNr5N-uh1qZIVo9F6PUpio0bAh9tsDIMQiTG3o", 
    other: {
      "naver-site-verification": "8c8cd4db2f2b39e98404ffa41a05e2aea08cb455",
    },
  },

  // 5. 🚀 카카오톡, 네이버 블로그 공유 시 뜨는 썸네일(Open Graph)
  openGraph: {
    type: "website",
    title: "오재미 - 유머, 이슈, 꿀잼 커뮤니티",
    description: "유머, 감동, 이슈가 살아 숨 쉬는 커뮤니티 오재미(OJEMI)입니다.",
    url: siteUrl,
    siteName: "오재미 커뮤니티",
    locale: "ko_KR",
    images: [
      {
        url: "/og-image.png", // metadataBase 덕분에 알아서 절대경로로 조립됩니다.
        width: 1200,
        height: 630,
        alt: "오재미 커뮤니티 썸네일",
      },
    ],
  },

  // 6. 🐦 트위터(X) 카드 셋팅
  twitter: {
    card: "summary_large_image",
    title: "오재미 커뮤니티",
    description: siteDescription,
    images: ["/og-image.png"],
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