import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
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
  // 💡 이곳(메타 키워드)이 다양한 검색어 조합을 잡는 핵심 전초기지입니다. (100% 정상)
  keywords: [
    "유머인", "오늘의재미", "유머", "이슈", "감동", "포럼", "커뮤니티", "유머인사이트", "humorin", "humorin.kr"
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
        alt: "유머인 공식 로고",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  
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
  
  // 🚨 [어뷰징 0% - 네이버/구글 통합 강제 인식 스키마]
  // 1. WebSite: 일반적인 웹사이트 정보 제출 (구글용)
  // 2. Organization: 공식 브랜드/기관임을 증명하여 "유머인"을 고유명사로 강제 인식 (네이버용)
  // ※ alternateName에는 어뷰징 꼬투리를 잡히지 않도록 오직 '영문 도메인/명칭'만 삽입.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "유머인", 
        "alternateName": ["humorin", "humorin.kr"], 
        "description": siteDescription,
        "inLanguage": "ko-KR"
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "유머인",
        "alternateName": ["humorin", "humorin.kr"],
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/og-image.png`
        }
      }
    ]
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
        
        {/* 구글 애널리틱스 (GA4) 추적 코드 시작 */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-5NB2SJYB5R`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-5NB2SJYB5R');
            `,
          }}
        />
        {/* 구글 애널리틱스 (GA4) 추적 코드 끝 */}

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
              {/* 상표권 보호 문구 추가 */}
              <p className="text-[11px] text-gray-400 mt-1">
                '유머인'과 'HUMOR IN'은 정식으로 상표권 보호를 받는 소중한 브랜드입니다. 올바른 브랜드 가치를 지켜주셔서 감사합니다.
              </p>
            </div>
          </div>
        </footer>

        {/* 🚀 [신규 패치] PWA 서비스 워커 등록 엔진 */}
        <Script
          id="pwa-sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('🚀 PWA 서비스 워커 가동 완료: ', registration.scope);
                    },
                    function(err) {
                      console.log('🚨 PWA 서비스 워커 등록 실패: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}