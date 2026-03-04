import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* 상단 헤더 (로그인, 회원가입 순간이동 연결 완료) */}
      <header className="flex justify-between items-center p-6 border-b border-gray-100 shadow-sm">
        <div className="text-3xl font-extrabold text-blue-600 tracking-tighter cursor-pointer">
          <Link href="/">OJEMI</Link>
        </div>
        <nav className="space-x-8 font-medium text-gray-600 hidden md:flex">
          <Link href="/board" className="hover:text-blue-600 transition">자유게시판</Link>
          <span className="cursor-pointer hover:text-gray-900 transition">질문/답변</span>
          <span className="cursor-pointer hover:text-gray-900 transition">갤러리</span>
        </nav>
        <div className="space-x-4 flex items-center">
          {/* ✨ 로그인 순간이동 문 ✨ */}
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">
            로그인
          </Link>
          {/* ✨ 회원가입 순간이동 문 ✨ */}
          <Link href="/signup" className="text-sm font-medium bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition shadow-md">
            회원가입
          </Link>
        </div>
      </header>

      {/* 중앙 메인 배너 */}
      <main className="max-w-4xl mx-auto mt-24 px-6 text-center">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
          전설의 시작, <span className="text-blue-600">오재미 커뮤니티</span>
        </h1>
        <p className="text-xl text-gray-500 mb-16">
          하순길 대표님의 첫 번째 웹사이트가 성공적으로 열렸습니다.<br/>
          이제 세상과 가장 빠르게 소통하세요.
        </p>

        {/* 하단 최신글 피드 */}
        <div className="text-left mt-16 border-t border-gray-200 pt-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">🔥</span> 
              실시간 최신글
            </h2>
            <Link href="/board" className="text-sm text-blue-600 font-medium hover:underline">
              게시판 바로가기 ➔
            </Link>
          </div>
          
          <div className="space-y-4">
            <Link href="/board" className="block p-5 border border-gray-100 rounded-xl hover:shadow-lg hover:border-blue-100 transition cursor-pointer bg-gray-50 hover:bg-white">
              <h3 className="font-bold text-lg text-gray-800">오재미 커뮤니티 오픈을 진심으로 축하합니다! 🎉</h3>
              <p className="text-gray-400 text-sm mt-2">작성자: 수석비서 미나 • 방금 전</p>
            </Link>
            
            <Link href="/board" className="block p-5 border border-gray-100 rounded-xl hover:shadow-lg hover:border-blue-100 transition cursor-pointer bg-gray-50 hover:bg-white">
              <h3 className="font-bold text-lg text-gray-800">여기 사이트 엄청 빠르고 깔끔하네요. 자주 오겠습니다.</h3>
              <p className="text-gray-400 text-sm mt-2">작성자: 얼리어답터 • 5분 전</p>
            </Link>

            <Link href="/board" className="block p-5 border border-gray-100 rounded-xl hover:shadow-lg hover:border-blue-100 transition cursor-pointer bg-gray-50 hover:bg-white">
              <h3 className="font-bold text-lg text-gray-800">테슬라 모델 Y 관련 정보는 어느 게시판에 쓰면 될까요?</h3>
              <p className="text-gray-400 text-sm mt-2">작성자: 차박매니아 • 12분 전</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}