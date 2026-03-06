'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NavbarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bestType = searchParams.get('best') || '';
  const category = searchParams.get('category') || 'all';

  // 💡 미나의 업데이트: 이웃님들이 부동산 수다를 떨 수 있는 '부동산 사랑방'을 추가했습니다!
  const menus = [
    { name: '🔥 투데이 베스트', link: '/board?best=today' },
    { name: '전체글 보기', link: '/board' },
    { name: '👋 인사 한마디', link: '/board?category=인사 한마디' },
    { name: '☕ 일상', link: '/board?category=일상' },
    { name: '😊 유머', link: '/board?category=유머' },
    { name: '💖 감동', link: '/board?category=감동' },
    { name: '🏘️ 부동산 사랑방', link: '/board?category=부동산 사랑방' }, // 👈 새로 추가된 사랑방!
    { name: '💬 그냥 혼잣말', link: '/board?category=그냥 혼잣말' },
    { name: '👏 묻지마 격려', link: '/board?category=묻지마 격려' },
    { name: '💡 이거 알려주세요', link: '/board?category=이거 알려주세요' },
    { name: '💯 백베스트', link: '/board?best=100' }, 
    { name: '👑 천베스트', link: '/board?best=1000' },
  ];

  const handleRealEstateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // 💡 차가운 '회원전용' 대신, 따뜻하고 다정한 안내 문구로 로그인/가입을 유도합니다!
    if (confirm('오재미의 따뜻한 이웃이 되어주세요! 💖\n로그인하시면 유용한 부동산 실거래 조회를 무료로 이용하실 수 있습니다.\n\n로그인 화면으로 이동할까요?')) {
      router.push('/login');
    }
  };

  return (
    <>
      <header className="bg-white p-4 border-b border-gray-200 shadow-sm relative z-10">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/board" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>
          
          {/* 💡 미나의 야심작: 시선이 가장 잘 가는 우측 상단에 다정한 조회기 버튼 배치! */}
          <button 
            onClick={handleRealEstateClick}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[13px] md:text-sm font-bold rounded-sm transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span className="text-lg">🏠</span> 
            <span className="hidden md:inline">부동산 실거래 조회</span>
            <span className="md:hidden">실거래 조회</span>
          </button>
        </div>
      </header>

      {/* 💡 메뉴가 많아져서 모바일에서도 쾌적하게 옆으로 밀어볼 수 있게 스크롤 마법을 살짝 걸었습니다! */}
      <nav className="bg-[#414a66] text-gray-200 shadow-md overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="max-w-[1200px] mx-auto flex items-center px-2 md:px-0">
          {menus.map((menu) => {
            const isActive = (category !== 'all' && menu.name.includes(category)) || 
                             (bestType === 'today' && menu.name.includes('투데이')) ||
                             (bestType === '100' && menu.name.includes('백베스트')) ||
                             (bestType === '1000' && menu.name.includes('천베스트')) ||
                             (category === 'all' && bestType === '' && menu.name === '전체글 보기');
            return (
              <Link href={menu.link} key={menu.name} 
                className={`px-3 md:px-4 py-3 text-[13px] md:text-sm font-bold transition-colors inline-block ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
                {menu.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<div className="h-24 bg-[#414a66] animate-pulse"></div>}>
      <NavbarContent />
    </Suspense>
  );
}