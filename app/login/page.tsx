// 파일 위치: app/login/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [botTrap, setBotTrap] = useState('');
  const router = useRouter();

  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const isAdminMode = searchParams.get('mode') === 'admin';

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'cooldown') {
      alert('🚨 회원 탈퇴 후 7일 동안은 동일한 소셜 계정으로 재가입(로그인)이 불가능합니다.');
      router.replace('/login');
    } else if (error === 'banned') {
      alert('🚨 이용이 영구 정지된 계정입니다.');
      router.replace('/login');
    } else if (error === 'no_email') {
      alert('🚨 소셜 계정에 이메일 정보가 없어 가입할 수 없습니다.');
      router.replace('/login');
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botTrap) {
      router.push('/');
      return;
    }

    try {
      const cleanId = id.replace(/\s/g, '').trim();
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId, password }),
      });

      if (res.ok) {
        router.push(redirectUrl || '/');
        router.refresh();
      } else {
        alert('아이디 또는 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert('로그인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleSocialLogin = (provider: string) => {
    const callbackUrl = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
    window.location.href = `/api/auth/${provider}${callbackUrl}`;
  };

  return (
    <div className="space-y-6">

      {/* 🚀 [추가 완료] 로그인 페이지용 유도 문구 */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">3초 만에 빠른 로그인</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          복잡한 정보 입력 NO!<br />완벽한 익명으로 안전하고 간편하게 시작하세요.
        </p>
      </div>

      <div className="w-full bg-[#f3f6fa] border border-[#e2e8f0] rounded-md py-2.5 mb-2 flex flex-col sm:flex-row items-center justify-center text-[13px] tracking-tight">
        <div className="flex items-center gap-1 text-[#3b4890] font-bold">
          <span>🔒 안심하세요!</span>
        </div>
        <span className="hidden sm:inline-block ml-1"></span>
        <span className="text-[#3b4890] font-bold mt-0.5 sm:mt-0">
          실명 노출 없는 100% 익명 활동 보장
        </span>
      </div>

      <div>
        <div className="space-y-2.5">
          <button type="button" onClick={() => handleSocialLogin('naver')} className="w-full py-3.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center relative shadow-sm">
            <div className="absolute left-5">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" fill="currentColor" />
              </svg>
            </div>
            네이버로 시작하기
          </button>

          <button type="button" onClick={() => handleSocialLogin('kakao')} className="w-full py-3.5 bg-[#FEE500] hover:bg-[#ebd300] text-[#191919] font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center relative shadow-sm">
            <div className="absolute left-4">
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3c-5.523 0-10 3.5-10 7.82 0 2.81 1.83 5.275 4.54 6.64-.17.653-.615 2.37-.64 2.478-.035.15.066.14.135.094.053-.035 2.146-1.47 2.97-2.04.93.22 1.91.338 2.935.338 5.523 0 10-3.5 10-7.82C22 6.5 17.523 3 12 3z" fill="currentColor" />
              </svg>
            </div>
            카카오로 시작하기
          </button>

          <button type="button" onClick={() => handleSocialLogin('google')} className="w-full py-3.5 bg-[#4285F4] hover:bg-[#357ae8] text-white font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center relative shadow-sm">
            <div className="absolute left-1.5 p-2 bg-white rounded-sm">
              <svg viewBox="0 0 48 48" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </div>
            Google로 시작하기
          </button>
          <p className="mt-4 text-center text-[12px] text-gray-500 font-medium break-keep">
            * SNS 프로필(실명/사진)은 절대 연동되지 않습니다.
          </p>
        </div>

        <div className="text-center mt-3.5 mb-1 text-[11px] text-gray-400 font-medium tracking-tight leading-tight">
          ※ 다른 네이버 계정으로 변경하시려면,<br />
          네이버에서 먼저 로그아웃해 주세요.
        </div>
      </div>

      {isAdminMode && (
        <>
          <div className="flex items-center pt-3 pb-1">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="px-3 text-[12px] text-gray-400 font-bold">관리자 전용 로그인</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div style={{ display: 'none', visibility: 'hidden', opacity: 0 }}>
              <label>자동가입방지</label>
              <input type="text" name="bot_trap" value={botTrap} onChange={(e) => setBotTrap(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">아이디</label>
              <input type="text" placeholder="아이디 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium text-sm" value={id} onChange={(e) => setId(e.target.value.replace(/\s/g, ''))} required />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호</label>
              <input type="password" placeholder="비밀번호 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="flex justify-end mt-1 mb-2">
              <Link href="/find-account" className="text-[12px] text-gray-500 font-bold hover:text-[#3b4890] transition-colors underline underline-offset-2">
                아이디 / 비밀번호 찾기
              </Link>
            </div>

            <button type="submit" className="w-full py-3.5 mt-2 bg-[#2a3042] hover:bg-[#1e2335] text-white font-bold rounded-sm text-[15px] transition-colors flex justify-center items-center gap-2">
              유머인 계정 로그인
            </button>
          </form>
        </>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">

        <div className="text-center mb-8">
          {/* 🚀 [수정 완료] HUMOR IN 으로 가독성 개선 */}
          <Link href="/" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-3">
            HUMOR IN
          </Link>
          <h2 className="text-xl font-bold text-gray-800">로그인</h2>
        </div>

        <Suspense fallback={<div className="text-center py-4 text-gray-500 font-bold">로딩 중...</div>}>
          <LoginForm />
        </Suspense>

      </div>
    </div>
  );
}