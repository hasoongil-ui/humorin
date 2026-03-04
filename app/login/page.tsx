import Link from 'next/link';

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* 로고 및 환영 인사 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="text-5xl font-extrabold text-blue-600 tracking-tighter inline-block mb-4 hover:text-blue-800 transition">
          OJEMI
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">
          오재미에 오신 것을 환영합니다
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          아직 회원이 아니신가요?{' '}
          <Link href="/signup" className="font-bold text-blue-600 hover:text-blue-800 transition">
            회원가입 하기
          </Link>
        </p>
      </div>

      {/* 로그인 박스 */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6">
            
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">이메일 주소</label>
              <div className="mt-1">
                <input 
                  id="email" 
                  type="email" 
                  placeholder="example@ojemi.com" 
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" 
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">비밀번호</label>
              <div className="mt-1">
                <input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" 
                />
              </div>
            </div>

            {/* 로그인 유지 & 비밀번호 찾기 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">로그인 상태 유지</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-bold text-blue-600 hover:text-blue-800 transition">비밀번호 찾기</a>
              </div>
            </div>

            {/* 로그인 버튼 */}
            <div>
              <button type="button" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                로그인
              </button>
            </div>
          </form>

          {/* 간편 로그인 (소셜 로그인 뼈대) */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400 font-medium">또는 간편 로그인</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-[#FEE500] text-sm font-bold text-gray-900 hover:bg-[#F4DC00] transition">
                <span className="mr-2 text-lg">💬</span> 카카오
              </button>
              <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-[#03C75A] text-sm font-bold text-white hover:bg-[#02B351] transition">
                <span className="mr-2 text-lg">N</span> 네이버
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}