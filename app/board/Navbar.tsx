'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getUserProfile, handleLogoutAction, getDynamicBoards } from './navActions';

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

function NavbarContent() {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  const bestType = searchParams.get('best') || '';

  const [user, setUser] = useState<{ nickname: string; level: string; points: number } | null>(null);
  const [tierInfo, setTierInfo] = useState(TIER_SYSTEM[0]);
  const [dynamicMenus, setDynamicMenus] = useState<any[]>([]); 

  useEffect(() => {
    // 💡 에러 1 해결: (data: any) 라고 정체를 강제로 지정해서 컴퓨터의 의심을 없앱니다!
    getUserProfile().then((data: any) => {
      if (data) {
        setUser({
          nickname: data.nickname,
          level: data.level,
          points: Number(data.points) || 0
        });
        setTierInfo(getTierInfo(Number(data.points) || 0));
      }
    });

    // 💡 여기도 (boards: any[]) 라고 확실하게 알려줍니다!
    getDynamicBoards().then((boards: any[]) => {
      if (boards && boards.length > 0) {
        const groupsMap: Record<string, any[]> = {};
        boards.forEach((b: any) => {
          if (!groupsMap[b.group_name]) groupsMap[b.group_name] = [];
          groupsMap[b.group_name].push({
            name: b.name,
            link: `/board?category=${b.name}`,
            isSpecial: b.name === '게시판 신설 요청' 
          });
        });

        const formattedGroups = Object.keys(groupsMap).map(groupName => ({
          name: groupName,
          sub: groupsMap[groupName]
        }));
        setDynamicMenus(formattedGroups);
      }
    });
  }, []);

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

  return (
    <>
      <header className="bg-white p-4 border-b border-gray-200 shadow-sm relative z-20">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-black text-[#3b4890] tracking-tighter">OJEMI</Link>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <div className="text-[13px] md:text-[14px] font-medium text-gray-700 hidden sm:flex items-center gap-1.5">
                  <span className={`font-black ${tierInfo.color}`}>
                    {tierInfo.icon} [{tierInfo.name}]
                  </span>
                  <Link href={`/user/${user.nickname}`} className="font-bold text-[#3b4890] hover:underline cursor-pointer">
                    {user.nickname}
                  </Link>
                  <span className="text-rose-500 font-bold text-[13px]">({user.points.toLocaleString()} P)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href="/profile" className="px-3 py-1.5 bg-[#ebedf5] text-[#3b4890] text-[11px] md:text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shadow-sm">
                    내정보
                  </Link>
                  <form action={handleLogoutAction}>
                    <button type="submit" className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] md:text-xs font-bold rounded-sm hover:bg-gray-200 transition-colors shadow-sm">
                      로그아웃
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="px-4 py-1.5 bg-[#ebedf5] text-[#3b4890] text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors">
                  로그인
                </Link>
                <Link href="/signup" className="px-4 py-1.5 bg-[#2a3042] text-white text-xs font-bold rounded-sm hover:bg-gray-900 transition-colors">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-[#414a66] text-gray-200 shadow-md relative z-10">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center">
          {menuGroups.map((group: any) => { // 💡 혹시 모를 에러 방지용 (group: any) 추가!
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
                  {/* 💡 에러 2 해결: (subItem: any) 라고 정체를 알려줍니다! */}
                  {group.sub?.map((subItem: any) => { 
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

                    const isActive = currentCategory === subItem.name;
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