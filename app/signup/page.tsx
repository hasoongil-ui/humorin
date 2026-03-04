import Link from 'next/link';

export default function Signup() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* 로고 및 환영 인사 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="text-5xl font-extrabold text-blue-600 tracking-tighter inline-block mb-4 hover:text-blue-800 transition">
          OJEMI
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">
          오재미 회원가입
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-bold text-blue-600 hover:text-blue-800 transition">
            로그인 하기
          </Link>
        </p>
      </div>

      {/* 회원가입 박스 */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6">
            
            {/* 닉네임 입력 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">닉네임</label>
              <div className="mt-1">
                <input 
                  id="nickname" 
                  type="text" 
                  placeholder="오재미에서 사용할 멋진 이름" 
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" 
                />
              </div>
            </div>

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
                  placeholder="8자 이상 입력해 주세요" 
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" 
                />
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700">비밀번호 확인</label>
              <div className="mt-1">
                <input 
                  id="password-confirm" 
                  type="password" 
                  placeholder="비밀번호를 한 번 더 입력해 주세요" 
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition" 
                />
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="flex items-center mt-4">
              <input id="terms" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer" />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                오재미 <a href="#" className="text-blue-600 font-bold hover:underline">이용약관</a> 및 <a href="#" className="text-blue-600 font-bold hover:underline">개인정보처리방침</a>에 동의합니다.
              </label>
            </div>

            {/* 가입 버튼 */}
            <div className="pt-2">
              <button type="button" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                회원가입 완료
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}