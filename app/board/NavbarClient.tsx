'use client';

// 💡 [수정] React hooks 추가 (화살표 슬라이딩 로직 작동을 위함)
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { handleLogoutAction } from './navActions';

// ... (TIER_SYSTEM, getTierInfo, NavbarClientProps 정의는 그대로 유지)

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

  // 💡 [수정] 가로 스크롤 슬라이딩을 위한 React Hooks 핵심 뼈대
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // 💡 [수정] 지능형 화살표 노출 여부 계산 엔진
  const checkScrollState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      // 약간의 오차 범위를 두어 계산 (1px)
      setShowLeftArrow(scrollLeft > 1);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // 💡 [수정] 화살표 클릭 시 실제 슬라이딩 함수 (behavior: 'smooth'로 세련된 이동)
  const scrollByArrow = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.8; // 한 번 클릭 시 화면 너비의 80% 이동
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // 💡 [수정] 게시판 로딩 직후 및 창 크기 조절 시 화살표 상태 업데이트
  useEffect(() => {
    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    return () => window.removeEventListener('resize', checkScrollState);
  }, [initialBoards]); // 게시판 목록이 바뀌면 다시 계산

  const user = initialUser ? {
    nickname: initialUser.nickname,
    level: initialUser.level,
    points: Number(initialUser.points) || 0
  } : null;
  
  const tierInfo = getTierInfo(user ? user.points : 0);

  const groupsMap: Record<string, any[]> = {};
  if (initialBoards && initialBoards.length > 0) {
    initialBoards.forEach((b: any) => {
      if (!groupsMap[b.group_name]) groupsMap[b.group_name] = [];
      groupsMap[b.group_name].push({
        name: b.name,
        link: `/board?category=${b.name}`,
        isSpecial: b.name === '게시판 신설 요청' 
      });
    });
  }

  const dynamicMenus = Object.keys(groupsMap).map(groupName => ({
    name: groupName,
    sub: groupsMap[groupName]
  }));

  const staticGroups = [
    { name: '전체글 보기', link: '/board', isSingle: true },
    { name: '🔥투데이 베스트', link: '/board?best=today', isSingle: true },
    {
      name: '명예의 전당',
      sub: [
        { name: '💯 백베스트', link: '/board?best=100' },
        { name: '👑 천베스트', link: '/board?best=1000' },
      ]
    }
  ];

  const menuGroups = [...staticGroups, ...dynamicMenus];

  // 모바일 메뉴 배열 구성
  const mobileMenus = [
    { name: '전체글 보기', link: '/board' },
    { name: '🔥투데이', link: '/board?best=today' },
    { name: '💯백베스트', link: '/board?best=100' },
    { name: '👑천베스트', link: '/board?best=1000' },
  ];
  
  dynamicMenus.forEach(group => {
    group.sub?.forEach((subItem: any) => {
      mobileMenus.push(subItem);
    });
  });

  return (
    <>
      {/* 지저분한 스크롤바 숨기기 CSS 전용 클래스 (세련미 필수) */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Header 영역 디자인 (실패 이미지 분석 후 레이아웃 분리 강화) */}
      <header className="bg-white px-4 border-b border-gray-200 relative z-30 h-[68px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/" className="shrink-0 flex items-center pt-1">
            <img src="/logo_final.png" alt="유머.in 로고" style={{ height: '36px', objectFit: 'contain' }} />
          </Link>

          <div className="flex items-center gap-2 md:gap-4 h-[32px]">
            {user ? (
              <>
                <div className="text-[13px] md:text-[14px] font-medium text-gray-700 hidden sm:flex items-center gap-1.5">
                  <span className={`font-black ${tierInfo.color}`}>{tierInfo.icon} [{tierInfo.name}]</span>
                  <Link href={`/user/${user.nickname}`} className="font-bold text-[#3b4890] hover:underlinecursor-pointer">{user.nickname}</Link>
                  <span className="text-rose-500 font-bold text-[13px]">({user.points.toLocaleString()} P)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href="/profile" className="px-3 py-1.5 bg-[#ebedf5] text-[#3b4890] text-[11px] md:text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shadow-sm shrink-0">내정보</Link>
                  <form action={handleLogoutAction}><button type="submit" className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] md:text-xs font-bold rounded-sm hover:bg-gray-200 transition-colors shadow-sm shrink-0">로그아웃</button></form>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="px-4 py-1.5 bg-[#ebedf5] text-[#3b4890] text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shrink-0">로그인</Link>
                <Link href="/signup" className="px-4 py-1.5 bg-[#2a3042] text-white text-xs font-bold rounded-sm hover:bg-gray-900 transition-colors shrink-0">회원가입</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 💡 [대폭 수정] 대망의 지능형 화살표 슬라이딩 Navigation (개그지 같은 Sticky 제거) */}
      <nav className="bg-[#414a66] text-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] relative z-20 min-h-[48px] md:min-h-[52px]">
        <div className="max-w-[1200px] mx-auto relative group">

          {/* 좌측 화살표 (그라데이션 페이드 + 세련된 SVG 아이콘) */}
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#414a66] via-[#414a66]/80 to-transparent z-40 flex items-center pointer-events-none">
              <button 
                onClick={() => scrollByArrow('left')}
                className="w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center ml-2 pointer-events-auto transition-all shadow-lg active:scale-95"
                aria-label="이전 메뉴 보기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
              </button>
            </div>
          )}

          {/* 우측 화살표 (이토랜드 방식 구현 + 세련미 추가) */}
          {showRightArrow && (
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#414a66] via-[#414a66]/80 to-transparent z-40 flex items-center justify-end pointer-events-none">
              <button 
                onClick={() => scrollByArrow('right')}
                className="w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center mr-2 pointer-events-auto transition-all shadow-lg active:scale-95"
                aria-label="다음 메뉴 보기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" /></svg>
              </button>
            </div>
          )}

          {/* 💡 [핵심 핵심] 실제 메뉴가 가로로 나열되는 스크롤 컨테이너 (ref 장착) */}
          <div 
            ref={scrollContainerRef}
            onScroll={checkScrollState}
            className="flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar py-0.5 relative"
          
          >
            {/* 이토랜드의 [≡ 전체] 버튼을 스크롤 영역 안 맨 앞으로 이동 (더 자연스러움) */}
            <Link href="/boards" className="shrink-0 pl-5 pr-4 py-4 text-[13px] sm:text-sm font-black text-yellow-400 hover:text-white transition-colors flex items-center justify-center whitespace-nowrap border-r border-[#5b6586]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              전체
            </Link>

            {menuGroups.map((group: any) => {
              if (group.isSingle) {
                let isActive = false;
                if (group.name === '전체글 보기') isActive = currentCategory === 'all' && bestType === '';
                if (group.name === '🔥투데이 베스트') isActive = bestType === 'today';

                return (
                  <Link key={group.name} href={group.link!} 
                    className={`shrink-0 px-5 py-4 text-[13px] sm:text-sm font-bold transition-colors ${isActive ? 'bg-[#2a3042] text-white' : 'hover:bg-[#5b6586] hover:text-white'}`}>
                    {group.name}
                  </Link>
                );
              }

              // PC용 드롭다운 메뉴 뼈대는 유지하되, 세련되게 디자인 수정
              return (
                <div key={group.name} className="group relative shrink-0 inline-block">
                  <button className="px-5 py-4 text-[13px] sm:text-sm font-bold transition-colors hover:bg-[#5b6586] hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                    {group.name}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5 opacity-60 group-hover:rotate-180 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  
                  {/* 드롭다운 UI 디자인 대폭 강화 (고급스럽게) */}
                  <div className="absolute left-0 top-full hidden w-56 bg-white border border-gray-200 shadow-2xl group-hover:block rounded-b-sm overflow-hidden z-[100]">
                    {group.sub?.map((subItem: any) => { 
                      if (subItem.isSpecial) {
                        return (
                          <Link key={subItem.name} href={subItem.link} className="w-full text-left block px-5 py-3.5 text-[13px] font-bold border-t-2 border-gray-100 transition-colors bg-rose-50 text-rose-500 hover:bg-rose-100">
                            {subItem.name}
                          </Link>
                        );
                      }

                      const isActive = currentCategory === subItem.name;
                      return (
                        <Link key={subItem.name} href={subItem.link || ''} className={`block px-5 py-3.5 text-[13px] font-bold border-b border-gray-100 transition-colors last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#3b4890]'}`}>
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* 맨 끝 여백 (세련미 디테일) */}
            <div className="w-6 shrink-0"></div>
          </div>
        </div>
      </nav>
    </>
  );
}