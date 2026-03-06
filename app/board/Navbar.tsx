'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NavbarContent() {
  const searchParams = useSearchParams();
  const bestType = searchParams.get('best') || '';
  const category = searchParams.get('category') || 'all';

  // 💡 미나의 완벽한 메뉴 개편: 공포/핫뉴스를 지우고, 이웃님들을 위한 따뜻한 공간 3곳을 추가했습니다!
  const menus = [
    { name: '🔥 투데이 베스트', link: '/board?best=today' },
    { name: '전체글 보기', link: '/board' },
    { name: '👋 인사 한마디', link: '/board?category=인사 한마디' },
    { name: '☕ 일상', link: '/board?category=일상' },
    { name: '😊 유머', link: '/board?category=유머' },
    { name: '💖 감동', link: '/board?category=감동' },
    { name: '💬 그냥 혼잣말', link: '/board?category=그냥 혼잣말' },
    { name: '👏 묻지마 격려', link: '/board?category=묻지마 격려' },
    { name: '💡 이거 알려주세요', link: '/board?category=이거 알려주세요' },
    { name: '💯 백베스트', link: '/board?best=100' }, 
    { name: '👑 천베스트', link: '/board?best=1000' },
  ];

  return (
    <>
      <header className="bg-white p-4 border-b border-gray-200 shadow-sm relative z-10">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/board" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-[#414a66] text-gray-200 shadow-md">
        <div className="max-w-[1200px] mx-auto flex flex-wrap">
          {menus.map((menu) => {
            const isActive = (category !== 'all' && menu.name.includes(category)) || 
                             (bestType === 'today' && menu.name.includes('투데이')) ||
                             (bestType === '100' && menu.name.includes('백베스트')) ||
                             (bestType === '1000' && menu.name.includes('천베스트')) ||
                             (category === 'all' && bestType === '' && menu.name === '전체글 보기');
            return (
              <Link href={menu.link} key={menu.name} 
                className={`px-4 py-3 text-sm font-bold transition-colors ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
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