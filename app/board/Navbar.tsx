'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NavbarContent() {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  const bestType = searchParams.get('best') || '';

  const menuGroups = [
    { 
      name: '전체글 보기', 
      link: '/board',
      isSingle: true 
    },
    { 
      name: '🔥투데이 베스트', 
      link: '/board?best=today',
      isSingle: true 
    },
    {
      name: '명예의 전당',
      sub: [
        { name: '💯 백베스트', link: '/board?best=100' },
        { name: '👑 천베스트', link: '/board?best=1000' },
      ]
    },
    {
      name: '순한 유머 & 감동',
      sub: [
        { name: '😆 웃어요 (유머)', link: '/board?category=유머' },
        { name: '💖 나누고 싶은 감동', link: '/board?category=감동' },
        { name: '☕ 세상사는 이야기', link: '/board?category=세상사는 이야기' },
        { name: '🐾 귀여운 동물들', link: '/board?category=귀여운 동물들' },
        // 💡 [미나 완벽 수정] 클릭 주소도 '흥미로운 이야기'로 완벽 교체 완료!
        { name: '💬 흥미로운 이야기', link: '/board?category=흥미로운 이야기' },
      ]
    },
    {
      name: '따뜻한 다락방',
      sub: [
        { name: '📚 유용한 상식', link: '/board?category=유용한 상식' },
        { name: '🍜 맛집', link: '/board?category=맛집' },
        { name: '🏕️ 가볼만한 곳', link: '/board?category=가볼만한 곳' },
        { name: '🎬 볼만한 영화', link: '/board?category=볼만한 영화' },
        { name: '✨ [게시판 신설 요청]', link: '/board?category=게시판 신설 요청', isSpecial: true },
      ]
    },
    {
      name: '지식 & 정보',
      sub: [
        { name: '💊 건강/의학 정보', link: '/board?category=건강' },
        { name: '💰 재테크/금융', link: '/board?category=재테크' },
      ]
    },
    {
      name: '✒️ 나도 작가',
      sub: [
        { name: '📝 수필/에세이', link: '/board?category=수필/에세이' },
        { name: '✨ 시/단상', link: '/board?category=시/단상' },
        { name: '📚 소설/웹소설', link: '/board?category=소설/웹소설' },
        { name: '🎨 창작/기타', link: '/board?category=창작/기타' },
      ]
    }
  ];

  return (
    <>
      <header className="bg-white p-4 border-b border-gray-200 shadow-sm relative z-20">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-[#414a66] text-gray-200 shadow-md relative z-10">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center">
          {menuGroups.map((group) => {
            if (group.isSingle) {
              let isActive = false;
              if (group.name === '전체글 보기') isActive = currentCategory === 'all' && bestType === '';
              if (group.name === '🔥투데이 베스트') isActive = bestType === 'today';

              return (
                <Link key={group.name} href={group.link!} 
                  className={`px-5 py-3.5 text-sm font-bold transition-colors ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
                  {group.name}
                </Link>
              );
            }

            return (
              <div key={group.name} className="group relative inline-block">
                <button className="px-5 py-3.5 text-sm font-bold transition-colors hover:bg-[#5b6586] hover:text-white flex items-center gap-1">
                  {group.name}
                  <span className="text-[10px] opacity-70">▼</span>
                </button>
                
                <div className="absolute left-0 top-full hidden w-52 bg-white border border-gray-200 shadow-xl group-hover:block rounded-b-sm overflow-hidden z-50">
                  {group.sub?.map((subItem) => {
                    if (subItem.isSpecial) {
                      return (
                        <Link 
                          key={subItem.name} 
                          href={subItem.link}
                          className="w-full text-left block px-4 py-3 text-[13px] font-bold border-t-2 border-gray-100 transition-colors bg-rose-50 text-rose-500 hover:bg-rose-100"
                        >
                          {subItem.name}
                        </Link>
                      );
                    }

                    const isActive = currentCategory === subItem.name.replace(/.*?\s(.*)/, '$1').replace(/\(.*?\)/g, '').trim() || 
                                     (bestType && subItem.link?.includes(bestType));
                    return (
                      <Link 
                        key={subItem.name} 
                        href={subItem.link || ''} 
                        className={`block px-4 py-3 text-[13px] font-bold border-b border-gray-100 transition-colors last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#3b4890]'}`}
                      >
                        {subItem.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
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