'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { findIdAction, verifyAccountAction, resetPasswordAction } from './actions';

export default function FindAccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'id' | 'pw'>('id');

  // 아이디 찾기 상태 관리
  const [idEmail, setIdEmail] = useState('');
  const [foundId, setFoundId] = useState('');
  const [idError, setIdError] = useState('');

  // 비밀번호 재설정 상태 관리
  const [pwUserId, setPwUserId] = useState('');
  const [pwEmail, setPwEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false); // 본인 확인 통과 여부
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdError('');
    setFoundId('');
    const res = await findIdAction(idEmail.trim());
    
    // 💡 미나의 방어막 추가: res.userId나 res.message가 혹시라도 없을 경우를 대비 (|| '')
    if (res.success && res.userId) {
      setFoundId(res.userId || ''); 
    } else {
      setIdError(res.message || '아이디를 찾는 중 오류가 발생했습니다.');
    }
  };

  const handleVerifyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    const res = await verifyAccountAction(pwUserId.trim(), pwEmail.trim());
    
    if (res.success) {
      setIsVerified(true);
    } else {
      // 💡 미나의 방어막 추가
      setPwError(res.message || '본인 확인 중 오류가 발생했습니다.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    
    if (newPw !== confirmPw) {
      setPwError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }
    
    const res = await resetPasswordAction(pwUserId.trim(), newPw);
    if (res.success) {
      alert('비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해 주십시오.');
      router.push('/login');
    } else {
      // 💡 미나의 방어막 추가
      setPwError(res.message || '비밀번호 재설정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-gray-200 w-full max-w-[450px]">
        
        <div className="text-center mb-8">
          <Link href="/board" className="text-3xl font-black text-[#3b4890] tracking-tighter inline-block mb-2">
            HUMORIN
          </Link>
          <h2 className="text-xl font-bold text-gray-800">계정 찾기</h2>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b border-gray-200 mb-8">
          <button 
            onClick={() => setActiveTab('id')} 
            className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'id' ? 'text-[#3b4890] border-b-2 border-[#3b4890]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            아이디 찾기
          </button>
          <button 
            onClick={() => { setActiveTab('pw'); setIsVerified(false); setPwError(''); }} 
            className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'pw' ? 'text-[#3b4890] border-b-2 border-[#3b4890]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            비밀번호 재설정
          </button>
        </div>

        {/* ============================== 
            1. 아이디 찾기 탭 
        ============================== */}
        {activeTab === 'id' && (
          <div>
            {foundId ? (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-gray-500 mb-2">고객님의 아이디는 아래와 같습니다.</p>
                <div className="text-2xl font-black text-[#3b4890] p-4 bg-indigo-50 border border-indigo-100 rounded-sm mb-6">
                  {foundId}
                </div>
                <button 
                  onClick={() => { setActiveTab('pw'); setPwUserId(''); setPwEmail(''); }}
                  className="w-full py-3.5 bg-[#2a3042] text-white font-bold rounded-sm text-[15px] hover:bg-[#1e2335] transition-colors"
                >
                  비밀번호 재설정으로 이동
                </button>
              </div>
            ) : (
              <form onSubmit={handleFindId} className="space-y-5">
                {idError && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold text-center rounded-sm border border-red-200">{idError}</div>}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">가입 시 등록한 이메일</label>
                  <input type="email" value={idEmail} onChange={(e) => setIdEmail(e.target.value)} required placeholder="이메일 주소 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#2a3042] text-white font-bold rounded-sm text-[15px] hover:bg-[#1e2335] transition-colors mt-2">
                  아이디 찾기
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================== 
            2. 비밀번호 재설정 탭 
        ============================== */}
        {activeTab === 'pw' && (
          <div>
            {isVerified ? (
              // 본인 확인 완료 -> 새 비밀번호 입력창
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="p-3 bg-indigo-50 text-[#3b4890] text-sm font-bold text-center rounded-sm border border-indigo-100 mb-4">
                  본인 확인이 완료되었습니다. <br/>새로운 비밀번호를 입력해 주십시오.
                </div>
                {pwError && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold text-center rounded-sm border border-red-200">{pwError}</div>}
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required placeholder="새로운 비밀번호 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호 확인</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required placeholder="비밀번호 다시 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#3b4890] text-white font-bold rounded-sm text-[15px] hover:bg-[#2a3042] transition-colors mt-2">
                  비밀번호 변경 완료
                </button>
              </form>
            ) : (
              // 본인 확인 전 -> 아이디/이메일 입력창
              <form onSubmit={handleVerifyAccount} className="space-y-5">
                {pwError && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold text-center rounded-sm border border-red-200">{pwError}</div>}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">아이디</label>
                  <input type="text" value={pwUserId} onChange={(e) => setPwUserId(e.target.value)} required placeholder="아이디 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">가입 시 등록한 이메일</label>
                  <input type="email" value={pwEmail} onChange={(e) => setPwEmail(e.target.value)} required placeholder="이메일 주소 입력" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#2a3042] text-white font-bold rounded-sm text-[15px] hover:bg-[#1e2335] transition-colors mt-2">
                  본인 확인
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-[13px] text-gray-600 font-medium flex justify-center gap-6">
          <Link href="/login" className="text-gray-500 font-bold hover:text-[#3b4890] transition-colors">
            로그인 화면으로
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/signup" className="text-gray-500 font-bold hover:text-[#3b4890] transition-colors">
            새로 가입하기
          </Link>
        </div>

      </div>
    </div>
  );
}