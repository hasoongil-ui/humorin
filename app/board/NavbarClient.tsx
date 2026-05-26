'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { handleLogoutAction } from './navActions';

// 💡 [어제 백업본 100% 보존] 따뜻한 식물 티어 시스템
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

export default function NavbarClient(props: NavbarClientProps) {
  const { initialUser, initialBoards } = props;
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  const bestType = searchParams.get('best') || '';

  // 💡 [어제 백업본 100% 보존] 스크롤 화살표 감지 레이더 (절대 건드리지 않음)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

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

  const user = initialUser ? { nickname: initialUser.nickname, level: initialUser.level, points: Number(initialUser.points) || 0 } : null;
  const tierInfo = getTierInfo(user ? user.points : 0);
  
  // PC용 그룹핑 메뉴
  const groupsMap: Record<string, any[]> = {};
  if (initialBoards && initialBoards.length > 0) {
    initialBoards.forEach((b: any) => {
      if (!groupsMap[b.group_name]) groupsMap[b.group_name] = [];
      groupsMap[b.group_name].push({ name: b.name, link: `/board?category=${b.name}`, isSpecial: b.name === '게시판 신설 요청' });
    });
  }
  const dynamicMenus = Object.keys(groupsMap).map(groupName => ({ name: groupName, sub: groupsMap[groupName] }));
  const staticGroups = [{ name: '전체글 보기', link: '/board', isSingle: true }, { name: '🔥투데이 베스트', link: '/board?best=today', isSingle: true }, { name: '명예의 전당', sub: [{ name: '💯 백베스트', link: '/board?best=100' }, { name: '👑 천베스트', link: '/board?best=1000' }] }];
  const menuGroups = [...staticGroups, ...dynamicMenus];

  // 모바일용 플랫 메뉴 (가로 스크롤용)
  const mobileFlatList = [
    { name: '전체글 보기', link: '/board' },
    { name: '🔥투데이 베스트', link: '/board?best=today' },
    { name: '💯 백베스트', link: '/board?best=100' },
    { name: '👑 천베스트', link: '/board?best=1000' },
    ...(initialBoards || []).map(b => ({ name: b.name, link: `/board?category=${b.name}` }))
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <header className="bg-white px-4 border-b border-gray-200 shadow-sm relative z-30 h-[68px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/" className="shrink-0 flex items-center pt-1"><img src="/logo_final.png" alt="유머.in 로고" style={{ height: '36px', objectFit: 'contain' }} /></Link>
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
        <div className="max-w-[1200px] mx-auto relative group">
          
          {/* 좌우 화살표 */}
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

          {/* 💡 [무결점 하이브리드 엔진] 레이더를 단 하나의 박스에만 장착! */}
          <div ref={scrollContainerRef} onScroll={checkScrollState} className="flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar relative py-0.5">
            <div className="w-2 shrink-0 md:hidden"></div>

            {/* 1. 모바일 전용 플랫 메뉴 (md:hidden 으로 PC에선 숨김) */}
            {mobileFlatList.map((item) => {
              let isActive = false;
              if (item.name === '전체글 보기') isActive = currentCategory === 'all' && bestType === '';
              else if (item.name === '🔥투데이 베스트') isActive = bestType === 'today';
              else if (item.name === '💯 백베스트') isActive = bestType === '100';
              else if (item.name === '👑 천베스트') isActive = bestType === '1000';
              else isActive = currentCategory === item.name;

              return (
                <Link key={`mob-${item.name}`} href={item.link} className={`flex md:hidden shrink-0 px-4 py-3.5 text-[13px] font-bold transition-colors ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
                  {item.name}
                </Link>
              );
            })}

            {/* 2. PC 전용 드롭다운 메뉴 (hidden md:inline-block 으로 모바일에선 숨김) */}
            {menuGroups.map((group: any) => {
              if (group.isSingle) {
                let isActive = false;
                if (group.name === '전체글 보기') isActive = currentCategory === 'all' && bestType === '';
                if (group.name === '🔥투데이 베스트') isActive = bestType === 'today';
                return (
                  <Link key={`pc-${group.name}`} href={group.link!} className={`hidden md:inline-block shrink-0 px-5 py-4 text-[13px] sm:text-sm font-bold transition-colors ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
                    {group.name}
                  </Link>
                );
              }
              return (
                <div key={`pc-${group.name}`} className="hidden md:inline-block group shrink-0" onMouseEnter={(e) => handleMouseEnter(e, group.name)} onMouseLeave={handleMouseLeave}>
                  <button className="px-5 py-4 text-[13px] sm:text-sm font-bold transition-colors hover:bg-[#5b6586] hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                    {group.name}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5 opacity-60 group-hover:rotate-180 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                </div>
              );
            })}
            
            <div className="w-24 shrink-0 md:hidden"></div> 
            <div className="w-28 shrink-0 hidden md:block"></div> 
          </div>
          
          <Link href="/boards" className="absolute right-0 top-0 bottom-0 bg-[#414a66] h-full px-4 flex items-center text-[13px] font-black text-yellow-400 hover:text-white transition-colors shadow-[-15px_0_15px_-5px_rgba(65,74,102,1)] z-50 shrink-0 ml-auto border-l border-[#5b6586]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            전체
          </Link>
        </div>
      </nav>

      {/* 💡 [안전장치 2] 모바일에서는 포탈 드롭다운 렌더링을 원천 차단 (스티키 버그 완전 소멸!) */}
      <div className="hidden md:block">
        {hoveredMenuId && menuRect && (
          (() => {
            const currentGroup = dynamicMenus.find(g => g.name === hoveredMenuId);
            if (!currentGroup) return null;
            return createPortal(
              <div className="fixed bg-white border border-gray-200 shadow-2xl rounded-b-sm overflow-hidden z-[9999]" style={{ left: `${menuRect.left}px`, top: `${menuRect.bottom}px`, width: `${menuRect.width < 200 ? 200 : menuRect.width}px` }} onMouseEnter={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }} onMouseLeave={handleMouseLeave}>
                {currentGroup.sub?.map((subItem: any) => { 
                  if (subItem.isSpecial) {
                    return <Link key={subItem.name} href={subItem.link} className="w-full text-left block px-5 py-3 text-[13px] font-bold border-t-2 border-gray-100 transition-colors bg-rose-50 text-rose-500 hover:bg-rose-100">{subItem.name}</Link>;
                  }
                  const isActive = currentCategory === subItem.name;
                  return <Link key={subItem.name} href={subItem.link || ''} className={`block px-5 py-3 text-[13px] font-bold border-b border-gray-100 transition-colors last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#3b4890]'}`}>{subItem.name}</Link>;
                })}
              </div>, document.body
            );
          })()
        )}
      </div>
    </>
  );
}