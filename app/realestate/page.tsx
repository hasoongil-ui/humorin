import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '../board/Navbar'; 

export const dynamic = 'force-dynamic';

export default async function RealEstatePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  const STREAMLIT_APP_URL = "https://seoul-aptdata.streamlit.app/?embed=true";

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />

      <div className="max-w-[1200px] mx-auto p-4 md:p-6 mt-4 mb-20">
        <h1 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <span className="text-3xl">🏠</span> 부동산 실거래 분석기
        </h1>

        {/* 💡 미나의 핵심 해킹! 
            바깥 상자는 높이 900px로 고정하고 넘치는 부분은 숨깁니다(overflow-hidden) */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden relative h-[900px]">
          
          {!currentUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 relative z-10 bg-white">
              <span className="text-6xl mb-4">🔒</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">회원 전용 서비스입니다</h2>
              <p className="text-gray-500 mb-8 font-medium">
                오재미의 따뜻한 이웃이 되어주세요! <br/>
                로그인하시면 부동산 빅데이터 분석 도구를 무료로 이용하실 수 있습니다.
              </p>
              <Link 
                href="/login" 
                className="px-8 py-3 bg-[#414a66] hover:bg-[#2a3042] text-white font-bold rounded-sm shadow-sm transition-colors"
              >
                로그인하고 무료로 이용하기
              </Link>
            </div>
          ) : (
            /* 💡 안쪽 도화지(iframe)는 100% + 60px로 길게 늘려서, 하단 워터마크를 바닥 아래로 밀어버립니다! */
            <iframe 
              src={STREAMLIT_APP_URL} 
              className="absolute top-0 left-0 w-full border-none"
              style={{ height: 'calc(100% + 60px)' }}
              title="부동산 실거래 분석기"
            />
          )}
        </div>
      </div>
    </div>
  );
}