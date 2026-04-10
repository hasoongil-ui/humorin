import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import CopyProtection from "./components/CopyProtection";

const siteTitle = "오재미 | 세상의 모든 재미";
const siteDescription = "매일 업데이트되는 유머, 감동, 지식, 최신 이슈가 살아 숨 쉬는 종합 커뮤니티입니다. 오늘의 재미, 오재미에서 만나보세요.";
const siteUrl = "https://www.ojemi.kr";

// 💡 [SEO 수술 완벽 적용] '오재미' 단독 키워드 정조준!
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  referrer: 'same-origin', // 💡 [추가 완료] 에펨코리아 등 외부 이미지 복붙 시 엑스박스 방지 및 내부 보안 유지

  // 1. 기본 메타데이터 ('오재미'를 가장 강력하게 인식시킴)
  title: {
    default: siteTitle,
    template: "%s | 오재미", // 💡 '오재미 커뮤니티'보다 짧고 강렬하게 '오재미'로만 고정
  },
  description: siteDescription,

  // 💡 [핵심] 분산되는 '사이트' 단어 삭제, 오직 '오재미'에 집중
  keywords: [
    "오재미", "유머", "이슈", "감동", "포럼", "커뮤니티", "꿀잼", "유머게시판", "ojemi"
  ],
  manifest: "/manifest.json",

  // 2. 검색 로봇 프리패스권
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  // 3. 원본 주소 명시
  alternates: {
    canonical: "/",
  },

  // 4. 구글 & 네이버 소유확인 명찰
  verification: {
    google: "3aIk8mNr5N-uh1qZIVo9F6PUpio0bAh9tsDIMQiTG3o",
    other: {
      "naver-site-verification": "8c8cd4db2f2b39e98404ffa41a05e2aea08cb455",
    },
  },

  // 5. 🚀 카카오톡, 네이버 블로그 공유 시 뜨는 썸네일(Open Graph)
  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "오재미",
    locale: "ko_KR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "오재미 로고",
      },
    ],
  },

  // 6. 🐦 트위터(X) 카드 셋팅
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
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