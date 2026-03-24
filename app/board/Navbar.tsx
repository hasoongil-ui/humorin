// @ts-nocheck
import { Suspense } from 'react';
import { getUserProfile, getDynamicBoards } from './navActions';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  // 💡 [핵심] 브라우저가 아니라, Vercel 서버에서 애초에 데이터를 100% 가져옵니다!
  const user = await getUserProfile();
  const boards = await getDynamicBoards();

  return (
    // 💡 화면 덜컹거림 방지 스켈레톤 유지
    <Suspense fallback={
      <div className="w-full">
        <div className="h-[65px] bg-white border-b border-gray-200 shadow-sm"></div>
        <div className="h-[48px] md:h-[52px] bg-[#414a66]"></div>
      </div>
    }>
      {/* 💡 서버에서 완벽하게 가져온 정보를 클라이언트 화면에 꽂아줍니다! */}
      <NavbarClient initialUser={user} initialBoards={boards} />
    </Suspense>
  );
}