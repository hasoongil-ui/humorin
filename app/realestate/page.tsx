import { cookies } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RealEstatePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  // 💡 [수정 필수] 아래 주소를 대표님의 스트림릿 주소로 바꿔주세요!
  // 예시: "https://seoul-aptdata.streamlit.app/?embed=true"
  const STREAMLIT_APP_URL = "https://seoul-aptdata.streamlit.app/?embed=true";

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 mt-4 mb-20">
      
      <h1 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-3xl">🏠</span> 프로 부동산 실거래 분석기
      </h1>

      <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden min-h-[800px]">
        {!currentUser ? (
          // 💡 문지기 로직: 로그인 안 한 사람은 다락방 안내문과 함께 쫓아냅니다!
          <div className="flex flex-col items-center justify-center h-[500px] text-center p-6">
            <span className="text-6xl mb-4">🔒</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">회원 전용 서비스입니다</h2>
            <p className="text-gray-500 mb-8 font-medium">
              오재미의 따뜻한 이웃이 되어주세요! <br/>
              로그인하시면 VIP용 부동산 빅데이터 분석 도구를 무료로 이용하실 수 있습니다.
            </p>
            <Link 
              href="/login" 
              className="px-8 py-3 bg-[#414a66] hover:bg-[#2a3042] text-white font-bold rounded-sm shadow-sm transition-colors"
            >
              로그인하고 무료로 이용하기
            </Link>
          </div>
        ) : (
          // 💡 로그인 한 사람은 완벽하게 연동된 파이썬 액자를 보여줍니다!
          <iframe 
            src={STREAMLIT_APP_URL} 
            className="w-full h-[1200px] border-none"
            title="부동산 실거래 분석기"
          />
        )}
      </div>
    </div>
  );
}