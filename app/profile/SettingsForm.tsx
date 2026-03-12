'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
// 💡 [핵심] 아까 가입 화면에서 만든 마법 요원을 그대로 데려와 재사용합니다! (DRY 원칙)
import { checkDuplicate } from '../signup/actions';
import { updateProfileAction } from './actions';

export default function SettingsForm({ currentUserId, currentNickname }: { currentUserId: string, currentNickname: string }) {
  const [nickname, setNickname] = useState('');
  const [nickError, setNickError] = useState('');
  const [nickOk, setNickOk] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nickRegex = /^[가-힣a-zA-Z0-9\s]{2,8}$/;

  const handleNickBlur = async () => {
    const val = nickname.trim();
    if (!val) {
      setNickError(''); setNickOk(false); return;
    }

    const cleanVal = val.replace(/\s{2,}/g, ' '); 

    // 💡 1. 내 현재 닉네임과 똑같이 쳤을 때 (통과!)
    if (cleanVal === currentNickname) {
      setNickError('');
      setNickOk(true);
      return;
    }

    // 💡 2. 글자 수나 특수문자 규칙을 어겼을 때
    if (!nickRegex.test(cleanVal)) {
      setNickError('❌ 닉네임은 특수문자 제외 2~8자로 입력해 주세요.');
      setNickOk(false); return;
    }

    // 💡 3. 서버 요원에게 중복 & 사칭 검사 맡기기
    const status = await checkDuplicate('nickname', cleanVal);
    if (status === 'forbidden') {
      setNickError('❌ 관리자 사칭 방지를 위해 사용할 수 없는 단어입니다.');
      setNickOk(false);
    } else if (status === 'duplicate') {
      setNickError('❌ 이미 다른 사람이 사용 중인 닉네임입니다.');
      setNickOk(false);
    } else {
      setNickError('');
      setNickOk(true);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    if (nickError) return; // 에러가 있으면 수정 못하게 막음
    setIsSubmitting(true);
    await updateProfileAction(formData);
    setIsSubmitting(false);
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="currentUserId" value={currentUserId || ''} />
      <input type="hidden" name="currentNickname" value={currentNickname || ''} />

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">새 닉네임</label>
        <input 
          name="newNickname" 
          placeholder={`현재: ${currentNickname}`}
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setNickError(''); 
            setNickOk(false);
          }}
          onBlur={handleNickBlur}
          className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${nickError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
        />
        {/* 💡 실시간 상태 알림판 */}
        {nickError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{nickError}</p>}
        {nickOk && nickname === currentNickname && <p className="text-gray-500 text-[12px] font-bold mt-1.5">✅ 현재 사용 중인 닉네임을 그대로 유지합니다.</p>}
        {nickOk && nickname !== currentNickname && <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 멋진 닉네임이네요! 변경 가능합니다.</p>}
      </div>
      
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
        <input type="password" name="newPassword" placeholder="변경할 비밀번호 입력 (선택)" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
      </div>
      
      <button 
        type="submit" 
        disabled={isSubmitting || !!nickError} 
        className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-[15px] hover:bg-[#1e2335] shadow-sm transition-colors mt-4 disabled:bg-gray-400"
      >
        {isSubmitting && <Loader2 className="animate-spin" size={18} />}
        {isSubmitting ? '수정 중...' : '정보 수정하기'}
      </button>
    </form>
  );
}