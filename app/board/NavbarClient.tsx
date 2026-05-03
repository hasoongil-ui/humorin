'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

// 💡 [오타 수정 완료] 프롭스(Props) 문법을 가장 안전한 정석 방식으로 변경했습니다!
interface NavbarClientProps {
  initialUser: any;
  initialBoards: any[];
}

export default function NavbarClient(props: NavbarClientProps) {
  const { initialUser, initialBoards } = props;
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  const bestType = searchParams.get('best') || '';

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
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <header className="bg-white px-4 border-b border-gray-200 shadow-sm relative z-20 h-[65px] flex items-center">
        <div className="w-full max-w-[1200px] mx-auto flex justify-between items-center">
          
          {/* 🚨 로고 이미지 파일명(logo_final.png) 및 크기(48px) 완벽 수정 완료 🚨 */}
          <Link href="/" className="shrink-0 flex items-center">
            <img src="/logo_final.png" alt="유머.in 로고" style={{ height: '34px', objectFit: 'contain' }} />
          </Link>

          <div className="flex items-center gap-2 md:gap-4 h-[32px]">
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
                  <Link href="/profile" className="px-3 py-1.5 bg-[#ebedf5] text-[#3b4890] text-[11px] md:text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shadow-sm shrink-0">
                    내정보
                  </Link>
                  <form action={handleLogoutAction}>
                    <button type="submit" className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] md:text-xs font-bold rounded-sm hover:bg-gray-200 transition-colors shadow-sm shrink-0">
                      로그아웃
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="px-4 py-1.5 bg-[#ebedf5] text-[#3b4890] text-xs font-bold rounded-sm hover:bg-[#dce0f0] transition-colors shrink-0">
                  로그인
                </Link>
                <Link href="/signup" className="px-4 py-1.5 bg-[#2a3042] text-white text-xs font-bold rounded-sm hover:bg-gray-900 transition-colors shrink-0">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-[#414a66] text-gray-200 shadow-md relative z-10 min-h-[48px] md:min-h-[52px]">
        <div className="flex md:hidden items-center h-[48px] overflow-x-auto whitespace-nowrap hide-scrollbar px-2">
          {mobileMenus.map((menu: any) => {
            let isActive = false;
            if (menu.name === '전체글 보기') isActive = currentCategory === 'all' && bestType === '';
            else if (menu.name === '🔥투데이') isActive = bestType === 'today';
            else if (menu.name === '💯백베스트') isActive = bestType === '100';
            else if (menu.name === '👑천베스트') isActive = bestType === '1000';
            else isActive = currentCategory === menu.name;

            return (
              <Link 
                key={menu.name} 
                href={menu.link} 
                className={`shrink-0 px-4 py-1.5 text-[13px] font-bold rounded-full mx-1 transition-colors ${
                  isActive 
                    ? 'bg-white text-[#414a66]' 
                    : menu.isSpecial 
                      ? 'text-rose-400 hover:text-rose-300' 
                      : 'text-gray-300 hover:text-white'
                }`}
              >
                {menu.name}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex max-w-[1200px] mx-auto flex-wrap items-center">
          {menuGroups.map((group: any) => {
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
                  {group.sub?.map((subItem: any) => { 
                    if (subItem.isSpecial) {
                      return (
                        <Link key={subItem.name} href={subItem.link} className="w-full text-left block px-4 py-3 text-[13px] font-bold border-t-2 border-gray-100 transition-colors bg-rose-50 text-rose-500 hover:bg-rose-100">
                          {subItem.name}
                        </Link>
                      );
                    }

                    const isActive = currentCategory === subItem.name;
                    return (
                      <Link key={subItem.name} href={subItem.link || ''} className={`block px-4 py-3 text-[13px] font-bold border-b border-gray-100 transition-colors last:border-0 ${isActive ? 'bg-indigo-50 text-[#3b4890]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#3b4890]'}`}>
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