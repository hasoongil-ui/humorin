'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  // 🚨 [테러 방어막 3] 봇 전용 트랩 상태 추가
  const [botTrap, setBotTrap] = useState(''); 
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🚨 [테러 방어막 작동] 허니팟이 채워져 있다면 봇으로 간주하고 가짜 성공 처리
    if (botTrap) {
      console.log('🛡️ [스팸 봇 차단] 허니팟 덫에 걸려 조용히 쫓아냅니다.');
      router.push('/'); 
      return;
    }
    
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

  const handleNaverLogin = () => {
    const callbackUrl = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
    window.location.href = `/api/auth/naver${callbackUrl}`;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleLogin} className="space-y-5">
        
        {/* 🚨 [테러 방어막 3] 사람 눈에 안 보이고 탭(Tab) 이동도 안 되는 봇 전용 함정 */}
        <div style={{ display: 'none', visibility: 'hidden', opacity: 0 }}>
          <label>자동가입방지</label>
          <input 
            type="text" 
            name="bot_trap" 
            value={botTrap} 
            onChange={(e) => setBotTrap(e.target.value)} 
            tabIndex={-1} 
            autoComplete="off" 
          />
        </div>

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