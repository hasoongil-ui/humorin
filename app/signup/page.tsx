// 파일 위치: app/signup/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const handleSocialLogin = (provider: string) => {
    const callbackUrl = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
    window.location.href = `/api/auth/${provider}${callbackUrl}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">3초 만에 빠른 회원가입</h3>
        <p className="text-sm text-gray-500">복잡한 절차 없이 SNS로 간편하게 시작하세요!</p>
      </div>

      <div className="w-full bg-[#f3f6fa] border border-[#e2e8f0] rounded-md py-2.5 mb-4 flex flex-col sm:flex-row items-center justify-center text-[13px] tracking-tight">
        <div className="flex items-center gap-1 text-[#3b4890] font-bold">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"></path>
          </svg>
          <span>안심하세요!</span>
        </div>
        <span className="hidden sm:inline-block ml-1"></span>
        <span className="text-[#3b4890] font-bold mt-0.5 sm:mt-0">
          닉네임과 이메일만으로 가입 완료
        </span>
      </div>

      <div className="space-y-2.5">
        <button type="button" onClick={() => handleSocialLogin('naver')} className="w-full py-3.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center relative shadow-sm">
          <div className="absolute left-5">
            <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" fill="currentColor"/>
            </svg>
          </div>
          네이버로 시작하기
        </button>

        <button type="button" onClick={() => handleSocialLogin('kakao')} className="w-full py-3.5 bg-[#FEE500] hover:bg-[#ebd300] text-[#191919] font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center relative shadow-sm">
          <div className="absolute left-4">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3c-5.523 0-10 3.5-10 7.82 0 2.81 1.83 5.275 4.54 6.64-.17.653-.615 2.37-.64 2.478-.035.15.066.14.135.094.053-.035 2.146-1.47 2.97-2.04.93.22 1.91.338 2.935.338 5.523 0 10-3.5 10-7.82C22 6.5 17.523 3 12 3z" fill="currentColor"/>
            </svg>
          </div>
          카카오로 시작하기
        </button>

        <button type="button" onClick={() => handleSocialLogin('google')} className="w-full py-3.5 bg-[#4285F4] hover:bg-[#357ae8] text-white font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center relative shadow-sm">
          <div className="absolute left-1.5 p-2 bg-white rounded-sm">
            <svg viewBox="0 0 48 48" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          Google로 시작하기
        </button>
      </div>

      {/* 🚀 [삭제 완료] 기존에 있던 '이메일 계정으로 로그인 하러가기' 관련 블록을 완전히 삭제했습니다. */}

    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">
        
        <div className="text-center mb-8">
          {/* 🚀 [수정 완료] HUMOR IN 으로 가독성 개선 */}
          <Link href="/" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-3">
            HUMOR IN
          </Link>
          <h2 className="text-xl font-bold text-gray-800">간편 회원가입</h2>
        </div>

        <Suspense fallback={<div className="text-center py-4 text-gray-500 font-bold">로딩 중...</div>}>
          <SignupForm />
        </Suspense>

      </div>
    </div>
  );
}