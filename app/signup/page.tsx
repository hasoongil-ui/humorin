'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { checkDuplicate, registerUserAction } from './actions'; 

export default function SignupPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState(''); 
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  
  const [idError, setIdError] = useState('');
  const [pwdError, setPwdError] = useState(''); 
  const [nickError, setNickError] = useState('');
  const [emailError, setEmailError] = useState(''); 
  
  const [idOk, setIdOk] = useState(false);
  const [nickOk, setNickOk] = useState(false);
  const [emailOk, setEmailOk] = useState(false); 
  
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const idRegex = /^[a-zA-Z0-9]{4,12}$/; 
  const nickRegex = /^[가-힣a-zA-Z0-9\s]{2,8}$/; 
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; 

  const handleIdBlur = async () => {
    const val = id.trim();
    if (!val) { setIdError(''); setIdOk(false); return; }
    
    if (!idRegex.test(val)) {
      setIdError('❌ 아이디는 영문, 숫자 조합 4~12자로 입력해 주세요.');
      setIdOk(false); return;
    }

    const status = await checkDuplicate('id', val);
    if (status === 'forbidden') {
      setIdError('❌ 사용할 수 없는 단어가 포함되어 있습니다.'); setIdOk(false);
    } else if (status === 'duplicate') {
      setIdError('❌ 이미 사용 중인 아이디입니다.'); setIdOk(false);
    } else {
      setIdError(''); setIdOk(true);
    }
  };

  const handlePwdBlur = () => {
    if (confirmPassword && password !== confirmPassword) {
      setPwdError('❌ 비밀번호가 서로 일치하지 않습니다.');
    } else if (confirmPassword && password.length < 8) {
      setPwdError('❌ 비밀번호는 최소 8자 이상이어야 합니다.');
    } else {
      setPwdError('');
    }
  };

  const handleNickBlur = async () => {
    const val = nickname.trim();
    if (!val) { setNickError(''); setNickOk(false); return; }

    const cleanVal = val.replace(/\s{2,}/g, ' '); 
    if (!nickRegex.test(cleanVal)) {
      setNickError('❌ 닉네임은 특수문자 제외 2~8자로 입력해 주세요.');
      setNickOk(false); return;
    }

    const status = await checkDuplicate('nickname', cleanVal);
    if (status === 'forbidden') {
      setNickError('❌ 관리자 사칭 방지를 위해 사용할 수 없는 단어입니다.'); setNickOk(false);
    } else if (status === 'duplicate') {
      setNickError('❌ 이미 사용 중인 닉네임입니다.'); setNickOk(false);
    } else {
      setNickError(''); setNickOk(true);
    }
  };

  const handleEmailBlur = async () => {
    const val = email.trim();
    if (!val) { setEmailError(''); setEmailOk(false); return; }

    if (!emailRegex.test(val)) {
      setEmailError('❌ 올바른 이메일 형식이 아닙니다. (예: humorin@naver.com)');
      setEmailOk(false); return;
    }

    const lowerVal = val.toLowerCase();
    if (lowerVal.endsWith('@naver.co') || lowerVal.endsWith('@gmail.co') || lowerVal.endsWith('@daum.ne') || lowerVal.endsWith('@hanmail.ne')) {
      setEmailError('❌ 이메일 끝부분(.com, .net 등)에 오타가 없는지 다시 확인해 주세요.');
      setEmailOk(false); return;
    }

    const status = await checkDuplicate('email', val);
    if (status === 'duplicate') {
      setEmailError('❌ 이미 다른 계정으로 가입된 이메일입니다.'); setEmailOk(false);
    } else {
      setEmailError(''); setEmailOk(true);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setSubmitError('');
    
    if (idError || nickError || emailError || pwdError) {
      setSubmitError('빨간색으로 표시된 항목을 올바르게 수정해 주세요.');
      return;
    }

    const pwd = formData.get('password') as string;
    const confirmPwd = formData.get('confirm_password') as string;

    if (pwd.length < 8) {
      setPwdError('❌ 보안을 위해 비밀번호는 최소 8자 이상이어야 합니다.'); return;
    }
    if (pwd !== confirmPwd) {
      setPwdError('❌ 비밀번호가 서로 일치하지 않습니다.'); return;
    }
    
    setIsSubmitting(true);
    const result = await registerUserAction(formData);
    
    if (result?.error) {
      setIsSubmitting(false);
      if (result.error === 'mismatch') setPwdError('❌ 비밀번호가 서로 일치하지 않습니다.');
      else if (result.error === 'id_exists') setIdError('❌ 이미 사용 중인 아이디입니다.');
      else if (result.error === 'nick_exists') setNickError('❌ 이미 사용 중인 닉네임입니다.');
      else if (result.error === 'email_exists') setEmailError('❌ 이미 가입된 이메일입니다.'); 
      else if (result.error === 'id_forbidden' || result.error === 'nick_forbidden') setSubmitError('사용할 수 없는 금칙어가 포함되어 있습니다.');
      else setSubmitError('회원 가입 처리 중 오류가 발생했습니다.');
    }
  };

  const handleNaverLogin = () => {
    window.location.href = `/api/auth/naver`;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans py-10">
      <div className="bg-white p-8 rounded-sm shadow-sm border border-gray-200 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-black text-[#3b4890] tracking-tighter inline-block mb-2">HUMORIN</Link>
          <h2 className="text-xl font-bold text-gray-800 mt-2">회원 가입</h2>
        </div>

        {/* 💡 [네이버 심사 지옥 탈출!] 회원가입 화면의 네이버 버튼 숨김 처리 시작 
        <button
          type="button"
          onClick={handleNaverLogin}
          className="w-full py-3.5 mb-6 bg-[#03C75A] hover:bg-[#02b351] text-white font-bold rounded-sm text-[16px] transition-colors flex justify-center items-center gap-2 shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.0732 11.206L7.90483 0H0V24H7.92683V12.794L16.0952 24H24V0H16.0732V11.206Z" fill="white"/>
          </svg>
          네이버 아이디로 1초 만에 가입하기
        </button>

        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">또는 이메일로 가입</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>
        네이버 버튼 숨김 처리 끝 */}

        {submitError && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold text-center rounded-sm border border-red-200">
            {submitError}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">아이디</label>
            <input 
              name="user_id" required placeholder="영문, 숫자 4~12자" 
              value={id}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawValue)) {
                  setIdError('❌ 아이디는 영문과 숫자만 입력해 주세요. (한글 입력 불가)');
                } else { setIdError(''); }
                setId(rawValue.replace(/[^a-zA-Z0-9]/g, ''));
                setIdOk(false); 
              }} 
              onBlur={handleIdBlur} 
              className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${idError ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
            />
            {idError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{idError}</p>}
            {idOk && !idError && <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 멋진 아이디네요! (사용 가능)</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input 
              type="password" name="password" required minLength={8} placeholder="최소 8자 이상 입력" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwdError(''); }}
              onBlur={handlePwdBlur}
              className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${pwdError ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호 확인</label>
            <input 
              type="password" name="confirm_password" required minLength={8} placeholder="비밀번호 한 번 더 입력" 
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(''); }}
              onBlur={handlePwdBlur}
              className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${pwdError ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
            />
            {pwdError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{pwdError}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">게시판 닉네임</label>
            <input 
              name="nickname" required placeholder="한글, 영문, 숫자 2~8자 (특수문자 불가)" 
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNickError(''); setNickOk(false); }}
              onBlur={handleNickBlur} 
              className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${nickError ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
            />
            {nickError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{nickError}</p>}
            {nickOk && !nickError && <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 멋진 닉네임이네요! (사용 가능)</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">이메일 (비밀번호 재설정용)</label>
            <input 
              type="email" name="email" required placeholder="이메일 주소 입력" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailOk(false); }}
              onBlur={handleEmailBlur}
              className={`w-full p-3 border rounded-sm focus:outline-none font-medium mb-1.5 ${emailError ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
            />
            {emailError && <p className="text-red-500 text-[12px] font-bold mt-0.5 mb-2">{emailError}</p>}
            {emailOk && !emailError && <p className="text-green-600 text-[12px] font-bold mt-0.5 mb-2">✅ 사용 가능한 이메일입니다!</p>}
            <p className="text-[11px] text-gray-500 leading-tight">
              * 입력하신 이메일은 비밀번호 분실 시 본인 확인 및 재설정 용도로만 보관됩니다.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-[16px] hover:bg-[#1e2335] shadow-sm mt-6 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="animate-spin" size={18} />}
            {isSubmitting ? '가입 처리 중...' : '이메일로 가입하기'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-[13px] text-gray-600 font-medium">
          <p className="mb-2 text-gray-500">이미 유머인의 회원이신가요?</p>
          <Link href="/login" className="text-[#3b4890] font-bold hover:underline inline-block text-[14px]">
            로그인하러 가기
          </Link>
        </div>

      </div>
    </div>
  );
}