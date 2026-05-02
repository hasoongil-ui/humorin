import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import CopyProtection from "./components/CopyProtection";

const siteTitle = "유머인 - 오늘의 재미, 유머 커뮤니티";
const siteDescription = "매일 업데이트되는 유머, 감동, 지식, 최신 이슈가 살아 숨 쉬는 종합 커뮤니티입니다. 오늘의 재미, 유머인에서 만나보세요.";
const siteUrl = "https://www.humorin.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  referrer: 'same-origin',

  title: {
    default: siteTitle,
    template: "%s | 유머인",
  },
  description: siteDescription,
  keywords: [
    "유머인", "오늘의재미", "유머", "이슈", "감동", "포럼", "커뮤니티", "유머인사이트", "humorin"
  ],
  manifest: "/manifest.json",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    google: "3aIk8mNr5N-uh1qZIVo9F6PUpio0bAh9tsDIMQiTG3o",
    other: {
      "naver-site-verification": "8c8cd4db2f2b39e98404ffa41a05e2aea08cb455",
    },
  },

  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "유머인",
    locale: "ko_KR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "유머인 로고",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  
  // 👇 바로 이 부분만 캐시 폭파용 꼬리표(?v=2)를 달았습니다!
  icons: {
    icon: '/favicon.ico?v=2',
    apple: '/apple-touch-icon.png?v=2', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "유머인",
    "alternateName": ["HUMORIN", "유머인 커뮤니티", "오늘의재미"],
    "url": siteUrl,
  };

  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
                본 사이트(유머인)는 유저가 작성한 게시물에 대한 법적 책임을 지지 않습니다. 모든 게시물의 저작권과 책임은 작성자 본인에게 있습니다.<br className="hidden md:block" />
                권리 침해나 불법 게시물을 발견하셨을 경우, 관리자 메일(<Link href="/contact" className="font-bold hover:underline">ruffian71@naver.com</Link>)로 연락 주시면 신속히 조치하겠습니다.
              </p>
              <p className="font-bold text-gray-400">
                © {new Date().getFullYear()} HUMORIN. All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}