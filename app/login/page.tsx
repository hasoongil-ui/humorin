'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
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

  // 💡 [봉인 해제!] 네이버 로그인 창으로 보내주는 함수입니다.
  const handleNaverLogin = () => {
    // 혹시 로그인 후 돌아갈 주소가 있다면 챙겨서 갑니다.
    const callbackUrl = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
    window.location.href = `/api/auth/naver${callbackUrl}`;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">아이디</label>
          <input
            type="text"
            placeholder="아이디 입력"
            className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium"
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호</label>
          <input
            type="password"
            placeholder="비밀번호 입력"
            className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end mt-1 mb-2">
          <Link href="/find-account" className="text-[12px] text-gray-500 font-bold hover:text-[#3b4890] transition-colors underline underline-offset-2">
            아이디 / 비밀번호 찾기
          </Link>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 mt-2 bg-[#2a3042] hover:bg-[#1e2335] text-white font-bold rounded-sm text-lg transition-colors flex justify-center items-center gap-2"
        >
          유머인 계정으로 로그인
        </button>
      </form>

      {/* 💡 [네이버 심사 지옥 탈출!] 당분간 네이버 버튼 숨김 처리 시작 
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">또는 간편하게</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <button
        type="button"
        onClick={handleNaverLogin}
        className="w-full py-3.5 bg-[#03C75A] hover:bg-[#02b351] text-white font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center gap-2 shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.0732 11.206L7.90483 0H0V24H7.92683V12.794L16.0952 24H24V0H16.0732V11.206Z" fill="white"/>
        </svg>
        네이버로 1초 만에 시작하기
      </button>
      네이버 버튼 숨김 처리 끝 */}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">
        
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-3">
            HUMORIN
          </Link>
          <h2 className="text-xl font-bold text-gray-800">로그인</h2>
        </div>

        <Suspense fallback={<div className="text-center py-4 text-gray-500 font-bold">로딩 중...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-[13px] text-gray-600 font-medium">
          <p className="mb-2 text-gray-500">아직 유머인의 회원이 아니신가요?</p>
          <Link 
            href="/signup" 
            className="text-[#3b4890] font-bold hover:underline inline-block text-[14px]"
          >
            회원가입 하고 함께하기
          </Link>
        </div>

      </div>
    </div>
  );
}