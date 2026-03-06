'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 💡 대표님이 기존에 쓰시던 서버 로그인 API 연동 로직입니다.
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
      });

      if (res.ok) {
        // 로그인 성공 시 메인 게시판으로 이동!
        router.push('/board');
        router.refresh();
      } else {
        alert('아이디 또는 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert('로그인 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">
        
        {/* 상단 로고 및 타이틀 */}
        <div className="text-center mb-8">
          <Link href="/board" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-3">
            OJEMI
          </Link>
          <h2 className="text-xl font-bold text-gray-800">VIP 로그인</h2>
        </div>

        {/* 로그인 폼 */}
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

          <button
            type="submit"
            className="w-full py-3.5 mt-2 bg-[#2a3042] hover:bg-[#1e2335] text-white font-bold rounded-sm text-lg transition-colors flex justify-center items-center gap-2"
          >
            <span>🔒</span> 로그인하기
          </button>
        </form>

        {/* 💡 미나의 핵심 추가 로직: 다정한 회원가입 유도 영역! */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-[13px] text-gray-600 font-medium">
          <p className="mb-2 text-gray-500">아직 오재미의 이웃이 아니신가요?</p>
          <Link 
            href="/signup" 
            className="text-[#3b4890] font-bold hover:underline inline-block text-[14px]"
          >
            회원가입 하고 함께하기 👉
          </Link>
        </div>

      </div>
    </div>
  );
}