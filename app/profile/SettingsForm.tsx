'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { checkDuplicate } from '../signup/actions';
import { updateProfileAction, deleteUserAction } from './actions'; 

export default function SettingsForm({ 
  currentUserId, 
  currentNickname, 
  isNaverUser,
  currentEmail // 💡 [수술 핵심] 껍데기(page.tsx)에서 이메일 정보도 받아옵니다!
}: { 
  currentUserId: string, 
  currentNickname: string, 
  isNaverUser?: boolean,
  currentEmail?: string 
}) {
  // 닉네임 상태
  const [nickname, setNickname] = useState('');
  const [nickError, setNickError] = useState('');
  const [nickOk, setNickOk] = useState(false);

  // 💡 이메일 상태 추가
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailOk, setEmailOk] = useState(false);

  // 💡 비밀번호 상태 추가
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nickRegex = /^[가-힣a-zA-Z0-9\s]{2,8}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 💡 이메일 판독기

  // 닉네임 검사
  const handleNickBlur = async () => {
    const val = nickname.trim();
    if (!val) { setNickError(''); setNickOk(false); return; }
    const cleanVal = val.replace(/\s{2,}/g, ' '); 

    if (cleanVal === currentNickname) {
      setNickError(''); setNickOk(true); return;
    }
    if (!nickRegex.test(cleanVal)) {
      setNickError('❌ 닉네임은 특수문자 제외 2~8자로 입력해 주세요.');
      setNickOk(false); return;
    }

    const status = await checkDuplicate('nickname', cleanVal);
    if (status === 'forbidden') {
      setNickError('❌ 관리자 사칭 방지를 위해 사용할 수 없는 단어입니다.');
      setNickOk(false);
    } else if (status === 'duplicate') {
      setNickError('❌ 이미 다른 사람이 사용 중인 닉네임입니다.');
      setNickOk(false);
    } else {
      setNickError(''); setNickOk(true);
    }
  };

  // 💡 이메일 검사
  const handleEmailBlur = async () => {
    const val = email.trim();
    if (!val) { setEmailError(''); setEmailOk(false); return; }

    if (val === currentEmail) {
      setEmailError(''); setEmailOk(true); return;
    }
    if (!emailRegex.test(val)) {
      setEmailError('❌ 올바른 이메일 형식을 입력해 주세요.');
      setEmailOk(false); return;
    }

    const status = await checkDuplicate('email', val);
    if (status === 'duplicate') {
      setEmailError('❌ 이미 가입된 이메일입니다. 다른 이메일을 사용해 주세요.');
      setEmailOk(false);
    } else {
      setEmailError(''); setEmailOk(true);
    }
  };

  // 💡 비밀번호 실시간 검사
  const validatePassword = (pw: string, confirmPw: string) => {
    if (!pw && !confirmPw) { setPasswordError(''); return; }
    if (pw && pw.length < 8) {
      setPasswordError('❌ 비밀번호는 8자리 이상이어야 합니다.'); return;
    }
    if (pw && confirmPw && pw !== confirmPw) {
      setPasswordError('❌ 비밀번호가 서로 일치하지 않습니다.'); return;
    }
    setPasswordError('');
  };

  const handleSubmit = async (formData: FormData) => {
    if (nickError || emailError || passwordError) {
      alert("입력하신 정보에 오류가 있습니다. 빨간색 경고 메시지를 확인해 주세요!");
      return; 
    }
    
    // 최종 제출 직전 한 번 더 8자리 & 일치 여부 검사 (절대 뚫림 방지)
    if (password || passwordConfirm) {
      if (password.length < 8) {
        setPasswordError('❌ 비밀번호는 8자리 이상이어야 합니다.'); return;
      }
      if (password !== passwordConfirm) {
        setPasswordError('❌ 비밀번호가 서로 일치하지 않습니다.'); return;
      }
    }

    setIsSubmitting(true);
    await updateProfileAction(formData);
    setIsSubmitting(false);
    alert("정보가 성공적으로 수정되었습니다!");
    setPassword('');
    setPasswordConfirm('');
  };

  return (
    <div>
      <form action={handleSubmit} className="space-y-6">
        <input type="hidden" name="currentUserId" value={currentUserId || ''} />
        <input type="hidden" name="currentNickname" value={currentNickname || ''} />

        {/* 닉네임 수정 영역 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">새 닉네임</label>
          <input 
            name="newNickname" 
            placeholder={`현재: ${currentNickname}`}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value); setNickError(''); setNickOk(false);
            }}
            onBlur={handleNickBlur}
            className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${nickError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
          />
          {nickError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{nickError}</p>}
          {nickOk && nickname === currentNickname && <p className="text-gray-500 text-[12px] font-bold mt-1.5">✅ 현재 사용 중인 닉네임을 유지합니다.</p>}
          {nickOk && nickname !== currentNickname && <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 멋진 닉네임이네요! 변경 가능합니다.</p>}
        </div>

        {/* 이메일 수정 영역 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">새 이메일 주소</label>
          <input 
            name="newEmail" 
            placeholder={currentEmail ? `현재: ${currentEmail}` : '변경할 이메일 입력'}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value); setEmailError(''); setEmailOk(false);
            }}
            onBlur={handleEmailBlur}
            className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${emailError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
          />
          {emailError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{emailError}</p>}
          {emailOk && email !== currentEmail && <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 사용 가능한 이메일입니다.</p>}
        </div>
        
        {isNaverUser ? (
          <div className="bg-green-50 p-4 border border-green-200 rounded-sm">
            <label className="block text-sm font-bold text-green-800 mb-1">비밀번호 변경 안내</label>
            <p className="text-xs text-green-700 font-medium leading-relaxed">
              네이버로 간편 가입하신 회원님은 오재미에서 비밀번호를 변경하실 수 없습니다.<br/>
              계정 보안 및 비밀번호 관리는 <b>네이버 홈페이지</b>를 이용해 주세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
              <input 
                type="password" 
                name="newPassword" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value, passwordConfirm);
                }}
                placeholder="변경할 비밀번호 입력 (8자리 이상)" 
                className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호 확인</label>
              <input 
                type="password" 
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  validatePassword(password, e.target.value);
                }}
                placeholder="비밀번호 다시 입력" 
                className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
              />
              {passwordError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{passwordError}</p>}
              {!passwordError && password && password === passwordConfirm && (
                <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 비밀번호가 일치합니다.</p>
              )}
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isSubmitting || !!nickError || !!emailError || !!passwordError} 
          className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-[15px] hover:bg-[#1e2335] shadow-sm transition-colors mt-4 disabled:bg-gray-400"
        >
          {isSubmitting && <Loader2 className="animate-spin" size={18} />}
          {isSubmitting ? '수정 중...' : '정보 수정하기'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
        <form action={async (formData) => {
          if (window.confirm('정말로 오재미를 탈퇴하시겠습니까?\n작성하신 모든 정보가 영구적으로 삭제되며 복구할 수 없습니다.')) {
            await deleteUserAction(formData);
          }
        }}>
          <input type="hidden" name="currentUserId" value={currentUserId || ''} />
          <button type="submit" className="text-[12px] font-bold text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors">
            회원 탈퇴하기
          </button>
        </form>
      </div>
    </div>
  );
}