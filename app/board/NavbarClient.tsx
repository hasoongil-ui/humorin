'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
// 💡 [수술 1] 현재 경로(/hall-of-fame 등)를 정확히 인식하기 위해 usePathname 추가 도입
import { usePathname, useSearchParams } from 'next/navigation';
import { handleLogoutAction } from './navActions';

const TIER_SYSTEM = [
  { name: '씨앗', min: 0, icon: '🌱', color: 'text-green-600' },
  { name: '새싹', min: 100, icon: '🌿', color: 'text-emerald-600' },
  { name: '잎새', min: 500, icon: '🍃', color: 'text-teal-600' },
  { name: '꽃', min: 2000, icon: '🌸', color: 'text-pink-600' },
  { name: '열매', min: 10000, icon: '🍎', color: 'text-red-600' },
  { name: '나무', min: 50000, icon: '🌳', color: 'text-amber-700' },
  { name: '숲의 전설', min: 200000, icon: '🏞️', color: 'text-yellow-600' }
];

function getTierInfo(points: number) {
  let current = TIER_SYSTEM[0];
  for (let i = TIER_SYSTEM.length - 1; i >= 0; i--) {
    if (points >= TIER_SYSTEM[i].min) {
      current = TIER_SYSTEM[i];
      break;
    }
  }
  return current;
}

interface NavbarClientProps {
  initialUser: any;
  initialBoards: any[];
}

interface MenuSubItem {
  name: string;
  link?: string;
  isSpecial?: boolean;
}

interface MenuGroup {
  name: string;
  link?: string;
  isSingle?: boolean;
  sub?: MenuSubItem[];
}

export default function NavbarClient(props: NavbarClientProps) {
  const { initialUser, initialBoards } = props;
  const searchParams = useSearchParams();
  const pathname = usePathname(); // 💡 [수술 1] 현재 경로 추적 엔진 장착

  const currentCategory = searchParams.get('category') || 'all';
  const bestType = searchParams.get('best') || '';

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkScrollState = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 1);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  const scrollByArrow = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const [hoveredMenuId, setHoveredMenuId] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>, menuId: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    const rect = event.currentTarget.getBoundingClientRect();
    setMenuRect(rect);
    setHoveredMenuId(menuId);
  };

  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredMenuId(null);
    }, 150);
  };

  useEffect(() => {
    setTimeout(checkScrollState, 100);
    window.addEventListener('resize', checkScrollState);
    return () => {
      window.removeEventListener('resize', checkScrollState);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [initialBoards, checkScrollState]);

  // 💡 [핵심 수술 2: 스마트 오토 스크롤] 메뉴가 새로 태어나도, 파란불 켜진 메뉴를 찾아 화면 정중앙으로 자동 스크롤시킴!
  useEffect(() => {
    if (mounted && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeEl = container.querySelector('.humorin-active-menu') as HTMLElement;
      
      if (activeEl) {
        const containerRect = container.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();

        // 스크롤 영역 밖에 있거나, 페이지가 처음 로드되어 스크롤이 0px(초기화) 상태일 때 강제로 중앙으로 끌고 옴
        if (elRect.left < containerRect.left || elRect.right > containerRect.right || container.scrollLeft === 0) {
          const scrollPos = activeEl.offsetLeft - (container.offsetWidth / 2) + (activeEl.offsetWidth / 2);
          container.scrollTo({ left: scrollPos, behavior: 'smooth' });
        }
      }
    }
  }, [pathname, currentCategory, bestType, mounted]);

  const user = initialUser ? { nickname: initialUser.nickname, level: initialUser.level, points: Number(initialUser.points) || 0 } : null;

  const tierInfo = getTierInfo(user ? user.points : 0);

  const groupsMap: Record<string, any[]> = {};

  if (initialBoards && initialBoards.length > 0) {
    initialBoards.forEach((b: any) => {
      if (!groupsMap[b.group_name]) groupsMap[b.group_name] = [];
      groupsMap[b.group_name].push({ name: b.name, link: `/board?category=${b.name}` });
    });
  }

  const menuGroups: MenuGroup[] = [
    { name: '전체글 보기', link: '/board', isSingle: true },
    { name: '🔥투데이 베스트', link: '/board?best=today', isSingle: true },
    {
      name: '명예의 전당', sub: [
        { name: '🏆 이주의 VVIP', link: '/hall-of-fame', isSpecial: true },
        { name: '🏛️ 명작 쇼케이스', link: '/board?best=showcase' },
        { name: '💯 백베스트', link: '/board?best=100' },
        { name: '👑 천베스트', link: '/board?best=1000' }
      ]
    },
    ...Object.keys(groupsMap).map(groupName => ({ name: groupName, sub: groupsMap[groupName] }))
  ];

  const mobileFlatList = [
    { name: '전체글 보기', link: '/board' },
    { name: '🔥투데이 베스트', link: '/board?best=today' },
    { name: '🏆 이주의 VVIP', link: '/hall-of-fame' }, 
    { name: '🏛️ 명작 쇼케이스', link: '/board?best=showcase' },
    { name: '💯 백베스트', link: '/board?best=100' },
    { name: '👑 천베스트', link: '/board?best=1000' },
    ...(initialBoards || [])
      .filter(b => !(b.group_name && b.group_name.includes('포럼')))
      .map(b => ({ name: b.name, link: `/board?category=${b.name}` })),
    { name: '💬 전체 포럼 보기', link: '/boards#forum' }
  ];

  const activeGroup = menuGroups.find(g => g.name === hoveredMenuId);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <header className="bg-white px-4 border-b border-gray-200 shadow-sm relative z-30 h-[68px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/" className="shrink-0 flex items-center pt-1"><img src="/logo_final.png" alt="유머.in 로고" style={{
            height: '36px', objectFit: 'contain'
          }} /></Link>
          <div className="flex items-center gap-2 md:gap-4 h-[32px]">
            {user ? (
              <>
                <div className="text-[13px] md:text-[14px] font-medium text-gray-700 hidden sm:flex items-center gap-1.5">
                  <span className={`font-black ${tierInfo.color}`}>{tierInfo.icon} [{tierInfo.name}]</span>
                  <Link href={`/user/${user.nickname}`} className="font-bold text-[#3b4890] hover:underline cursor-pointer tracking-tight">{user.nickname}</Link>
                  <span className="text-rose-500 font-bold text-[13px]">({user.points.toLocaleString()} P)</span>
                </div>
                <div className="flex items-center gap-1.5"><Link href="/profile" className="px-3 py-1.5 bg-[#ebedf5] text-[#3b4890] text-[11px] md:text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shadow-sm shrink-0">내정보</Link><form action={handleLogoutAction}><button type="submit" className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] md:text-xs font-bold rounded-sm hover:bg-gray-200 transition-colors shadow-sm shrink-0">로그아웃</button></form></div>
              </>
            ) : (
              <div className="flex items-center gap-1.5"><Link href="/login" className="px-4 py-1.5 bg-[#ebedf5] text-[#3b4890] text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shrink-0">로그인</Link><Link href="/signup" className="px-4 py-1.5 bg-[#2a3042] text-white text-xs font-bold rounded-sm hover:bg-gray-900 transition-colors shrink-0">회원가입</Link></div>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-[#414a66] text-gray-200 shadow-md relative z-20 min-h-[48px] md:min-h-[52px]">
        <div className="max-w-[1200px] mx-auto relative group flex">
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#414a66] via-[#414a66]/80 to-transparent z-40 flex items-center pointer-events-none">
              <button onClick={() => scrollByArrow('left')} className="w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center ml-2 pointer-events-auto transition-all shadow-lg active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg></button>
            </div>
          )}
          {showRightArrow && (
            <div className="absolute right-[80px] top-0 bottom-0 w-20 bg-gradient-to-l from-[#414a66] via-[#414a66]/80 to-transparent z-40 flex items-center justify-end pointer-events-none">
              <button onClick={() => scrollByArrow('right')} className="w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center mr-1 pointer-events-auto transition-all shadow-lg active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" /></svg></button>
            </div>
          )}

          <div ref={scrollContainerRef} onScroll={checkScrollState} className="flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar relative py-0.5 w-full">
            <div className="w-2 shrink-0 md:hidden"></div>

            {mobileFlatList.map((item) => {
              // 💡 [핵심 수술 3] VVIP 등 특수 메뉴도 완벽하게 활성화 불이 들어오도록 경로 인식 엔진 장착!
              let isActive = false;
              if (item.name === '전체글 보기') isActive = (pathname === '/board' || pathname === '/') && currentCategory === 'all' && bestType === '';
              else if (item.name === '🔥투데이 베스트') isActive = bestType === 'today';
              else if (item.name === '🏆 이주의 VVIP') isActive = !!pathname?.includes('/hall-of-fame'); 
              else if (item.name === '🏛️ 명작 쇼케이스') isActive = bestType === 'showcase';
              else if (item.name === '💯 백베스트') isActive = bestType === '100';
              else if (item.name === '👑 천베스트') isActive = bestType === '1000';
              else if (item.name === '💬 전체 포럼 보기') isActive = false;
              else isActive = currentCategory === item.name;

              // 💡 타겟팅을 위한 humorin-active-menu 클래스 삽입
              const activeClass = isActive ? 'bg-[#2a3042] text-white humorin-active-menu' : 'hover:bg-[#5b6586] hover:text-white';

              return (
                <Link key={`mob-${item.name}`} href={item.link} className={`flex md:hidden shrink-0 px-4 py-3.5 text-[13px] font-bold transition-colors ${activeClass}`}>
                  {item.name}
                </Link>
              );
            })}

            {menuGroups.map((group: any) => {
              if (group.isSingle) {
                let isActive = false;
                if (group.name === '전체글 보기') isActive = (pathname === '/board' || pathname === '/') && currentCategory === 'all' && bestType === '';
                if (group.name === '🔥투데이 베스트') isActive = bestType === 'today';
                
                const activeClass = isActive ? 'bg-[#2a3042] text-white humorin-active-menu' : 'hover:bg-[#5b6586] hover:text-white';

                return (
                  <Link key={`pc-${group.name}`} href={group.link!} className={`hidden md:inline-block shrink-0 px-5 py-4 text-[13px] sm:text-sm font-bold transition-colors ${activeClass}`}>
                    {group.name}
                  </Link>
                );
              }

              // 💡 [핵심 수술 4] PC 버전에서도 하위 메뉴가 활성화되면 부모 그룹 버튼에 불이 켜지고 타겟팅 되도록 연동
              const isGroupActive = group.sub?.some((subItem: any) => {
                if (subItem.name === '🏆 이주의 VVIP') return !!pathname?.includes('/hall-of-fame');
                if (subItem.name === '🏛️ 명작 쇼케이스') return bestType === 'showcase';
                if (subItem.name === '💯 백베스트') return bestType === '100';
                if (subItem.name === '👑 천베스트') return bestType === '1000';
                return currentCategory === subItem.name;
              });

              const activeClass = isGroupActive ? 'bg-[#2a3042] text-white humorin-active-menu' : 'hover:bg-[#5b6586] hover:text-white';

              return (
                <div key={`pc-${group.name}`} className="hidden md:inline-block group shrink-0" onMouseEnter={(e) => handleMouseEnter(e, group.name)} onMouseLeave={handleMouseLeave}>
                  <button className={`px-5 py-4 text-[13px] sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeClass}`}>
                    {group.name}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5 opacity-60 group-hover:rotate-180 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                </div>
              );
            })}

            <div className="w-24 shrink-0 md:hidden"></div>
            <div className="w-28 shrink-0 hidden md:block"></div>
          </div>

          <Link href="/boards" className="absolute right-0 top-0 bottom-0 bg-[#414a66] h-full px-4 flex items-center text-[13px] font-black text-yellow-400 hover:text-white transition-colors shadow-[-15px_0_15px_-5px_rgba(65,74,102,1)] z-50 shrink-0 border-l border-[#5b6586]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            전체
          </Link>
        </div>
      </nav>

      <div className="hidden md:block">
        {mounted && hoveredMenuId && menuRect && activeGroup && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed bg-white border border-gray-200 shadow-2xl rounded-b-sm overflow-hidden z-[9999]"
            style={{
              left: `${menuRect.left}px`, top: `${menuRect.bottom}px`, width: `${menuRect.width < 200 ? 200 : menuRect.width}px`
            }}
            onMouseEnter={() => {
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            }}
            onMouseLeave={handleMouseLeave}
          >
            {activeGroup.sub?.map((subItem: any) => {
              // 💡 [핵심 수술 5] 포탈 하위 메뉴 드롭다운에서도 완벽하게 VVIP 활성화를 잡아냄!
              const isActive = subItem.name === '🏆 이주의 VVIP' ? !!pathname?.includes('/hall-of-fame') :
                               subItem.name === '🏛️ 명작 쇼케이스' ? bestType === 'showcase' :
                               subItem.name === '💯 백베스트' ? bestType === '100' :
                               subItem.name === '👑 천베스트' ? bestType === '1000' :
                               currentCategory === subItem.name;
              
              const link = subItem.link || `/board?category=${subItem.name}`;

              if (subItem.isSpecial) {
                return (
                  <Link key={subItem.name} href={link} className={`flex items-center justify-between px-5 py-3 text-[13px] font-bold border-b border-gray-100 hover:bg-yellow-50/50 cursor-pointer group bg-gradient-to-r from-white to-yellow-50/30 transition-colors last:border-0 ${isActive ? 'bg-yellow-50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`${isActive ? 'text-yellow-700' : 'text-gray-800'} group-hover:text-yellow-600 transition-colors`}>{subItem.name}</span>
                    </div>
                  </Link>
                );
              }

              return (
                <Link key={subItem.name} href={link} className={`block px-5 py-3 text-[13px] font-bold border-b border-gray-100 transition-colors last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#3b4890]'}`}>
                  {subItem.name}
                </Link>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    </>
  );
}