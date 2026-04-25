import Link from 'next/link';
import { Home } from 'lucide-react';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 💡 미나의 네비게이션 바: 화면 스크롤을 내려도 상단에 딱 붙어있게(sticky) 설정했습니다! */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-gray-700 hover:text-[#414a66] transition-colors font-bold text-sm md:text-base"
          >
            <Home size={18} />
            <span>유머인 메인으로 돌아가기</span>
          </Link>
        </div>
      </div>

      {/* 기존 내 정보(page.tsx) 내용이 안전하게 들어가는 본문 영역 */}
      <main className="w-full bg-white min-h-screen">
        {children}
      </main>
    </div>
  );
}